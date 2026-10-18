import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthService } from '../../services/auth.service';
import { AUTH_REDIRECT_ERROR } from '../../config/auth-startup';

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
    private readonly redirectError = inject(AUTH_REDIRECT_ERROR, { optional: true });

    email = '';
    password = '';
    errorMessage = '';
    helpMessage = '';
    isRedirecting = false;
    showPassword = false;
    rememberMe = false;

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
        // de arrancar Angular. Con sesión activa se entra directo a home; si el
        // regreso falló, la sesión local ya quedó limpia y solo se informa.
        if (this.msalService.instance.getActiveAccount()) {
            this.authService.syncFromActiveAccount();
            // replaceUrl: "atrás" desde home no debe volver a mostrar el login.
            this.router.navigateByUrl('/home', { replaceUrl: true });
            return;
        }

        if (this.redirectError) {
            this.errorMessage = `No se pudo completar el inicio de sesión con Microsoft (${this.redirectError}). Intenta de nuevo.`;
        }
    }

    onSubmit(): void {
        if (!this.email || !this.password) {
            this.errorMessage = 'Ingresa tu email y tu contraseña.';
            return;
        }

        // Las credenciales las valida Microsoft Entra ID; el email ingresado
        // se envía solo como sugerencia para precargar la pantalla de Microsoft.
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
