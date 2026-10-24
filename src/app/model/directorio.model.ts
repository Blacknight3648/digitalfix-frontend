// Clientes y proveedores de digitalfix-ms-workorders (/api/clientes y
// /api/proveedores). Mismos campos que ClienteResponse / ProveedorResponse
// y sus Request del backend.

import { Direccion, DireccionPeticion } from './ubicacion.model';

export interface Cliente {
    idCliente: number;
    rut: string;
    // Nombre completo o razón social, en un solo campo.
    nombreCompleto: string;
    telefono: string;
    telefonoSecundario: string | null;
    email: string;
    // Nula solo en clientes registrados antes de la dirección normalizada.
    direccion: Direccion | null;
    fechaCreacion: string;
    fechaActualizacion: string | null;
}

// El RUT solo se envía al crear: ActualizarClienteRequest no lo admite.
export interface ClientePeticion {
    rut?: string;
    nombre: string;
    telefono: string;
    telefonoSecundario: string | null;
    email: string;
    direccion: DireccionPeticion;
}

export type TipoProveedor = 'SERVICIOS' | 'PRODUCTOS';

export const ETIQUETA_TIPO_PROVEEDOR: Record<TipoProveedor, string> = {
    SERVICIOS: 'Servicios',
    PRODUCTOS: 'Productos',
};

export const DESCRIPCION_TIPO_PROVEEDOR: Record<TipoProveedor, string> = {
    SERVICIOS: 'Mano de obra o servicios tercerizados',
    PRODUCTOS: 'Repuestos e insumos para las órdenes',
};

export interface Proveedor {
    idProveedor: number;
    rut: string;
    razonSocial: string;
    tipo: TipoProveedor;
    giro: string | null;
    telefono: string;
    email: string;
    direccion: Direccion | null;
    fechaCreacion: string;
    fechaActualizacion: string | null;
}

export interface ProveedorPeticion {
    rut?: string;
    razonSocial: string;
    tipo: TipoProveedor;
    giro: string | null;
    telefono: string;
    email: string;
    direccion: DireccionPeticion;
}

// Cuerpo de error del backend: ms-workorders y el BFF envían "errors" (lista);
// ms-user envía "details" (campo -> mensaje) en los errores de validación.
export interface ErrorApi {
    status: number;
    message: string;
    errors: string[];
    details: Record<string, string>;
}

// Arma un mensaje legible a partir del error HTTP: el detalle de validación
// del backend (p. ej. "El RUT no es válido") si viene, o un texto genérico.
export function mensajeDeError(err: any, accion: string): string {
    const cuerpo = err?.error as Partial<ErrorApi> | undefined;
    const detalles = cuerpo?.errors?.length ? cuerpo.errors : Object.values(cuerpo?.details ?? {});
    if (detalles.length) {
        return `${cuerpo?.message ?? 'Error'}: ${detalles.join(' · ')}`;
    }
    if (cuerpo?.message) {
        return cuerpo.message;
    }
    if (err?.status === 0) {
        return `No se pudo ${accion}: el servidor no responde. Revisa tu conexión o intenta en unos segundos.`;
    }
    if (err?.status === 403) {
        return `No tienes permisos para ${accion}.`;
    }
    return `No se pudo ${accion} (error ${err?.status ?? 'desconocido'}).`;
}
