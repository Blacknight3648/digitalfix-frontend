import { ErrorApi } from '@remote/dto/error-api.dto';

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
