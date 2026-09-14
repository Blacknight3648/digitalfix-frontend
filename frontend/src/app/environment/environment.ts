// src/environments/environment.ts

// MSAL debe redirigir de vuelta al mismo origen (protocolo + host + puerto) desde el
// que se inició el login, sea `ng serve` (4200), el contenedor Docker (4000) u otro
// dominio en producción. Si se deja fijo a un puerto, el login funciona pero el
// redirect final da ERR_CONNECTION_REFUSED en cualquier otro entorno.
// En SSR (Node) no existe `window`, por eso el fallback a localhost:4200 para ese caso.
const currentOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';

export const environment = {
  production: false,
  azure: {
    clientId: '1a248ad8-d43b-42af-87f2-b177b352e235',
    tenantId: '2845a269-a60f-4fdf-969c-2811937a2e85',
    authority: 'https://login.microsoftonline.com/2845a269-a60f-4fdf-969c-2811937a2e85',
    redirectUri: currentOrigin,
    postLogoutRedirectUri: currentOrigin,
    protectedResourceScopes: ['api://digitalfix-api/Access.All'],
  },
  apiBaseUrl: 'http://localhost:8080',
};

//Nota: pasar esto a variables de entorno en .env para mayor seguridad