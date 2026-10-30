// src/environments/environment.ts

// MSAL debe redirigir de vuelta al mismo origen (protocolo + host + puerto) desde el
// que se inició el login, sea `ng serve` (4200), el contenedor Docker (4000) u otro
// dominio en producción. Si se deja fijo a un puerto, el login funciona pero el
// redirect final da ERR_CONNECTION_REFUSED en cualquier otro entorno.
// En SSR (Node) no existe `window`, por eso el fallback a localhost:4200 para ese caso.
const currentOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';

// Por HTTPS el proxy (Caddy) enruta /api/* al BFF en el mismo origen. Por HTTP
// (`ng serve`, túnel SSH) se llama directo al BFF en el puerto 8090.
const currentBffUrl =
  typeof window === 'undefined'
    ? 'http://localhost:8090'
    : window.location.protocol === 'https:'
      ? window.location.origin
      : `${window.location.protocol}//${window.location.hostname}:8090`;

// Misma App Registration y tenant que validan los microservicios (AZURE_CLIENT_ID y
// AZURE_TENANT_ID del .env de ms-login / ms-user): el access token que pide el
// frontend lleva aud = api://<clientId> y scp = access_as_user, que es lo que exige
// el backend. Si estos valores no coinciden, el backend rechaza el token con 401.
const API_CLIENT_ID = '9494b59c-9c6e-4a0f-91ae-ae90212882e7';
const TENANT_ID = '3fb8463e-0e33-4b7d-adc1-2a47c707831e';

export const environment = {
  production: false,
  azure: {
    clientId: API_CLIENT_ID,
    tenantId: TENANT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: currentOrigin,
    postLogoutRedirectUri: currentOrigin,
    protectedResourceScopes: [`api://${API_CLIENT_ID}/access_as_user`],
  },
  // Única URL de backend que conoce el frontend: digitalfix-bff-gateway. El BFF
  // valida el token (firma, issuer, audience, vigencia, scope y rol) y enruta a
  // ms-login, ms-user o ms-workorders; ningún microservicio se llama directo.
  bffUrl: currentBffUrl,
};

//Nota: pasar esto a variables de entorno en .env para mayor seguridad