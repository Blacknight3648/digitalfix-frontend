import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmacion {
    titulo: string;
    mensaje: string;
    /** Texto del botón que confirma (por defecto "Confirmar"). */
    confirmar?: string;
    /** Texto del botón que cancela (por defecto "Cancelar"). */
    cancelar?: string;
    /** Acción destructiva: botón rojo e ícono de advertencia. */
    peligro?: boolean;
}

interface Pregunta extends OpcionesConfirmacion {
    responder: (aceptada: boolean) => void;
}

// Reemplaza a window.confirm(): mismo uso, pero con el estilo de la app, accesible
// con teclado (Escape cancela) y adaptado a teléfono (hoja inferior).
//
//   if (!(await this.confirmacion.preguntar({ titulo: '¿Eliminar?', mensaje: '...', peligro: true }))) return;
@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
    readonly actual = signal<Pregunta | null>(null);

    preguntar(opciones: OpcionesConfirmacion): Promise<boolean> {
        // Si quedó otra abierta, se cancela antes de mostrar la nueva.
        this.actual()?.responder(false);
        return new Promise<boolean>((resolve) => {
            this.actual.set({
                ...opciones,
                responder: (aceptada) => {
                    this.actual.set(null);
                    resolve(aceptada);
                },
            });
        });
    }
}
