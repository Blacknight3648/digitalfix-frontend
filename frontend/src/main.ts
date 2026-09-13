// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalInterceptor,
  MsalGuard,
  MsalService,
  MsalBroadcastService,
} from '@azure/msal-angular';

import { routes } from './app/app.routes';
import {
  msalInstanceFactory,
  msalGuardConfigFactory,
  msalInterceptorConfigFactory,
} from './app/config/msal.config';
import { App } from './app/app';

/**
 * EL ARRANQUE DE LA APLICACIÓN (Bootstrap)
 * Las rutas viven en app.routes.ts (única fuente de verdad); aquí solo se
 * registran los proveedores globales de MSAL para el navegador.
 */
bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),

    // Registra la instancia global de MSAL que creamos en msal.config.ts
    { provide: MSAL_INSTANCE, useFactory: msalInstanceFactory },

    // Registra la regla de redirección cuando alguien intenta entrar sin sesión
    { provide: MSAL_GUARD_CONFIG, useFactory: msalGuardConfigFactory },

    // Registra el mapa de rutas para que el interceptor sepa a qué API adjuntar el token
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: msalInterceptorConfigFactory },

    // Activa el Interceptor HTTP para que pegue automáticamente el "Authorization: Bearer <token>"[cite: 4]
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },

    // Servicios listos para usarse en cualquier parte del frontend[cite: 4]
    MsalGuard,
    MsalService,
    MsalBroadcastService,
  ],
}).catch((err) => console.error('Error al iniciar la aplicación:', err));