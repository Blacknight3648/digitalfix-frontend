// Repuestos y stock de digitalfix-ms-catalog (/api/catalog/repuestos).
// Mismos campos que RepuestoResponse / RepuestoRequest / MovimientoStockResponse del backend.

import { TipoMovimiento, UnidadMedida } from '@models/repuesto.model';

export interface Repuesto {
    idRepuesto: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    unidadMedida: UnidadMedida;
    precioUnitario: number;
    stockDisponible: number;
    stockMinimo: number;
    // El backend lo calcula: stockDisponible <= stockMinimo.
    bajoStockMinimo: boolean;
    activo: boolean;
    fechaCreacion: string;
    fechaActualizacion: string | null;
}

// El código lo genera el sistema (REP-0001...). El stock no se edita: solo cambia con
// movimientos. stockInicial solo se envía al crear; activo solo al editar.
export interface RepuestoPeticion {
    nombre: string;
    descripcion: string | null;
    unidadMedida: UnidadMedida;
    precioUnitario: number | null;
    stockMinimo: number | null;
    stockInicial?: number | null;
    activo?: boolean;
}

export interface EntradaStockPeticion {
    cantidad: number | null;
    referencia: string;
}

export interface MovimientoStock {
    idMovimiento: number;
    idRepuesto: number;
    codigoRepuesto: string;
    tipo: TipoMovimiento;
    cantidad: number;
    stockResultante: number;
    // Origen del movimiento: "OT-15", "Stock inicial", guía o factura del proveedor.
    referencia: string;
    usuario: string | null;
    fechaMovimiento: string;
}
