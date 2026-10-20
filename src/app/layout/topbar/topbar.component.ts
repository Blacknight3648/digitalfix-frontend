import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { APP_ROLES, AppRole, APP_ROLE_LABEL } from '../../model/user.model';

@Component({
    standalone: true,
    selector: 'app-topbar',
    imports: [CommonModule, FormsModule],
    templateUrl: './topbar.component.html',
    styleUrl: './topbar.component.css',
})
export class TopbarComponent {
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);

    readonly roles: AppRole[] = APP_ROLES;
    readonly roleLabel = APP_ROLE_LABEL;

    // Título de la página activa, tomado de "data.title" de la ruta hija.
    // Se lee de Router.routerState (no de un ActivatedRoute inyectado acá:
    // Topbar es un hijo estático del layout, no un componente enrutado, así
    // que su propio ActivatedRoute no queda enlazado al árbol de la ruta activa).
    readonly pageTitle = toSignal(
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => this.resolveTitle()),
        ),
        { initialValue: this.resolveTitle() },
    );

    get currentUser() {
        return this.authService.currentUser();
    }

    // Entra ID suele entregar el nombre completo en mayúsculas ("SOLGREY NATASHA
    // MARIA ..."): se muestra en formato título y el CSS lo corta con "…".
    get displayName(): string {
        const name = this.currentUser?.name?.trim() || 'Usuario';
        return name
            .toLocaleLowerCase('es-CL')
            .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-CL'));
    }

    get initials(): string {
        const words = this.displayName.split(/\s+/);
        const first = words[0]?.[0] ?? '';
        const last = words.length > 1 ? words[words.length - 1][0] : '';
        return (first + last).toUpperCase();
    }

    get currentRole(): AppRole {
        return this.authService.currentUser()?.role ?? 'CLIENTE';
    }

    // "Ver como…" solo aparece para un SUPERADMIN: puede revisar todas las vistas
    // de la app con cualquier rol. Vive aquí porque afecta a toda la app.
    get canSwitchRole(): boolean {
        return this.authService.currentUser()?.assignedRole === 'SUPERADMIN';
    }

    onRoleChange(role: AppRole): void {
        this.authService.setRoleOverride(role);
    }

    onLogout(): void {
        this.authService.logout();
    }

    private resolveTitle(): string {
        let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
        while (route?.firstChild) {
            route = route.firstChild;
        }
        return route?.data?.['title'] ?? 'DigitalFix';
    }
}
