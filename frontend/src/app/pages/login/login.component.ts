import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthService } from '../../services/auth.service';
import { LoginApiService } from '../../services/login-api.service';
import { environment } from '../../environment/environment';

// Scopes pedidos en el login: "user.read" es para leer el perfil de Microsoft
// Graph, y el scope de digitalfix-api es para que MSAL deje el consentimiento
// dado de una vez y el token para el backend se pueda obtener luego en
// silencio (sin volver a interrumpir al usuario) vía MsalInterceptor.
const LOGIN_SCOPES = ['user.read', ...environment.azure.protectedResourceScopes];

@Component({
    standalone: true,
    selector: 'app-login',
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
    // Inyección opcional: MSAL solo está registrado en el bootstrap del navegador,
    // así este componente también puede renderizarse sin errores durante el SSR.
    private readonly msalService = inject(MsalService, { optional: true });
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly loginApiService = inject(LoginApiService);

    email = '';
    password = '';
    errorMessage = '';
    isRedirecting = false;

    ngOnInit(): void {
        if (!this.msalService) {
            return;
        }

        // El redirectUri apunta a esta misma página, así que es aquí donde hay
        // que procesar la respuesta de Microsoft antes de poder navegar a home.
        this.msalService.handleRedirectObservable().subscribe({
            next: (result) => {
                if (result?.account) {
                    this.msalService?.instance.setActiveAccount(result.account);
                }

                if (this.msalService?.instance.getActiveAccount()) {
                    // Carga el usuario real (nombre, email, rol) antes de entrar a home,
                    // así la página deja de mostrar datos fijos y usa la sesión real.
                    this.authService.syncFromActiveAccount();
                    this.verifyBackendAndEnter();
                }
            },
            error: (err) => {
                // MSAL trae el detalle real en err.errorCode/err.errorMessage (p. ej.
                // "interaction_in_progress"); lo dejamos en consola para poder
                // diagnosticar en vez de mostrar solo el mensaje genérico.
                console.error('[MSAL] Error al procesar el redirect de login:', err);
                this.isRedirecting = false;
                this.errorMessage = err?.errorCode
                    ? `No se pudo validar la sesión con Microsoft (${err.errorCode}). Revisa la consola para más detalle.`
                    : 'No se pudo validar la sesión con Microsoft. Intenta de nuevo.';
            },
        });
    }

    onSubmit(): void {
        if (!this.email || !this.password) {
            this.errorMessage = 'Ingresa tu email y tu contraseña.';
            return;
        }

        this.errorMessage = '';
        this.isRedirecting = true;

        // Las credenciales las valida Microsoft Entra ID; el email ingresado
        // se envía solo como sugerencia para precargar la pantalla de Microsoft.
        this.msalService?.loginRedirect({
            scopes: LOGIN_SCOPES,
            loginHint: this.email,
        });
    }

    loginWithMicrosoft(): void {
        this.errorMessage = '';
        this.isRedirecting = true;
        this.msalService?.loginRedirect({ scopes: LOGIN_SCOPES });
    }

    // La "prueba de fuego": con la sesión de Azure AD ya activa, confirma que
    // el JWT también es aceptado por digitalfix-ms-login (issuer, audiencia y
    // scope validados en su SecurityConfig) antes de dejar entrar a la app.
    private verifyBackendAndEnter(): void {
        this.isRedirecting = true;
        this.loginApiService.checkStatus().subscribe({
            next: () => {
                this.isRedirecting = false;
                this.router.navigateByUrl('/home');
            },
            error: (err) => {
                console.error('[digitalfix-ms-login] Falló la verificación de sesión:', err);
                this.isRedirecting = false;
                this.errorMessage =
                    err.status === 401 || err.status === 403
                        ? 'La sesión con Microsoft es válida, pero el backend rechazó el token (401/403). Revisa el scope y la audiencia configurados.'
                        : 'No se pudo contactar a digitalfix-ms-login. Verifica que el backend esté corriendo en ' +
                          `${environment.apiBaseUrl}.`;
            },
        });
    }
}
