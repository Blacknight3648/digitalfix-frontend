import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { hasRoleAccess } from '../../model/user.model';
import { NAV_ITEMS } from '../nav-items';

// La identidad del usuario y el cierre de sesión viven en el topbar; el sidebar
// queda solo con la marca y la navegación.
@Component({
    standalone: true,
    selector: 'app-sidebar',
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
    private readonly authService = inject(AuthService);

    // El menú se arma por rol (sección 6 del enunciado): cada pantalla declara
    // qué roles pueden verla y aquí solo se filtra, sin duplicar esa lista.
    get navItems() {
        const role = this.authService.currentUser()?.role;
        return NAV_ITEMS.filter((item) => !role || hasRoleAccess(role, item.roles));
    }
}
