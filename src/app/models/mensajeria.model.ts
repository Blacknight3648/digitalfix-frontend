// Vista de la mensajería en el panel: colas y nombres legibles de los consumidores.

import { ListenerRabbit } from '@remote/dto/mensajeria.dto';

export interface ColaRabbit {
    nombre: string;
    mensajes: number | null;
    consumidores: number | null;
    esDlq: boolean;
}

// Nombre legible de cada consumidor de ms-admin-queues (ListenerIds).
export const ETIQUETA_LISTENER: Record<string, string> = {
    'listener-email': 'Correos al cliente',
    'listener-dispatch': 'Tickets de despacho',
    'listener-report': 'Informes PDF',
    'listener-dlq': 'Cuarentena (DLQ)',
};

export function colasDe(listener: ListenerRabbit): string[] {
    return listener.queueNames
        .replace(/[[\]]/g, '')
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
}
