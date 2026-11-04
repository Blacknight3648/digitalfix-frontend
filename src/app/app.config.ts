import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { PreloadAllModules, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { PuertoOrdenesTrabajo } from '@domain/ports/servicio-ordenes-trabajo.port';
import { ServicioOrdenesTrabajo } from '@data/services/servicio-ordenes-trabajo.service';

// Formato chileno en todos los pipes: montos con punto de miles ($15.000) y fechas en español.
registerLocaleData(localeEsCl);

/**
 * Configuración común al navegador (main.ts) y al servidor SSR (app.config.server.ts).
 * Cada entorno le agrega solo lo suyo: MSAL en el navegador, el render en el servidor.
 * Así ambos renderizan igual (mismo formato de números, mismas rutas).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-CL' },
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Las pantallas se cargan en diferido (app.routes.ts); apenas termina la primera,
    // el resto se descarga en segundo plano para que navegar no espere la red.
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),

    // Los interceptores se registran por DI (HTTP_INTERCEPTORS): el de MSAL en main.ts.
    provideHttpClient(withInterceptorsFromDi()),

    // Inversión de dependencias: las pantallas piden el puerto (dominio) y aquí se
    // decide qué implementación lo cumple (HTTP hacia el BFF).
    { provide: PuertoOrdenesTrabajo, useExisting: ServicioOrdenesTrabajo },
  ],
};
