// src/app/config/auth-startup.ts
import { InjectionToken } from '@angular/core';
import {
  AccountInfo,
  EventType,
  IPublicClientApplication,
  NavigationClient,
  NavigationOptions,
} from '@azure/msal-browser';

/**
 * Error del último regreso desde Microsoft (null si no hubo). Lo procesa
 * prepareAuth() antes de que arranque Angular y el login solo lo muestra.
 */
export const AUTH_REDIRECT_ERROR = new InjectionToken<string | null>('AUTH_REDIRECT_ERROR');

/**
 * Navega a Microsoft (login/logout) reemplazando la entrada del historial en
 * vez de agregar una nueva. Así el botón "atrás" nunca vuelve a la página de
 * Microsoft ni a una URL con #code=...&state=... de un login ya terminado.
 */
class ReplaceHistoryNavigationClient extends NavigationClient {
  override navigateExternal(url: string, options: NavigationOptions): Promise<boolean> {
    return super.navigateExternal(url, { ...options, noHistory: true });
  }
}

// MSAL guarda en sessionStorage (claves "msal.") el state y el estado de cada
// redirect en curso. Si un login queda a medias (botón atrás, otra pestaña,
// redirect viejo), ese state ya no coincide con la respuesta de Microsoft y
// el siguiente intento falla con state_mismatch o interaction_in_progress.
export function clearMsalTemporaryState(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  Object.keys(sessionStorage)
    .filter((key) => key.startsWith('msal.'))
    .forEach((key) => sessionStorage.removeItem(key));
}

function stripAuthResponseFromUrl(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

/**
 * Una URL con #...state=... que no corresponde al login iniciado en esta
 * pestaña: típicamente una URL vieja que el navegador autocompletó desde el
 * historial, o la respuesta de un intento anterior. Si se le entrega a MSAL
 * termina en state_mismatch; se descarta antes para partir desde un punto limpio.
 */
function isStaleAuthResponse(): boolean {
  const returnedState = new URLSearchParams(window.location.hash.slice(1)).get('state');
  if (!returnedState) {
    return false;
  }
  // request.params es el request que MSAL guardó al llamar a loginRedirect
  // (JSON en base64); su "state" es el que Microsoft debe devolver.
  const requestKey = Object.keys(sessionStorage).find((key) => key.endsWith('.request.params'));
  const requestJson = requestKey ? sessionStorage.getItem(requestKey) : null;
  try {
    return !requestJson || JSON.parse(atob(requestJson)).state !== returnedState;
  } catch {
    return true;
  }
}

/**
 * Procesa el regreso desde Microsoft una sola vez y antes de que arranque
 * Angular, para que el router, los guards y los componentes nunca vean la URL
 * con #code=... ni intenten procesarla de nuevo. Cualquier respuesta vieja o
 * fallida deja la sesión local limpia, lista para un nuevo login.
 * Devuelve el código de error a mostrar en el login, o null.
 */
export async function prepareAuth(msal: IPublicClientApplication): Promise<string | null> {
  await msal.initialize();
  msal.setNavigationClient(new ReplaceHistoryNavigationClient());

  // Mantiene la cuenta activa al día cuando MSAL renueva tokens o inicia sesión,
  // que es la que usa MsalInterceptor para pedir tokens en silencio.
  msal.addEventCallback((event) => {
    const account = (event.payload as { account?: AccountInfo } | null)?.account;
    if ((event.eventType === EventType.LOGIN_SUCCESS || event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) && account) {
      msal.setActiveAccount(account);
    }
  });

  if (isStaleAuthResponse()) {
    console.warn('[MSAL] Se descartó una respuesta de login que no corresponde a esta pestaña.');
    clearMsalTemporaryState();
    stripAuthResponseFromUrl();
  }

  let redirectError: string | null = null;
  try {
    const result = await msal.handleRedirectPromise();
    if (result?.account) {
      msal.setActiveAccount(result.account);
    }
  } catch (err) {
    console.error('[MSAL] Error al procesar el regreso desde Microsoft:', err);
    redirectError = (err as { errorCode?: string })?.errorCode ?? 'unknown_error';
    clearMsalTemporaryState();
    stripAuthResponseFromUrl();
  }

  if (!msal.getActiveAccount()) {
    const [cachedAccount] = msal.getAllAccounts();
    if (cachedAccount) {
      msal.setActiveAccount(cachedAccount);
    }
  }
  return redirectError;
}
