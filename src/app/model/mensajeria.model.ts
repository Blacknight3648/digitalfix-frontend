// Contratos de ms-admin-queues (vía BFF, solo SUPERADMIN).

export interface ListenerRabbit {
    listenerId: string;
    running: boolean;
    paused: boolean;
    autoStartup: boolean;
    // Viene como texto "[q.cmd.email, q.cmd.email.dlq]".
    queueNames: string;
}

// GET /api/v1/queues/{name}: propiedades que entrega RabbitAdmin.
export interface PropiedadesCola {
    QUEUE_NAME: string;
    QUEUE_MESSAGE_COUNT: number;
    QUEUE_CONSUMER_COUNT: number;
}

export interface ColaRabbit {
    nombre: string;
    mensajes: number | null;
    consumidores: number | null;
    esDlq: boolean;
}

// Nombre legible de cada consumidor de ms-notify (ListenerIds).
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
