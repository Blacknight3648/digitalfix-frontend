// Unidades de medida y tipos de movimiento de stock, con sus textos de presentación.

export type UnidadMedida = 'UNIDAD' | 'METRO' | 'ROLLO' | 'CAJA' | 'KIT';

export const UNIDADES_MEDIDA: UnidadMedida[] = ['UNIDAD', 'METRO', 'ROLLO', 'CAJA', 'KIT'];

export const ETIQUETA_UNIDAD_MEDIDA: Record<UnidadMedida, string> = {
    UNIDAD: 'Unidad',
    METRO: 'Metro',
    ROLLO: 'Rollo',
    CAJA: 'Caja',
    KIT: 'Kit',
};

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'DEVOLUCION';

export const ETIQUETA_TIPO_MOVIMIENTO: Record<TipoMovimiento, string> = {
    ENTRADA: 'Entrada',
    SALIDA: 'Salida',
    DEVOLUCION: 'Devolución',
};
