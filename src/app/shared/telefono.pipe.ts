import { Pipe, PipeTransform } from '@angular/core';
import { formatearTelefono } from './formato-chile';

/** Muestra "+56912345678" como "+56 9 1234 5678". */
@Pipe({ name: 'telefonoCl', standalone: true })
export class TelefonoPipe implements PipeTransform {
    transform(valor: string | null | undefined): string {
        return formatearTelefono(valor);
    }
}
