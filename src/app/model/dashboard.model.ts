import { CLASE_CSS_ESTADO_ORDEN, ETIQUETA_ESTADO_ORDEN, EstadoOrden } from './orden-trabajo.model';

// Respuesta de GET /api/report/kpis?range=last24h (digitalfix-ms-report vía BFF).
export interface KpiResponse {
    totalOrdersLast24h: number;
    ordersPerHour: number;
    avgResolutionTimeMinutes: number;
    activeStatusCount: { [key: string]: number };
}

export type EstadoActivoOperativo = Extract<
    EstadoOrden,
    'CREADA' | 'ASIGNADA' | 'EN_DESPLAZAMIENTO' | 'EN_EJECUCION'
>;

export interface EstadoActivoConfig {
    estado: EstadoActivoOperativo;
    etiqueta: string;
    claseCss: string;
    descripcion: string;
}

export interface EstadoActivoItem extends EstadoActivoConfig {
    cantidad: number;
    porcentaje: number;
}

export const ESTADOS_ACTIVOS_PANEL: EstadoActivoConfig[] = [
    {
        estado: 'CREADA',
        etiqueta: ETIQUETA_ESTADO_ORDEN.CREADA,
        claseCss: CLASE_CSS_ESTADO_ORDEN.CREADA,
        descripcion: 'Pendientes de asignación a cuadrilla',
    },
    {
        estado: 'ASIGNADA',
        etiqueta: ETIQUETA_ESTADO_ORDEN.ASIGNADA,
        claseCss: CLASE_CSS_ESTADO_ORDEN.ASIGNADA,
        descripcion: 'Asignadas, por iniciar traslado',
    },
    {
        estado: 'EN_DESPLAZAMIENTO',
        etiqueta: ETIQUETA_ESTADO_ORDEN.EN_DESPLAZAMIENTO,
        claseCss: CLASE_CSS_ESTADO_ORDEN.EN_DESPLAZAMIENTO,
        descripcion: 'Cuadrillas en ruta hacia el cliente',
    },
    {
        estado: 'EN_EJECUCION',
        etiqueta: ETIQUETA_ESTADO_ORDEN.EN_EJECUCION,
        claseCss: CLASE_CSS_ESTADO_ORDEN.EN_EJECUCION,
        descripcion: 'Cuadrillas trabajando en terreno',
    },
];

// Normaliza claves de estado eliminando tildes (ej. "EN_EJECUCIÓN" -> "EN_EJECUCION")
// para compatibilidad entre el payload de ms-report y los estados tipados del frontend.
export function normalizarConteoEstados(
    conteo: { [key: string]: number } | null | undefined,
): Record<string, number> {
    const resultado: Record<string, number> = {};
    if (!conteo) {
        return resultado;
    }

    for (const [clave, valor] of Object.entries(conteo)) {
        const claveNormalizada = clave
            .trim()
            .toUpperCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        const cantidad = typeof valor === 'number' && Number.isFinite(valor) ? Math.max(0, valor) : 0;
        resultado[claveNormalizada] = (resultado[claveNormalizada] ?? 0) + cantidad;
    }

    return resultado;
}
