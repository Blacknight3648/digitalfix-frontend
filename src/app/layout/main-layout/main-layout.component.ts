import { Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { EstadoMenuService } from '../estado-menu.service';

// Shell compartido por todas las pantallas autenticadas del caso
// (Dashboard, Órdenes de trabajo, Catálogo, Reportería, Auditoría).
// Tres formatos según el ancho (ver CSS): menú completo (≥ 1200px), riel de
// íconos (881–1199px) y panel deslizable con fondo oscuro (≤ 880px).
@Component({
    standalone: true,
    selector: 'app-main-layout',
    imports: [RouterOutlet, SidebarComponent, TopbarComponent],
    templateUrl: './main-layout.component.html',
    styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
    readonly menu = inject(EstadoMenuService);

    constructor() {
        // Al elegir una pantalla en el panel móvil, el panel se cierra solo.
        inject(Router).events
            .pipe(filter((evento) => evento instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
            .subscribe(() => this.menu.cerrar());
    }

    @HostListener('document:keydown.escape')
    cerrarConEscape(): void {
        this.menu.cerrar();
    }
}
