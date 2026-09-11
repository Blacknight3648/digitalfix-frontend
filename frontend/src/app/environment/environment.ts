// src/environments/environment.ts
export const environment = {
  production: false,
  azure: {
    clientId: '1a248ad8-d43b-42af-87f2-b177b352e235',
    tenantId: '2845a269-a60f-4fdf-969c-2811937a2e85',
    authority: 'https://login.microsoftonline.com/2845a269-a60f-4fdf-969c-2811937a2e85',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    protectedResourceScopes: ['api://digitalfix-api/Access.All'], 
  },
  apiBaseUrl: 'http://localhost:8080',
};

//Nota: pasar esto a variables de entorno en .env para mayor seguridad