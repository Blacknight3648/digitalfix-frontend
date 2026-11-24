import { Injectable, signal } from '@angular/core';

export type TipoNotificacion = 'exito' | 'error' | 'info';

export interface Notificacion {
    id: number;
    tipo: TipoNotificacion;
    texto: string;
}

// Avisos flotantes (toasts) de toda la app: confirman una acción sin mover la pantalla
// y se ven aunque el usuario haya desplazado la tabla. Los errores duran más que los éxitos.
// Los pinta <app-notificaciones>, que vive una sola vez en el layout.
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
    private siguienteId = 1;
    readonly lista = signal<Notificacion[]>([]);

    exito(texto: string): void {
        this.mostrar('exito', texto, 4500);
    }

    error(texto: string): void {
        this.mostrar('error', texto, 8000);
    }

    info(texto: string): void {
        this.mostrar('info', texto, 5000);
    }

    cerrar(id: number): void {
        this.lista.update((lista) => lista.filter((n) => n.id !== id));
    }

    private mostrar(tipo: TipoNotificacion, texto: string, duracionMs: number): void {
        if (!texto) {
            return;
        }
        const id = this.siguienteId++;
        // Máximo 3 a la vez: la más antigua sale primero.
        this.lista.update((lista) => [...lista.slice(-2), { id, tipo, texto }]);
        setTimeout(() => this.cerrar(id), duracionMs);
    }
}
