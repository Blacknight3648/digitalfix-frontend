import { RenderMode, ServerRoute } from '@angular/ssr';

// Solo el login ('' y 'login') se pre-renderiza: es la única pantalla pública.
// Todas las demás dependen de authGuard/roleGuard, que usan MSAL y solo existen
// en el navegador. Si se pre-renderizaran, en el build no hay sesión y Angular
// genera un HTML fijo que redirige a '/' (pasaba con /usuarios, /servicios,
// /proveedores y /mensajeria: el SUPERADMIN nunca podía entrar a sus pantallas).
// Por eso el comodín es Client: cualquier ruta nueva queda bien por defecto.
export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'login',
    renderMode: RenderMode.Prerender
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
