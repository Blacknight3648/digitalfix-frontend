import { CLASE_CSS_ESTADO_ORDEN, ETIQUETA_ESTADO_ORDEN, EstadoOrden } from '@models/orden-trabajo.model';
import { RangoReporte } from '@remote/dto/reporteria.dto';

export interface OpcionRango {
    valor: RangoReporte;
    etiqueta: string;
    descripcion: string;
}

export const RANGOS_REPORTE: OpcionRango[] = [
    { valor: 'last1h', etiqueta: '1 h', descripcion: 'Última hora' },
    { valor: 'last24h', etiqueta: '24 h', descripcion: 'Últimas 24 horas' },
    { valor: 'last7d', etiqueta: '7 días', descripcion: 'Últimos 7 días' },
];

export const ESTADOS_ORDEN_REPORTE: EstadoOrden[] = [
    'CREADA',
    'ASIGNADA',
    'EN_DESPLAZAMIENTO',
    'EN_EJECUCION',
    'CERRADA',
    'CANCELADA',
];

// Normaliza el estado que llega de ms-report ("EN_EJECUCIÓN", "en-ejecucion"...) al tipo del frontend.
export function normalizarEstado(valor: string | null | undefined): EstadoOrden | null {
    if (!valor) {
        return null;
    }
    const limpio = valor
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[-\s]/g, '_');
    return (ESTADOS_ORDEN_REPORTE as string[]).includes(limpio) ? (limpio as EstadoOrden) : null;
}

export function etiquetaEstado(valor: string | null | undefined): string {
    const estado = normalizarEstado(valor);
    return estado ? ETIQUETA_ESTADO_ORDEN[estado] : (valor ?? '—');
}

export function claseEstado(valor: string | null | undefined): string {
    const estado = normalizarEstado(valor);
    return estado ? CLASE_CSS_ESTADO_ORDEN[estado] : 'creada';
}

// ---------- Auditoría de accesos (ms-login) ----------

export type TipoEventoAcceso = 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ACCOUNT_BLOCKED' | 'LOGOUT';

export interface ConfigEventoAcceso {
    etiqueta: string;
    icono: string;
    // Clase de badge global (styles/_components.scss)
    badge: string;
}

export const EVENTOS_ACCESO: Record<TipoEventoAcceso, ConfigEventoAcceso> = {
    LOGIN_SUCCESS: { etiqueta: 'Inicio de sesión', icono: 'login', badge: 'badge-activo' },
    LOGIN_FAILURE: { etiqueta: 'Intento fallido', icono: 'gpp_maybe', badge: 'badge-pendiente' },
    ACCOUNT_BLOCKED: { etiqueta: 'Cuenta bloqueada', icono: 'block', badge: 'badge-alerta' },
    LOGOUT: { etiqueta: 'Cierre de sesión', icono: 'logout', badge: 'badge-inactivo' },
};

export function configEventoAcceso(tipo: string): ConfigEventoAcceso {
    return EVENTOS_ACCESO[tipo as TipoEventoAcceso] ?? { etiqueta: tipo, icono: 'help_outline', badge: 'badge-inactivo' };
}

// ms-login guarda LocalDateTime sin zona (UTC en el contenedor): se interpreta como UTC.
export function fechaAccesoUtc(valor: string): Date {
    const tieneZona = /[zZ]|[+-]\d{2}:?\d{2}$/.test(valor);
    return new Date(tieneZona ? valor : `${valor}Z`);
}

// "95 min" → "1 h 35 min"; "2000 min" → "1 d 9 h"
export function formatearMinutos(minutos: number | null | undefined): string {
    if (minutos == null || !Number.isFinite(minutos) || minutos <= 0) {
        return '—';
    }
    if (minutos < 60) {
        return `${minutos < 10 ? minutos.toFixed(1) : Math.round(minutos)} min`;
    }
    const totalMin = Math.round(minutos);
    const dias = Math.floor(totalMin / 1440);
    const horas = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    if (dias > 0) {
        return horas > 0 ? `${dias} d ${horas} h` : `${dias} d`;
    }
    return mins > 0 ? `${horas} h ${mins} min` : `${horas} h`;
}

// Duración entre dos instantes, para el timeline de una orden.
export function formatearDuracion(desdeIso: string, hastaIso: string): string {
    const ms = new Date(hastaIso).getTime() - new Date(desdeIso).getTime();
    if (!Number.isFinite(ms) || ms < 0) {
        return '';
    }
    if (ms < 60_000) {
        return `${Math.max(1, Math.round(ms / 1000))} s`;
    }
    return formatearMinutos(ms / 60_000);
}
