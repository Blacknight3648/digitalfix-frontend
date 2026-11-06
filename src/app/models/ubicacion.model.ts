// Modelo del formulario de dirección y su conversión desde/hacia los contratos del backend.

import { Direccion, DireccionPeticion } from '@remote/dto/ubicacion.dto';

// Lo que edita el formulario. idRegion solo sirve para filtrar las comunas: el backend
// no la recibe porque la deduce de la comuna (3FN).
export interface DireccionFormulario {
    idRegion: number | null;
    idComuna: number | null;
    calle: string;
    numero: string;
    detalle: string;
    referencia: string;
    codigoPostal: string;
}

export function direccionVacia(): DireccionFormulario {
    return { idRegion: null, idComuna: null, calle: '', numero: '', detalle: '', referencia: '', codigoPostal: '' };
}

export function direccionAFormulario(d: Direccion | null | undefined): DireccionFormulario {
    if (!d) {
        return direccionVacia();
    }
    return {
        idRegion: d.idRegion,
        idComuna: d.idComuna,
        calle: d.calle,
        numero: d.numero,
        detalle: d.detalle ?? '',
        referencia: d.referencia ?? '',
        codigoPostal: d.codigoPostal ?? '',
    };
}

export function direccionAPeticion(f: DireccionFormulario): DireccionPeticion {
    return {
        idComuna: f.idComuna!,
        calle: f.calle.trim(),
        numero: f.numero.trim().toUpperCase(),
        detalle: f.detalle.trim() || null,
        referencia: f.referencia.trim() || null,
        codigoPostal: f.codigoPostal.replace(/\D/g, '') || null,
    };
}

/** Enlace de Google Maps (no requiere API key) para revisar la dirección antes de guardarla. */
export function enlaceGoogleMaps(texto: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${texto}, Chile`)}`;
}
