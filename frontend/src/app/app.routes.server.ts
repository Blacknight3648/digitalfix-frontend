import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // 'home' depende del guardián de MSAL (solo disponible en el navegador),
  // así que se renderiza en el cliente en vez de pre-renderizarse en el servidor
  {
    path: 'home',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
