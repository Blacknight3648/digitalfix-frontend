import { environment } from '@config/environment';

// Punto único de salida hacia el backend: digitalfix-bff-gateway. Todos los servicios de
// remote/service arman sus rutas a partir de API_URL.
//
// No hace falta un interceptor propio para el token: MsalInterceptor (contexts/auth/msal.config)
// adjunta el Bearer a toda llamada de HttpClient cuyo destino es API_URL, porque está registrada
// como recurso protegido.
export const API_URL = environment.bffUrl;
