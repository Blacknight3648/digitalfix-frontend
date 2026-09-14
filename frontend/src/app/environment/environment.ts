const currentOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';

export const environment = {
  production: false,
  azure: {
    clientId: '1a248ad8-d43b-42af-87f2-b177b352e235', // ID del Frontend
    tenantId: '2845a269-a60f-4fdf-969c-2811937a2e85',
    authority: 'https://login.microsoftonline.com/2845a269-a60f-4fdf-969c-2811937a2e85',
    redirectUri: currentOrigin,
    postLogoutRedirectUri: currentOrigin,
    // CAMBIO AQUÍ: Usar el App ID URI del Backend
    protectedResourceScopes: ['api://3ff96d3a-fa6c-4349-ad81-4e9536b4148a/access_as_user'],
  },
  apiBaseUrl: 'http://localhost:8080',
};