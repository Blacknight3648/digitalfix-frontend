// Descarga una tabla como CSV (separador ';' y BOM UTF-8 para que Excel en español
// lo abra con columnas y tildes correctas).
export function exportarCsv(nombreArchivo: string, encabezados: string[], filas: (string | number | null | undefined)[][]): void {
    if (typeof document === 'undefined') {
        return;
    }
    const celda = (valor: string | number | null | undefined): string => {
        const texto = valor == null ? '' : String(valor);
        // Evita inyección de fórmulas al abrir en Excel/Sheets.
        const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
        return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
    };
    const contenido = [encabezados, ...filas].map((fila) => fila.map(celda).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();
    URL.revokeObjectURL(url);
}
