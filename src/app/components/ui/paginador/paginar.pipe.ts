import { Pipe, PipeTransform } from '@angular/core';

/** Página dentro del rango 1..última, según el total de filas y el tamaño de página. */
export function paginaValida(pagina: number, total: number, tamano: number): number {
    const ultima = Math.max(1, Math.ceil(total / tamano));
    return Math.min(Math.max(1, pagina), ultima);
}

// Recorta una lista a la página pedida. Ver PaginadorComponent.
@Pipe({ name: 'paginar', standalone: true })
export class PaginarPipe implements PipeTransform {
    transform<T>(lista: readonly T[] | null | undefined, pagina: number, tamano: number): T[] {
        if (!lista?.length) {
            return [];
        }
        const actual = paginaValida(pagina, lista.length, tamano);
        return lista.slice((actual - 1) * tamano, actual * tamano);
    }
}
