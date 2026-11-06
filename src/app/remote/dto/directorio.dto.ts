// Clientes y proveedores de digitalfix-ms-workorders (/api/clientes y
// /api/proveedores). Mismos campos que ClienteResponse / ProveedorResponse
// y sus Request del backend.

import { TipoProveedor } from '@models/directorio.model';
import { Direccion, DireccionPeticion } from './ubicacion.dto';

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
