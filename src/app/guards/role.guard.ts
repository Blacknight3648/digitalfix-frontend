import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AppRole, hasRoleAccess } from '../model/user.model';

// Autorización por rol (sección 4 del enunciado). authGuard ya validó la sesión
// a nivel del layout; este guard solo decide si el rol actual puede ver la ruta.
export const roleGuard: CanActivateFn = (route) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const allowedRoles = route.data['roles'] as AppRole[] | undefined;

    if (!allowedRoles?.length) {
        return true;
    }

    // SUPERADMIN entra a todas las pantallas, igual que en la jerarquía del backend.
    if (hasRoleAccess(authService.currentUser()?.role, allowedRoles)) {
        return true;
    }

    // Dashboard es la única pantalla abierta a los 4 roles del caso: es el
    // único destino de fallback que nunca vuelve a rebotar a este guard.
    return router.parseUrl('/dashboard');
};
