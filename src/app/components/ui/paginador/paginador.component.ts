import { Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { paginaValida } from './paginar.pipe';

export const TAMANOS_PAGINA = [10, 25, 50];

// Pie de tabla con "Mostrando X–Y de N", filas por página y botones de página.
// Se usa junto al pipe "paginar", que recorta la lista con la misma página y tamaño:
//
//   @for (fila of filtradas | paginar: pagina : tamano; track ...)
//   <app-paginador [total]="filtradas.length" [(pagina)]="pagina" [(tamano)]="tamano" />
//
// Si los filtros dejan menos páginas que la actual, ambos usan la última válida,
// así la tabla nunca queda vacía por estar en una página que ya no existe.
@Component({
    standalone: true,
    selector: 'app-paginador',
    imports: [FormsModule],
    template: `
        @if (total() > 0) {
            <nav class="paginador" aria-label="Paginación">
                <div class="paginador-info">
                    <span>Mostrando <strong>{{ desde() }}–{{ hasta() }}</strong> de <strong>{{ total() }}</strong></span>
                    <label class="paginador-tamano">
                        <select [ngModel]="tamano()" (ngModelChange)="cambiarTamano($event)" aria-label="Filas por página">
                            @for (t of tamanos; track t) {
                                <option [ngValue]="t">{{ t }}</option>
                            }
                        </select>
                        por página
                    </label>
                </div>

                @if (totalPaginas() > 1) {
                    <div class="paginas">
                        <button type="button" class="pagina" [disabled]="actual() === 1" (click)="ir(actual() - 1)" aria-label="Página anterior">
                            <span class="material-icons">chevron_left</span>
                        </button>
                        @for (p of botones(); track $index) {
                            @if (p === 0) {
                                <span class="pagina-hueco" aria-hidden="true">…</span>
                            } @else {
                                <button type="button" class="pagina" [class.actual]="p === actual()"
                                    [attr.aria-current]="p === actual() ? 'page' : null" (click)="ir(p)">{{ p }}</button>
                            }
                        }
                        <button type="button" class="pagina" [disabled]="actual() === totalPaginas()" (click)="ir(actual() + 1)" aria-label="Página siguiente">
                            <span class="material-icons">chevron_right</span>
                        </button>
                    </div>
                }
            </nav>
        }
    `,
})
export class PaginadorComponent {
    readonly total = input.required<number>();
    readonly pagina = model(1);
    readonly tamano = model(TAMANOS_PAGINA[0]);
    readonly tamanos = TAMANOS_PAGINA;

    readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamano())));
    readonly actual = computed(() => paginaValida(this.pagina(), this.total(), this.tamano()));
    readonly desde = computed(() => (this.actual() - 1) * this.tamano() + 1);
    readonly hasta = computed(() => Math.min(this.actual() * this.tamano(), this.total()));

    // Números de página con huecos (0 = "…"): 1 … 4 5 6 … 12
    readonly botones = computed<number[]>(() => {
        const total = this.totalPaginas();
        const actual = this.actual();
        if (total <= 7) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }
        const inicio = Math.max(2, Math.min(actual - 1, total - 4));
        const fin = Math.min(total - 1, Math.max(actual + 1, 5));
        const medio = Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
        return [1, ...(inicio > 2 ? [0] : []), ...medio, ...(fin < total - 1 ? [0] : []), total];
    });

    ir(pagina: number): void {
        this.pagina.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
    }

    cambiarTamano(tamano: number): void {
        this.tamano.set(Number(tamano));
        this.pagina.set(1);
    }
}
