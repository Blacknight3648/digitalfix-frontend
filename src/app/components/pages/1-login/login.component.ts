import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthService, backendCaido } from '@contexts/auth/auth.service';
import { AUTH_REDIRECT_ERROR } from '@contexts/auth/auth-startup';
import { ocultarPantallaCarga } from '@config/pantalla-carga';

// Correo de soporte al que se envía la alerta cuando el sistema cae.
const CORREO_SOPORTE = 'sol.medina@gmail.com';

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
    readonly authService = inject(AuthService);
    private readonly redirectError = inject(AUTH_REDIRECT_ERROR, { optional: true });

    email = '';
    password = '';
    errorMessage = '';
    helpMessage = '';
    isRedirecting = false;
    showPassword = false;
    rememberMe = false;

    // Estado "Sistema caído": true cuando ms-login no responde tras todos los reintentos.
    readonly backendCaido = backendCaido;
    alertaEnviada = false;
    enviandoAlerta = false;

    togglePassword(): void {
        this.showPassword = !this.showPassword;
    }

    showForgotInfo(): void {
        this.helpMessage = 'Para restablecer tu contraseña institucional Duoc UC, ingresa al portal de recuperación de Microsoft o contacta al administrador del sistema.';
    }

    showTroubleInfo(): void {
        this.helpMessage = 'Si tienes problemas para acceder, te recomendamos utilizar el botón "Continuar con Microsoft" o verificar tu conexión a la red de Duoc UC.';
    }

    closeHelpMessage(): void {
        this.helpMessage = '';
    }

    ngOnInit(): void {
        if (!this.msalService) {
            return;
        }

        // La respuesta de Microsoft ya se procesó en main.ts (prepareAuth) antes
        // de arrancar Angular. Con sesión activa esperamos a que ms-login confirme
        // el rol antes de navegar, así SUPERADMIN no llega a home con rol CLIENTE.
        if (this.msalService.instance.getActiveAccount()) {
            this.authService.syncFromActiveAccount();
            this.isRedirecting = true;
            this.authService.loadSession()
                .then(() => {
                    if (backendCaido()) {
                        // Backend caído: quedarse en login y mostrar panel de alerta.
                        this.isRedirecting = false;
                        ocultarPantallaCarga();
                        return;
                    }
                    // replaceUrl: "atrás" desde home no debe volver a mostrar el login.
                    this.router
                        .navigateByUrl('/home', { replaceUrl: true })
                        .finally(() => ocultarPantallaCarga());
                })
                .catch(() => {
                    this.isRedirecting = false;
                    ocultarPantallaCarga();
                });
            return;
        }

        ocultarPantallaCarga();

        if (this.redirectError) {
            this.errorMessage = `No se pudo completar el inicio de sesión con Microsoft (${this.redirectError}). Intenta de nuevo.`;
        }
    }

    // Abre el cliente de correo con un mensaje prellenado para alertar al soporte.
    reportarSistemaCaido(): void {
        this.enviandoAlerta = true;
        const correo = this.email || this.authService.currentUser()?.email || 'anonimo';
        const asunto = encodeURIComponent('Sistema DigitalFix caído - Alerta automática');
        const cuerpo = encodeURIComponent(
            `El sistema DigitalFix no está disponible.\nUsuario: ${correo}\nFecha: ${new Date().toLocaleString('es-CL')}`,
        );
        window.open(`mailto:${CORREO_SOPORTE}?subject=${asunto}&body=${cuerpo}`, '_blank');
        this.alertaEnviada = true;
        this.enviandoAlerta = false;
    }

    // Vuelve a intentar conectarse al backend desde el panel de sistema caído.
    reintentarConexion(): void {
        this.alertaEnviada = false;
        this.isRedirecting = true;
        this.authService.reintentarConexion()
            .then(() => {
                if (!backendCaido()) {
                    this.router
                        .navigateByUrl('/home', { replaceUrl: true })
                        .finally(() => ocultarPantallaCarga());
                } else {
                    this.isRedirecting = false;
                }
            })
            .catch(() => {
                this.isRedirecting = false;
            });
    }

    onSubmit(): void {
        if (!this.email) {
            this.errorMessage = 'Ingresa tu correo electrónico institucional.';
            return;
        }

        // Las credenciales las valida Microsoft Entra ID; el email ingresado
        // se envía como sugerencia (loginHint) para precargar la pantalla de Microsoft.
        this.startLogin(this.email);
    }

    loginWithMicrosoft(): void {
        this.startLogin();
    }

    private startLogin(loginHint?: string): void {
        this.errorMessage = '';
        this.isRedirecting = true;

        this.authService.login(loginHint).catch((err) => {
            console.error('[MSAL] Error al iniciar el login:', err);
            this.isRedirecting = false;
            this.errorMessage = 'No se pudo iniciar sesión con Microsoft. Intenta de nuevo.';
        });
    }
}
