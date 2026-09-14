import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { AuthService } from '../../services/auth.service';

// Shell compartido por todas las pantallas autenticadas del caso
// (Dashboard, Órdenes de trabajo, Catálogo, Reportería, Auditoría).
@Component({
    standalone: true,
    selector: 'app-main-layout',
    imports: [RouterOutlet, SidebarComponent, TopbarComponent],
    templateUrl: './main-layout.component.html',
    styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
    private readonly authService = inject(AuthService);

    constructor() {
        // Se sincroniza aquí (y no solo en Login/Home) porque este layout es
        // el único punto por el que pasan TODAS las rutas protegidas por
        // MsalGuard. Así el nombre y el rol se ven en el sidebar/topbar sin
        // importar a qué pantalla se entra directo o se recarga la página
        // (ej. /reports, /catalog), no solo desde /home.
        this.authService.syncFromActiveAccount();
    }
}
