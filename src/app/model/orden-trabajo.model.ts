/**
 * Modelos de Dominio y DTOs para Órdenes de Trabajo (digitalfix-ms-workorders)
 * Siguiendo principios SOLID (SRP - Responsabilidad Única) y nombrado estándar en español.
 */

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
// Constantes de Flujo y Presentación
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

// ============================================================================
// Entidades y Resúmenes (DTOs de respuesta de digitalfix-ms-workorders)
// ============================================================================
export interface ClienteResumen {
    idCliente: number;
    rut: string;
    nombreCompleto: string;
}

export interface CuadrillaResumen {
    idCuadrilla: number;
    nombre: string;
    idTecnicoLider: number;
    estado: EstadoCuadrilla | string;
    miembros: number[];
}

export interface ServicioOrdenTrabajo {
    idDetalle: number;
    idServicio: number;
    idTecnico: number | null;
    descripcionManoObra: string;
    precioManoObra: number;
}

export interface RepuestoOrdenTrabajo {
    idDetalle: number;
    idRepuesto: number;
    idProveedor: number;
    cantidadUtilizada: number;
}

export interface EventoHistorial {
    descripcion: string;
    actor: string;
    fecha: string; // ISO 8601
}

export interface OrdenTrabajo {
    idOrdenTrabajo: number;
    cliente: ClienteResumen;
    cuadrilla?: CuadrillaResumen | null;
    estado: EstadoOrden;
    observaciones?: string;
    fechaIngreso: string; // ISO 8601
    fechaActualizacionEstado?: string;
    fechaCierre?: string;
    servicios: ServicioOrdenTrabajo[];
    repuestos: RepuestoOrdenTrabajo[];
    totalManoObra: number;
    historial?: EventoHistorial[];
}

// ============================================================================
// DTOs de Petición (Creación, Asignación y Actualización)
// ============================================================================
export interface CrearDetalleServicioPeticion {
    idServicio: number;
    idTecnico?: number | null;
    descripcionManoObra?: string;
    // Opcional: sin precio, el backend cobra la tarifa vigente del servicio en el catálogo.
    precioManoObra?: number;
}

export interface CrearOrdenTrabajoPeticion {
    idCliente: number;
    observaciones?: string;
    servicios?: CrearDetalleServicioPeticion[];
}

export interface ActualizarObservacionesPeticion {
    observaciones: string;
}

export interface CambioEstadoPeticion {
    estado: EstadoOrden;
}

export interface AsignarCuadrillaPeticion {
    idCuadrilla: number;
}

export interface AsignarTecnicoPeticion {
    idTecnico: number;
}

// POST /api/ordenes-trabajo/{id}/repuestos. El repuesto viene del catálogo (ms-catalog) y el
// proveedor debe ser de PRODUCTOS. Si la orden ya está asignada, el stock se descuenta al tiro.
export interface AgregarRepuestoPeticion {
    idRepuesto: number;
    idProveedor: number;
    cantidad: number;
}

// Cuadrilla de GET /api/cuadrillas (CuadrillaResponse), para elegir a quién asignar la orden.
export interface CuadrillaDisponible {
    idCuadrilla: number;
    nombre: string;
    estado: EstadoCuadrilla | string;
    cantidadMiembros: number;
}

export interface FiltroOrdenesTrabajo {
    estado?: EstadoOrden | '';
    idCliente?: number;
    terminoBusqueda?: string;
    fechaDesde?: string;
    fechaHasta?: string;
}
