import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { APP_ROLE_LABEL } from '../../model/user.model';
import { NAV_ITEMS } from '../nav-items';

@Component({
    standalone: true,
    selector: 'app-sidebar',
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
    private readonly authService = inject(AuthService);

    readonly roleLabel = APP_ROLE_LABEL;

    get currentUser() {
        return this.authService.currentUser();
    }

    // El menú se arma por rol (sección 6 del enunciado): cada pantalla declara
    // qué roles pueden verla y aquí solo se filtra, sin duplicar esa lista.
    get navItems() {
        const role = this.currentUser?.role;
        return NAV_ITEMS.filter((item) => !role || item.roles.includes(role));
    }

    onLogout(): void {
        this.authService.logout();
    }
}
