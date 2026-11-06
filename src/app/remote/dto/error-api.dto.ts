// Cuerpo de error del backend: ms-workorders y el BFF envían "errors" (lista);
// ms-user envía "details" (campo -> mensaje) en los errores de validación.
export interface ErrorApi {
    status: number;
    message: string;
    errors: string[];
    details: Record<string, string>;
}
