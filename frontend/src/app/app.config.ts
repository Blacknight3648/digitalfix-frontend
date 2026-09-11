import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
// Importa aquí tus interceptores globales si ya los creaste (ej. para tokens JWT)
// import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Optimización de detección de cambios de Angular
    provideZoneChangeDetection({ eventCoalescing: true }),

    // 2. Configuración de Rutas con vinculación de parámetros a Inputs (muy útil y limpio)
    provideRouter(routes, withComponentInputBinding()),

    // 3. Configuración del Cliente HTTP con soporte para Interceptores globales
    provideHttpClient(
      withInterceptors([
        // authInterceptor // Descomenta cuando crees tu interceptor de seguridad
      ])
    )
  ]
};