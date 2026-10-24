import { Injectable, signal } from '@angular/core';

// Menú lateral en pantallas angostas (≤ 880px): ahí el sidebar es un panel que se abre con el
// botón ☰ del topbar. El estado se comparte entre topbar (abre), layout (fondo oscuro, Escape,
// cambio de ruta) y sidebar (se desliza). En escritorio no tiene efecto: el menú siempre se ve.
@Injectable({ providedIn: 'root' })
export class EstadoMenuService {
    readonly abierto = signal(false);

    alternar(): void {
        this.abierto.update((abierto) => !abierto);
    }

    cerrar(): void {
        this.abierto.set(false);
    }
}
