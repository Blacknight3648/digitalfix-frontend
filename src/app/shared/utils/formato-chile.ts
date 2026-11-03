// Formato y validación de datos chilenos en el frontend (shift-left): el usuario ve el
// error y el formato correcto mientras escribe, y al backend llega el dato ya normalizado.
// El backend vuelve a validar todo; esto no reemplaza esa validación, la adelanta.

// ---------------------------------------------------------------------------
// RUT / RUN
// ---------------------------------------------------------------------------

/** Deja solo dígitos y K ("12.345.678-k" → "12345678K"), con un máximo de 9 caracteres. */
export function limpiarRut(valor: string | null | undefined): string {
    return (valor ?? '').toUpperCase().replace(/[^0-9K]/g, '').replace(/K(?=.)/g, '').slice(0, 9);
}

/** Dígito verificador por módulo 11. */
export function calcularDvRut(cuerpo: string): string {
    let suma = 0;
    let factor = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += Number(cuerpo[i]) * factor;
        factor = factor === 7 ? 2 : factor + 1;
    }
    const resto = 11 - (suma % 11);
    return resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
}

/** Formato con puntos y guion mientras se escribe: "123456785" → "12.345.678-5". */
export function formatearRut(valor: string | null | undefined): string {
    const limpio = limpiarRut(valor);
    if (limpio.length < 2) {
        return limpio;
    }
    const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${cuerpo}-${limpio.slice(-1)}`;
}

/** RUT completo (7 u 8 dígitos + DV) con dígito verificador correcto. */
export function rutValido(valor: string | null | undefined): boolean {
    const limpio = limpiarRut(valor);
    if (!/^\d{7,8}[0-9K]$/.test(limpio)) {
        return false;
    }
    return calcularDvRut(limpio.slice(0, -1)) === limpio.slice(-1);
}

// ---------------------------------------------------------------------------
// Teléfono (+56 y 9 dígitos: móvil 9XXXXXXXX o fijo con código de área)
// ---------------------------------------------------------------------------

/** Los 9 dígitos nacionales, sin el 56 inicial: "+56 9 1234 5678" → "912345678". */
export function digitosTelefono(valor: string | null | undefined): string {
    let texto = (valor ?? '').trim();
    // El prefijo que muestra el propio campo se quita como texto: así, al borrar hasta
    // dejar solo "+56", sus dígitos no se confunden con el número.
    if (texto.startsWith('+56')) {
        texto = texto.slice(3);
    }
    let digitos = texto.replace(/\D/g, '');
    if (digitos.length === 11 && digitos.startsWith('56')) {
        digitos = digitos.slice(2);
    }
    return digitos.slice(0, 9);
}

/** Formato de lectura mientras se escribe: "+56 9 1234 5678". */
export function formatearTelefono(valor: string | null | undefined): string {
    const d = digitosTelefono(valor);
    if (!d) {
        return '';
    }
    const partes = [d.slice(0, 1), d.slice(1, 5), d.slice(5, 9)].filter(Boolean);
    return `+56 ${partes.join(' ')}`;
}

/** Formato que guarda el backend: "+56912345678". Vacío si no hay dígitos. */
export function normalizarTelefono(valor: string | null | undefined): string {
    const d = digitosTelefono(valor);
    return d ? `+56${d}` : '';
}

export function telefonoValido(valor: string | null | undefined): boolean {
    return /^\+56\d{9}$/.test(normalizarTelefono(valor));
}

// ---------------------------------------------------------------------------
// Correo
// ---------------------------------------------------------------------------

// Más estricto que el validador "email" de Angular: exige dominio con extensión (.cl, .com).
const PATRON_CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function normalizarCorreo(valor: string | null | undefined): string {
    return (valor ?? '').trim().toLowerCase();
}

export function correoValido(valor: string | null | undefined): boolean {
    return PATRON_CORREO.test(normalizarCorreo(valor));
}

// ---------------------------------------------------------------------------
// Pesos chilenos (sin decimales, punto de miles)
// ---------------------------------------------------------------------------

/** "15000" → "15.000". */
export function formatearMiles(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || Number.isNaN(valor)) {
        return '';
    }
    return Math.trunc(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "$ 15.000" → 15000; null si no hay dígitos. */
export function leerMiles(valor: string | null | undefined): number | null {
    const digitos = (valor ?? '').replace(/\D/g, '').slice(0, 12);
    return digitos ? Number(digitos) : null;
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/** Primera letra en mayúscula, el resto como se escribió: "revisión de tablero" → "Revisión de tablero". */
export function capitalizarPrimera(valor: string | null | undefined): string {
    const texto = (valor ?? '').replace(/\s+/g, ' ').trimStart();
    return texto ? texto.charAt(0).toLocaleUpperCase('es-CL') + texto.slice(1) : '';
}

/**
 * Nombres propios: "juan pérez" o "JUAN PÉREZ" → "Juan Pérez". Si el texto ya mezcla mayúsculas
 * y minúsculas (ej. "Comercial Rojas SpA") se respeta como está.
 */
export function capitalizarNombre(valor: string | null | undefined): string {
    const texto = (valor ?? '').replace(/\s+/g, ' ').trim();
    const mezclado = texto !== texto.toLocaleLowerCase('es-CL') && texto !== texto.toLocaleUpperCase('es-CL');
    if (!texto || mezclado) {
        return texto;
    }
    return texto
        .toLocaleLowerCase('es-CL')
        .replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, letra: string) => sep + letra.toLocaleUpperCase('es-CL'));
}
