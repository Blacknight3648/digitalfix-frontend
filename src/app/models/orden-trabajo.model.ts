// Reglas de dominio de las Órdenes de Trabajo: estados, flujo y textos de presentación.
// Los contratos con el backend están en @remote/dto/orden-trabajo.dto.

// ============================================================================
// Estados del ciclo de vida técnico de la orden de trabajo
// ============================================================================
export type EstadoOrden =
    | 'CREADA'
    | 'ASIGNADA'
    | 'EN_DESPLAZAMIENTO'
    | 'EN_EJECUCION'
    | 'CERRADA'
    | 'CANCELADA';

export type EstadoCuadrilla =
    | 'DISPONIBLE'
    | 'ASIGNADA'
    | 'EN_TRANSITO'
    | 'EN_LABOR'
    | 'FUERA_SERVICIO';

// ============================================================================
// Constantes de flujo y presentación
// ============================================================================
export const FLUJO_ESTADOS_ORDEN: EstadoOrden[] = [
    'CREADA',
    'ASIGNADA',
    'EN_DESPLAZAMIENTO',
    'EN_EJECUCION',
    'CERRADA',
];

export const ETIQUETA_ESTADO_ORDEN: Record<EstadoOrden, string> = {
    CREADA: 'Creada',
    ASIGNADA: 'Asignada',
    EN_DESPLAZAMIENTO: 'En desplazamiento',
    EN_EJECUCION: 'En ejecución',
    CERRADA: 'Cerrada',
    CANCELADA: 'Cancelada',
};

export const CLASE_CSS_ESTADO_ORDEN: Record<EstadoOrden, string> = {
    CREADA: 'creada',
    ASIGNADA: 'asignada',
    EN_DESPLAZAMIENTO: 'desplazamiento',
    EN_EJECUCION: 'ejecucion',
    CERRADA: 'cerrada',
    CANCELADA: 'cancelada',
};

export const ETIQUETA_ACCION_SIGUIENTE_ORDEN: Partial<Record<EstadoOrden, string>> = {
    CREADA: 'Asignar técnico / cuadrilla',
    ASIGNADA: 'Iniciar desplazamiento',
    EN_DESPLAZAMIENTO: 'Iniciar ejecución',
    EN_EJECUCION: 'Cerrar orden',
};

// Filtro de la pantalla de órdenes (no viaja tal cual al backend).
export interface FiltroOrdenesTrabajo {
    estado?: EstadoOrden | '';
    idCliente?: number;
    terminoBusqueda?: string;
    fechaDesde?: string;
    fechaHasta?: string;
}
