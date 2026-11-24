import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@contexts/auth/auth.service';
import { hasRoleAccess } from '@models/user.model';
import { NAV_ITEMS, NavItem, SeccionMenu } from '../nav-items';
import { EstadoMenuService } from '../estado-menu.service';

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
    readonly menu = inject(EstadoMenuService);

    // El menú se arma por rol (sección 6 del enunciado): cada pantalla declara
    // qué roles pueden verla y aquí solo se filtra, sin duplicar esa lista.
    // Agrupado por sección (Operación / Administración), sin secciones vacías.
    get grupos(): { seccion: SeccionMenu; items: NavItem[] }[] {
        const role = this.authService.currentUser()?.role;
        const visibles = NAV_ITEMS.filter((item) => !role || hasRoleAccess(role, item.roles));
        const secciones = [...new Set(visibles.map((item) => item.seccion))];
        return secciones.map((seccion) => ({ seccion, items: visibles.filter((item) => item.seccion === seccion) }));
    }
}
