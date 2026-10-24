import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

// Carga diferida: el bundle inicial solo trae el login y el layout. Cada pantalla interna se
// descarga la primera vez que se visita (loadComponent), así el login abre rápido aunque la app crezca.
// '' muestra el login, la puerta de entrada real de la app. Microsoft siempre
// devuelve a '', así que es el login el que redirige a home a quien ya tiene sesión.
// El resto de las pantallas del caso (sección 6) comparten el layout
// (sidebar + topbar) y quedan detrás de authGuard (sesión) y, cuando
// corresponde, de roleGuard (autorización por rol).
export const routes: Routes = [
    { path: '', pathMatch: 'full', component: LoginComponent },
    { path: 'login', component: LoginComponent },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./pages/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
                data: {
                    title: 'Dashboard',
                    description: 'KPIs y resumen operativo. Disponible cuando ms-digitalfix-report esté integrado.',
                },
            },
            {
                path: 'home',
                loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
                canActivate: [roleGuard],
                data: { title: 'Órdenes de trabajo', roles: ['ADMIN', 'SUPERVISOR', 'CLIENTE'] },
            },
            {
                path: 'catalog',
                loadComponent: () => import('./pages/catalogo/catalogo.component').then((m) => m.CatalogoComponent),
                canActivate: [roleGuard],
                data: { title: 'Catálogo técnico', roles: ['ADMIN', 'SUPERVISOR'] },
            },
            {
                path: 'reports',
                loadComponent: () => import('./pages/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
                canActivate: [roleGuard],
                data: {
                    title: 'Reportería',
                    roles: ['ADMIN'],
                    description: 'Órdenes por hora, tiempo de resolución y servicios más solicitados. Disponible cuando ms-digitalfix-report esté integrado.',
                },
            },
            {
                path: 'audit',
                loadComponent: () => import('./pages/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
                canActivate: [roleGuard],
                data: {
                    title: 'Auditoría',
                    roles: ['ADMIN', 'AUDITOR'],
                    description: 'Timeline de eventos de las órdenes. Disponible cuando ms-digitalfix-audit esté integrado.',
                },
            },
            {
                path: 'usuarios',
                loadComponent: () => import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
                canActivate: [roleGuard],
                data: { title: 'Usuarios', roles: ['SUPERADMIN'] },
            },
            {
                path: 'servicios',
                loadComponent: () => import('./pages/servicios/servicios.component').then((m) => m.ServiciosComponent),
                canActivate: [roleGuard],
                data: { title: 'Catálogo de servicios', roles: ['SUPERADMIN'] },
            },
            {
                path: 'clientes',
                loadComponent: () => import('./pages/clientes/clientes.component').then((m) => m.ClientesComponent),
                canActivate: [roleGuard],
                data: { title: 'Clientes', roles: ['SUPERADMIN'] },
            },
            {
                path: 'clientes/nuevo',
                loadComponent: () => import('./pages/clientes/cliente-form/cliente-form.component').then((m) => m.ClienteFormComponent),
                canActivate: [roleGuard],
                data: { title: 'Nuevo cliente', roles: ['SUPERADMIN'] },
            },
            {
                path: 'clientes/:id/editar',
                loadComponent: () => import('./pages/clientes/cliente-form/cliente-form.component').then((m) => m.ClienteFormComponent),
                canActivate: [roleGuard],
                data: { title: 'Editar cliente', roles: ['SUPERADMIN'] },
            },
            {
                path: 'proveedores',
                loadComponent: () => import('./pages/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
                canActivate: [roleGuard],
                data: { title: 'Proveedores', roles: ['SUPERADMIN'] },
            },
            {
                path: 'mensajeria',
                loadComponent: () => import('./pages/mensajeria/mensajeria.component').then((m) => m.MensajeriaComponent),
                canActivate: [roleGuard],
                data: { title: 'Mensajería', roles: ['SUPERADMIN'] },
            },
            // Home es hoy la única pantalla con datos reales; cuando Dashboard
            // esté implementado, este redirect por defecto debería apuntar ahí.
            { path: '', pathMatch: 'full', redirectTo: 'home' },
        ],
    },
    { path: '**', redirectTo: '' },
];
