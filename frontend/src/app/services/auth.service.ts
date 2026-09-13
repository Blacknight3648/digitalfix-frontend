import { Injectable, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AppRole, AppUser } from '../model/user.model';

// Azure AD todavía no tiene los App Roles del caso configurados en el tenant,
// así que no hay claim "roles" real que leer. Mientras tanto, quien inicia
// sesión se trata como Admin (equipo de desarrollo/demo) por defecto.
const DEFAULT_ROLE: AppRole = 'ADMIN';
const VALID_ROLES: AppRole[] = ['ADMIN', 'SUPERVISOR', 'CLIENTE', 'AUDITOR'];

@Injectable({ providedIn: 'root' })
export class AuthService {
    // Opcional por la misma razón que en LoginComponent: MSAL solo existe en el navegador.
    private readonly msalService = inject(MsalService, { optional: true });

    readonly currentUser = signal<AppUser | null>(null);

    // Vuelca la cuenta activa de MSAL al estado de la app. Se llama después de un
    // login exitoso y también al entrar a una página protegida por si la sesión
    // ya estaba activa en el cache (por ejemplo, al recargar /home).
    syncFromActiveAccount(): void {
        const account = this.msalService?.instance.getActiveAccount();
        if (!account) {
            this.currentUser.set(null);
            return;
        }

        this.currentUser.set({
            name: account.name ?? account.username,
            email: account.username,
            role: this.resolveRole(account.idTokenClaims),
        });
    }

    // El rol real debe venir de los App Roles de Azure AD (claim "roles" del JWT).
    // Mientras esa configuración no esté lista en el tenant, se usa CLIENTE por
    // defecto y la UI ofrece un selector para simular los otros roles del caso.
    setRoleOverride(role: AppRole): void {
        const user = this.currentUser();
        if (user) {
            this.currentUser.set({ ...user, role });
        }
    }

    logout(): void {
        this.currentUser.set(null);
        this.msalService?.logoutRedirect();
    }

    private resolveRole(claims: unknown): AppRole {
        const roles = (claims as { roles?: string[] } | undefined)?.roles;
        const claimed = roles?.[0]?.toUpperCase();
        return VALID_ROLES.includes(claimed as AppRole) ? (claimed as AppRole) : DEFAULT_ROLE;
    }
}
