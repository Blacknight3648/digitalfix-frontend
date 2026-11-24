import {
  IPublicClientApplication,
  PublicClientApplication,
  InteractionType,
  LogLevel,
  BrowserCacheLocation,
} from '@azure/msal-browser';
import { MsalInterceptorConfiguration } from '@azure/msal-angular';
import { environment } from '@config/environment';

/**
 * 1. Fábrica de la instancia de MSAL
 * Conecta tu aplicación Angular con tu Tenant y Client ID en Microsoft Entra ID.
 */
export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.azure.clientId,
      authority: environment.azure.authority,
      redirectUri: environment.azure.redirectUri,
      postLogoutRedirectUri: environment.azure.postLogoutRedirectUri,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage, // Mantiene la sesión activa al recargar
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) { return; }
          switch (level) {
            case LogLevel.Error: console.error(message); return;
            case LogLevel.Warning: console.warn(message); return;
            default: return;
          }
        },
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false,
      },
    },
  });
}

/**
 * 2. Configuración del Interceptor HTTP
 * Añade automáticamente el token (Bearer <token>) a las peticiones hacia tu backend.
 * Pide el token con acquireTokenSilent: si el access token está por vencer,
 * MSAL lo renueva con el refresh token sin interrumpir al usuario; solo si la
 * sesión de Microsoft expiró (InteractionRequired) redirige a iniciar sesión.
 */
export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string> | null>();

<<<<<<< HEAD
<<<<<<< HEAD
  // Todas las llamadas van al BFF, que valida el access token (scope
  // access_as_user) y lo reenvía a los microservicios.
  // Una sola entrada: "/*" ya cubre "/api/*"; dos patrones que coinciden con la
  // misma URL hacen que MSAL avise "More than 1 matching scopes for endpoint found".
  protectedResourceMap.set(`${environment.bffUrl}/*`, environment.azure.protectedResourceScopes);
=======
=======
>>>>>>> origin/develop
  // Con strictMatching activo, `${environment.bffUrl}/api/*` cubre todas las rutas
  // bajo /api/ (como /api/v1/login/me) hacia el BFF sin interceptar recursos estáticos.
  protectedResourceMap.set(
    `${environment.bffUrl}/api/*`,
    environment.azure.protectedResourceScopes,
  );
<<<<<<< HEAD
>>>>>>> origin/develop
=======
>>>>>>> origin/develop

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
    strictMatching: true,
  };
}