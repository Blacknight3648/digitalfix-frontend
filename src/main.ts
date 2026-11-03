// src/main.ts
import { mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalInterceptor,
  MsalService,
  MsalBroadcastService,
} from '@azure/msal-angular';

import { appConfig } from './app/app.config';
import {
  msalInstanceFactory,
  msalInterceptorConfigFactory,
} from '@core/auth/msal.config';
import { AUTH_REDIRECT_ERROR, prepareAuth } from '@core/auth/auth-startup';
import { App } from './app/app';

/**
 * EL ARRANQUE DE LA APLICACIÓN (Bootstrap)
 * La configuración común (rutas, locale es-CL, HTTP, inyección de puertos) vive
 * en app.config.ts y la comparte el servidor SSR; aquí solo se agregan los
 * proveedores de MSAL, que existen únicamente en el navegador.
 *
 * La respuesta de Microsoft (#code=...&state=...) se procesa ANTES de arrancar
 * Angular (prepareAuth), así Angular siempre parte con la sesión ya resuelta:
 * con una cuenta activa o limpia, nunca con un login a medias.
 */
const msalInstance = msalInstanceFactory();

prepareAuth(msalInstance)
  .then((redirectError) =>
    bootstrapApplication(App, mergeApplicationConfig(appConfig, {
      providers: [
        // La misma instancia de MSAL que ya procesó el regreso desde Microsoft
        { provide: MSAL_INSTANCE, useValue: msalInstance },
        { provide: AUTH_REDIRECT_ERROR, useValue: redirectError },

        // Registra el mapa de rutas para que el interceptor sepa a qué API adjuntar el token
        { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: msalInterceptorConfigFactory },

        // Activa el Interceptor HTTP para que pegue automáticamente el "Authorization: Bearer <token>"
        // y renueve el token en silencio (refresh token) antes de que expire.
        { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },

        MsalService,
        MsalBroadcastService,
      ],
    })),
  )
  .catch((err) => console.error('Error al iniciar la aplicación:', err));
