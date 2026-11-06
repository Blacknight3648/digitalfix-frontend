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
