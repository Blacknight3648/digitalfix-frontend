import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';

// Este servicio llama a digitalfix-ms-login a través del HttpClient nativo de
// Angular. El Bearer token se adjunta solo: MsalInterceptor (registrado en
// main.ts) intercepta cualquier petición a environment.apiBaseUrl porque esa
// ruta está declarada en protectedResourceMap (ver msal.config.ts).
@Injectable({ providedIn: 'root' })
export class LoginApiService {
    private readonly http = inject(HttpClient);

    // GET /api/v1/login/status: confirma que el JWT de Azure AD fue aceptado
    // por el backend (issuer, audiencia y scope validados en SecurityConfig).
    checkStatus(): Observable<string> {
        return this.http.get(`${environment.apiBaseUrl}/api/v1/login/status`, {
            responseType: 'text',
        });
    }
}
