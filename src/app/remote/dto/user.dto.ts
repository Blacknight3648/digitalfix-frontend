// Respuesta de GET /api/v1/login/me (ms-login): identidad, roles y scopes
// resueltos por el backend a partir del JWT validado.
export interface UserSession {
    userEntraId: string;
    email: string | null;
    name: string | null;
    roles: string[];
    scopes: string[];
    tokenExpiresAt: string | null;
}
