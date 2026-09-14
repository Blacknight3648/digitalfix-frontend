// src/app/config/msal.config.ts
import {
  IPublicClientApplication,
  PublicClientApplication,
  InteractionType,
  LogLevel,
  BrowserCacheLocation,
} from '@azure/msal-browser';
import {
  MsalGuardConfiguration,
  MsalInterceptorConfiguration,
} from '@azure/msal-angular';
import { environment } from '../environment/environment';

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
 * 2. Configuración del Guard
 * Ataja a los usuarios que no han iniciado sesión y los redirige a Microsoft.
 */
export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      // Incluye el scope del backend para que, si el guard dispara un login
      // interactivo (ej. entrar directo a /home sin sesión), el consentimiento
      // quede dado también para digitalfix-api y no falle luego al pedir el
      // token para el MsalInterceptor.
      scopes: ['user.read', ...environment.azure.protectedResourceScopes],
    },
    loginFailedRoute: '/login-failed',
  };
}

/**
 * 3. Configuración del Interceptor HTTP
 * Añade automáticamente el token (Bearer <token>) a las peticiones hacia tu backend.
 */
export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string> | null>();
  
  protectedResourceMap.set(
    `${environment.apiBaseUrl}/*`,
    environment.azure.protectedResourceScopes
  );

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}
