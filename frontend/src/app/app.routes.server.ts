import { RenderMode, ServerRoute } from '@angular/ssr';

// Todas las rutas del layout principal (dashboard, home, catalog, reports,
// audit) dependen de MsalGuard, que solo existe en el bootstrap del navegador.
// Por eso se renderizan en el cliente en vez de pre-renderizarse en el servidor.
export const serverRoutes: ServerRoute[] = [
  {
    path: 'dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'home',
    renderMode: RenderMode.Client
  },
  {
    path: 'catalog',
    renderMode: RenderMode.Client
  },
  {
    path: 'reports',
    renderMode: RenderMode.Client
  },
  {
    path: 'audit',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
