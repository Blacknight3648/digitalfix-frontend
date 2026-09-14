const currentOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';

export const environment = {
  production: false,
  azure: {
    // Nuevo App Registration del frontend, creado en el MISMO tenant que la
    // API del backend (antes estaban en tenants distintos y por eso fallaba
    // con AADSTS500011: MSAL no puede pedir un token para un recurso que
    // vive en otro tenant).
    clientId: '68388825-e16a-4a0b-9b8c-d70fc9cbcc3c', // ID del Frontend (tenant compartido)
    tenantId: '3fb8463e-0e33-4b7d-adc1-2a47c707831e',
    authority: 'https://login.microsoftonline.com/3fb8463e-0e33-4b7d-adc1-2a47c707831e',
    redirectUri: currentOrigin,
    postLogoutRedirectUri: currentOrigin,
    // App ID URI de la API del backend (client 9494b59c..., mismo tenant) +
    // el scope que exige LoginController: hasAuthority('SCP_access_as_user').
    protectedResourceScopes: ['api://9494b59c-9c6e-4a0f-91ae-ae90212882e7/access_as_user'],
  },
  apiBaseUrl: 'http://localhost:8080',
  // digitalfix-ms-workorders (puerto 8081 en docker-compose, ver el repo de
  // ese microservicio). Sin JWT por ahora: ese servicio todavia no valida
  // Azure AD, asi que no hace falta agregarlo a protectedResourceMap.
  workOrdersApiUrl: 'http://localhost:8081',
};