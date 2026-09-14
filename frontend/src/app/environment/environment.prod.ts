const currentOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';

export const environment = {
  production: true,
  azure: {
    // Mismo App Registration que en environment.ts (mismo tenant que la API).
    clientId: '68388825-e16a-4a0b-9b8c-d70fc9cbcc3c',
    tenantId: '3fb8463e-0e33-4b7d-adc1-2a47c707831e',
    authority: 'https://login.microsoftonline.com/3fb8463e-0e33-4b7d-adc1-2a47c707831e',
    // window.location.origin ya resuelve solo a la IP publica / dominio de la
    // EC2 del frontend, siempre que ese origen este agregado como Redirect
    // URI en la App Registration de Azure AD (ver DEPLOY.md, paso Azure AD).
    redirectUri: currentOrigin,
    postLogoutRedirectUri: currentOrigin,
    protectedResourceScopes: ['api://9494b59c-9c6e-4a0f-91ae-ae90212882e7/access_as_user'],
  },
  // TODO: reemplazar por la IP publica (o DNS) real de la EC2
  // "ec2-frontend-login" una vez que este levantada. digitalfix-ms-login
  // escucha en el puerto 8080 (ver su Dockerfile).
  apiBaseUrl: 'http://<EC2_FRONTEND_LOGIN_PUBLIC_IP>:8080',
  // TODO: reemplazar por la IP publica (o DNS) real de la EC2
  // "ec2-workorders". digitalfix-ms-workorders escucha en el puerto 8081.
  // Sigue sin validar JWT (ver nota de seguridad en DEPLOY.md): el Security
  // Group de esa instancia debe restringir el puerto 8081 al SG/IP de
  // "ec2-frontend-login", no dejarlo abierto a 0.0.0.0/0.
  workOrdersApiUrl: 'http://<EC2_WORKORDERS_PUBLIC_IP>:8081',
};
