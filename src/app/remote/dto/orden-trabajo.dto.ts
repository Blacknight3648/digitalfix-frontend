// Contratos de Órdenes de Trabajo con digitalfix-ms-workorders (vía BFF).
// Mismos campos que los Response / Request del backend.

import { EstadoCuadrilla, EstadoOrden } from '@models/orden-trabajo.model';

// ============================================================================
// Respuestas
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

// Cuadrilla de GET /api/cuadrillas (CuadrillaResponse), para elegir a quién asignar la orden.
export interface CuadrillaDisponible {
    idCuadrilla: number;
    nombre: string;
    estado: EstadoCuadrilla | string;
    cantidadMiembros: number;
}

// ============================================================================
// Peticiones (creación, asignación y actualización)
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
