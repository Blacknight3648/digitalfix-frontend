// Tipos de proveedor y sus textos de presentación.

export type TipoProveedor = 'SERVICIOS' | 'PRODUCTOS';

export const ETIQUETA_TIPO_PROVEEDOR: Record<TipoProveedor, string> = {
    SERVICIOS: 'Servicios',
    PRODUCTOS: 'Productos',
};

export const DESCRIPCION_TIPO_PROVEEDOR: Record<TipoProveedor, string> = {
    SERVICIOS: 'Mano de obra o servicios tercerizados',
    PRODUCTOS: 'Repuestos e insumos para las órdenes',
};
