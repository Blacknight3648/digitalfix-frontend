// Roles del caso DigitalFix (sección 2 del enunciado).
export type AppRole = 'ADMIN' | 'SUPERVISOR' | 'CLIENTE' | 'AUDITOR';

export const APP_ROLE_LABEL: Record<AppRole, string> = {
    ADMIN: 'Admin',
    SUPERVISOR: 'Supervisor',
    CLIENTE: 'Cliente',
    AUDITOR: 'Auditor',
};

export interface AppUser {
    name: string;
    email: string;
    role: AppRole;
    // Scopes del access token de la API (claim "scp"), según ms-login.
    scopes: string[];
}

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
