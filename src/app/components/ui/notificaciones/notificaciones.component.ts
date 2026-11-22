import { Component, inject } from '@angular/core';
import { NotificacionesService, TipoNotificacion } from './notificaciones.service';

const ICONO: Record<TipoNotificacion, string> = {
    exito: 'check_circle',
    error: 'error',
    info: 'info',
};

// Contenedor de toasts. Estilos en styles/_components.scss (sección 11).
@Component({
    standalone: true,
    selector: 'app-notificaciones',
    template: `
        <div class="toasts" aria-live="polite" aria-atomic="false">
            @for (n of servicio.lista(); track n.id) {
                <div class="toast" [class]="n.tipo" [attr.role]="n.tipo === 'error' ? 'alert' : 'status'">
                    <span class="material-icons toast-icono" aria-hidden="true">{{ icono[n.tipo] }}</span>
                    <span class="toast-texto">{{ n.texto }}</span>
                    <button type="button" class="toast-cerrar" (click)="servicio.cerrar(n.id)" aria-label="Cerrar aviso">
                        <span class="material-icons">close</span>
                    </button>
                </div>
            }
        </div>
    `,
})
export class NotificacionesComponent {
    readonly servicio = inject(NotificacionesService);
    readonly icono = ICONO;
}
