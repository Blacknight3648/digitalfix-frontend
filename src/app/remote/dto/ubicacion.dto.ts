// Regiones, comunas y direcciones de digitalfix-ms-workorders (/api/regiones).

export interface Region {
    idRegion: number;
    nombre: string;
    numeroRomano: string;
}

export interface Comuna {
    idComuna: number;
    nombre: string;
}

// Lo que devuelve el backend: comuna y región ya resueltas, y el texto completo
// que se usa para abrir la ubicación en Google Maps.
export interface Direccion {
    idDireccion: number;
    idComuna: number;
    comuna: string;
    idRegion: number;
    region: string;
    calle: string;
    numero: string;
    detalle: string | null;
    referencia: string | null;
    codigoPostal: string | null;
    textoCompleto: string;
}

export interface DireccionPeticion {
    idComuna: number;
    calle: string;
    numero: string;
    detalle: string | null;
    referencia: string | null;
    codigoPostal: string | null;
}
