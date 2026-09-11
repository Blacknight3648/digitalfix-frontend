import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRouting, ServerRoute } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRouting(withRoutes(serverRoutes))
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
function withRoutes(serverRoutes: ServerRoute[]): import("@angular/ssr").ServerRoute[] {
  throw new Error('Function not implemented.');
}

