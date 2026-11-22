import { AppRole } from '@models/user.model';

export type SeccionMenu = 'Operación' | 'Administración';

export interface NavItem {
    label: string;
    path: string;
    icon: string;
    roles: AppRole[];
    seccion: SeccionMenu;
}

// Pantallas propuestas por el caso (sección 6), filtradas por rol en el sidebar.
// 'home' se mantiene como path de Órdenes de trabajo porque ya está protegido
// end-to-end desde el login; renombrarlo a 'workorders' queda fuera de este ajuste.
export const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', path: 'dashboard', icon: 'space_dashboard', roles: ['ADMIN', 'SUPERVISOR', 'CLIENTE', 'AUDITOR'], seccion: 'Operación' },
    { label: 'Órdenes de trabajo', path: 'home', icon: 'assignment', roles: ['ADMIN', 'SUPERVISOR', 'CLIENTE'], seccion: 'Operación' },
    { label: 'Catálogo técnico', path: 'catalog', icon: 'inventory_2', roles: ['ADMIN', 'SUPERVISOR'], seccion: 'Operación' },
    { label: 'Reportería', path: 'reports', icon: 'insights', roles: ['ADMIN'], seccion: 'Operación' },
    { label: 'Auditoría', path: 'audit', icon: 'fact_check', roles: ['ADMIN', 'AUDITOR'], seccion: 'Operación' },
    // Administración: por ahora solo para el Superadmin.
    { label: 'Usuarios', path: 'usuarios', icon: 'manage_accounts', roles: ['SUPERADMIN'], seccion: 'Administración' },
    { label: 'Servicios', path: 'servicios', icon: 'handyman', roles: ['SUPERADMIN'], seccion: 'Administración' },
    { label: 'Clientes', path: 'clientes', icon: 'groups', roles: ['SUPERADMIN'], seccion: 'Administración' },
    { label: 'Proveedores', path: 'proveedores', icon: 'local_shipping', roles: ['SUPERADMIN'], seccion: 'Administración' },
    { label: 'Mensajería', path: 'mensajeria', icon: 'hub', roles: ['SUPERADMIN'], seccion: 'Administración' },
];
