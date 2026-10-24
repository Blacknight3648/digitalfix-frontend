// Roles del caso DigitalFix (sección 2 del enunciado) + SUPERADMIN, el equipo a
// cargo de la plataforma. Mismos códigos que la tabla ROLES de ms-user.
export type AppRole = 'SUPERADMIN' | 'ADMIN' | 'SUPERVISOR' | 'CLIENTE' | 'AUDITOR';

// Orden de prioridad: si el backend devuelve varios roles, la UI usa el primero
// de esta lista que tenga el usuario.
export const APP_ROLES: AppRole[] = ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'AUDITOR', 'CLIENTE'];

export const APP_ROLE_LABEL: Record<AppRole, string> = {
    SUPERADMIN: 'Superadmin',
    ADMIN: 'Admin',
    SUPERVISOR: 'Supervisor',
    CLIENTE: 'Cliente',
    AUDITOR: 'Auditor',
};

// Misma regla que la jerarquía de roles del backend (RoleHierarchy en ms-login y
// ms-user): SUPERADMIN puede todo lo que pueda cualquier otro rol.
export function hasRoleAccess(role: AppRole | undefined, allowedRoles: AppRole[]): boolean {
    return !!role && (role === 'SUPERADMIN' || allowedRoles.includes(role));
}

export interface AppUser {
    name: string;
    email: string;
    // Rol con el que se arman las vistas. Para un SUPERADMIN puede ser otro rol
    // elegido en "Ver como…"; para el resto siempre es su rol asignado.
    role: AppRole;
    // Rol real del usuario según ms-login (claims del token + ms-user).
    assignedRole: AppRole;
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
