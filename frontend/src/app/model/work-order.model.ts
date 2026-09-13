// Estados de una orden de trabajo (sección 3 del enunciado).
// El flujo es lineal salvo CANCELADA, que puede ocurrir desde CREADA.
export type WorkOrderStatus =
    | 'CREADA'
    | 'ASIGNADA'
    | 'EN_DESPLAZAMIENTO'
    | 'EN_EJECUCION'
    | 'CERRADA'
    | 'CANCELADA';

// Orden en la que avanza una orden de trabajo al ejecutar la "acción siguiente".
// No incluye CANCELADA porque esa transición no es un avance, es una excepción.
export const WORK_ORDER_STATUS_FLOW: WorkOrderStatus[] = [
    'CREADA',
    'ASIGNADA',
    'EN_DESPLAZAMIENTO',
    'EN_EJECUCION',
    'CERRADA',
];

export const WORK_ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
    CREADA: 'Creada',
    ASIGNADA: 'Asignada',
    EN_DESPLAZAMIENTO: 'En desplazamiento',
    EN_EJECUCION: 'En ejecución',
    CERRADA: 'Cerrada',
    CANCELADA: 'Cancelada',
};

// Clase CSS (badge) asociada a cada estado, definida en home.component.css.
export const WORK_ORDER_STATUS_CSS_CLASS: Record<WorkOrderStatus, string> = {
    CREADA: 'creada',
    ASIGNADA: 'asignada',
    EN_DESPLAZAMIENTO: 'desplazamiento',
    EN_EJECUCION: 'ejecucion',
    CERRADA: 'cerrada',
    CANCELADA: 'cancelada',
};

// Etiqueta del botón que dispara la transición al siguiente estado.
// Regla del caso: no se puede pasar a EN_EJECUCION sin haber asignado técnico antes.
export const WORK_ORDER_NEXT_ACTION_LABEL: Partial<Record<WorkOrderStatus, string>> = {
    CREADA: 'Asignar técnico',
    ASIGNADA: 'Iniciar desplazamiento',
    EN_DESPLAZAMIENTO: 'Iniciar ejecución',
    EN_EJECUCION: 'Cerrar orden',
};

export interface WorkOrderTimelineEvent {
    descripcion: string;
    actor: string;
    fecha: string; // ISO 8601
}

export interface WorkOrder {
    id: string;
    cliente: string;
    servicio: string;
    tecnico: string | null;
    estado: WorkOrderStatus;
    fechaCreacion: string; // ISO 8601
    timeline: WorkOrderTimelineEvent[];
}
