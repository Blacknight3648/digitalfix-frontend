import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthService } from '../services/auth.service';

// Reemplaza a MsalGuard: la respuesta de Microsoft ya se procesó en main.ts
// (prepareAuth), así que aquí solo se decide con la cuenta activa. Sin sesión
// se vuelve al login de la app en vez de saltar directo a Microsoft, y con
// sesión se cargan los roles desde ms-login antes de que roleGuard los lea.
export const authGuard: CanActivateFn = async () => {
    const msalService = inject(MsalService, { optional: true });
    const authService = inject(AuthService);
    const router = inject(Router);

    if (msalService?.instance.getActiveAccount()) {
        await authService.loadSession();
        return true;
    }
    return router.parseUrl('/');
};
