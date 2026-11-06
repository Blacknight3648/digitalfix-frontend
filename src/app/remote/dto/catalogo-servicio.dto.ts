// Catálogo de servicios técnicos de digitalfix-ms-workorders (/api/servicios).
// Mismos campos que ServicioResponse / ServicioRequest del backend.

export interface ServicioCatalogo {
    idServicio: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    tarifa: number;
    activo: boolean;
    fechaCreacion: string;
    fechaActualizacion: string | null;
}

// El código lo genera el sistema (SRV-0001...); "activo" solo se envía al editar.
export interface ServicioCatalogoPeticion {
    nombre: string;
    descripcion: string | null;
    tarifa: number | null;
    activo?: boolean;
}
