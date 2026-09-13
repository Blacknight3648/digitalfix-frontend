import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

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

    email = '';
    password = '';
    errorMessage = '';

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
                    this.router.navigateByUrl('/home');
                }
            },
            error: () => {
                this.errorMessage = 'No se pudo validar la sesión con Microsoft. Intenta de nuevo.';
            },
        });
    }

    onSubmit(): void {
        if (!this.email || !this.password) {
            this.errorMessage = 'Ingresa tu email y tu contraseña.';
            return;
        }

        this.errorMessage = '';

        // Las credenciales las valida Microsoft Entra ID; el email ingresado
        // se envía solo como sugerencia para precargar la pantalla de Microsoft.
        this.msalService?.loginRedirect({
            scopes: ['user.read'],
            loginHint: this.email,
        });
    }

    loginWithMicrosoft(): void {
        this.errorMessage = '';
        this.msalService?.loginRedirect({ scopes: ['user.read'] });
    }
}
