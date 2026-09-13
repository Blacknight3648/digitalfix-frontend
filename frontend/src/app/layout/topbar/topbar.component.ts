import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AppRole, APP_ROLE_LABEL } from '../../model/user.model';

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

    readonly roles: AppRole[] = ['ADMIN', 'SUPERVISOR', 'CLIENTE', 'AUDITOR'];
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

    get currentRole(): AppRole {
        return this.authService.currentUser()?.role ?? 'ADMIN';
    }

    // Selector temporal "Ver como..." mientras Azure AD no entrega el rol real
    // vía claim del JWT. Vive aquí (no en cada página) porque afecta a toda la app.
    onRoleChange(role: AppRole): void {
        this.authService.setRoleOverride(role);
    }

    private resolveTitle(): string {
        let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
        while (route?.firstChild) {
            route = route.firstChild;
        }
        return route?.data?.['title'] ?? 'DigitalFix';
    }
}
