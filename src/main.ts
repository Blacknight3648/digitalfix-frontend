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
} from '@contexts/auth/msal.config';
import { AUTH_REDIRECT_ERROR, prepareAuth } from '@contexts/auth/auth-startup';
import { AuthService } from '@contexts/auth/auth.service';
import { SessionExpiredInterceptor } from '@contexts/auth/session-expired.interceptor';
import { App } from './app/app';

const msalInstance = msalInstanceFactory();

prepareAuth(msalInstance)
  .then(({ redirectError, didLogin }) =>
    bootstrapApplication(
      App,
      mergeApplicationConfig(appConfig, {
        providers: [
          { provide: MSAL_INSTANCE, useValue: msalInstance },
          { provide: AUTH_REDIRECT_ERROR, useValue: redirectError },
          { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: msalInterceptorConfigFactory },
          { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
          { provide: HTTP_INTERCEPTORS, useClass: SessionExpiredInterceptor, multi: true },
          MsalService,
          MsalBroadcastService,
        ],
      }),
    ).then((appRef) => {
      if (didLogin) {
        appRef.injector.get(AuthService).markFreshTokenNeeded();
      }
      return appRef;
    }),
  )
  .catch((err) => console.error('Error al iniciar la aplicación:', err));