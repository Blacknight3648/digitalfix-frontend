import { AppRole } from '../model/user.model';

export interface NavItem {
    label: string;
    path: string;
    icon: string;
    roles: AppRole[];
}

// Pantallas propuestas por el caso (sección 6), filtradas por rol en el sidebar.
// 'home' se mantiene como path de Órdenes de trabajo porque ya está protegido
// end-to-end desde el login; renombrarlo a 'workorders' queda fuera de este ajuste.
export const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', path: 'dashboard', icon: 'space_dashboard', roles: ['ADMIN', 'SUPERVISOR', 'CLIENTE', 'AUDITOR'] },
    { label: 'Órdenes de trabajo', path: 'home', icon: 'assignment', roles: ['ADMIN', 'SUPERVISOR', 'CLIENTE'] },
    { label: 'Catálogo técnico', path: 'catalog', icon: 'inventory_2', roles: ['ADMIN', 'SUPERVISOR'] },
    { label: 'Reportería', path: 'reports', icon: 'insights', roles: ['ADMIN'] },
    { label: 'Auditoría', path: 'audit', icon: 'fact_check', roles: ['ADMIN', 'AUDITOR'] },
];
