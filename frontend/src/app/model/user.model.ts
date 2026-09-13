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
}
