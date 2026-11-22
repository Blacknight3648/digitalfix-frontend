import { Component, ElementRef, HostListener, effect, inject, viewChild } from '@angular/core';
import { ConfirmacionService } from './confirmacion.service';

// Diálogo que pinta la pregunta activa de ConfirmacionService. Vive una sola vez en el layout.
@Component({
    standalone: true,
    selector: 'app-confirmacion',
    template: `
        @if (servicio.actual(); as p) {
            <div class="overlay confirmacion" (click)="p.responder(false)">
                <div class="modal modal-sm" role="alertdialog" aria-modal="true"
                    aria-labelledby="confirmacion-titulo" aria-describedby="confirmacion-mensaje"
                    (click)="$event.stopPropagation()">
                    <div class="confirmacion-cuerpo">
                        <span class="confirmacion-icono" [class.peligro]="p.peligro" aria-hidden="true">
                            <span class="material-icons">{{ p.peligro ? 'warning_amber' : 'help_outline' }}</span>
                        </span>
                        <div>
                            <h3 id="confirmacion-titulo">{{ p.titulo }}</h3>
                            <p id="confirmacion-mensaje">{{ p.mensaje }}</p>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" (click)="p.responder(false)">{{ p.cancelar ?? 'Cancelar' }}</button>
                        <button #botonConfirmar type="button" [class]="p.peligro ? 'btn-danger' : 'btn-primary'"
                            (click)="p.responder(true)">{{ p.confirmar ?? 'Confirmar' }}</button>
                    </div>
                </div>
            </div>
        }
    `,
})
export class ConfirmacionComponent {
    readonly servicio = inject(ConfirmacionService);
    private readonly botonConfirmar = viewChild<ElementRef<HTMLButtonElement>>('botonConfirmar');

    constructor() {
        // El foco va al botón principal: Enter confirma, Escape cancela.
        effect(() => this.botonConfirmar()?.nativeElement.focus());
    }

    @HostListener('document:keydown.escape')
    cancelarConEscape(): void {
        this.servicio.actual()?.responder(false);
    }
}
