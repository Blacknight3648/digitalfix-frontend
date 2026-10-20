import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { ComingSoonComponent } from './pages/coming-soon/coming-soon.component';
import { ClientesComponent } from './pages/clientes/clientes.component';
import { ClienteFormComponent } from './pages/clientes/cliente-form/cliente-form.component';
import { ProveedoresComponent } from './pages/proveedores/proveedores.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { ServiciosComponent } from './pages/servicios/servicios.component';
import { MensajeriaComponent } from './pages/mensajeria/mensajeria.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

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
                component: ComingSoonComponent,
                data: {
                    title: 'Dashboard',
                    description: 'KPIs y resumen operativo. Disponible cuando ms-digitalfix-report esté integrado.',
                },
            },
            {
                path: 'home',
                component: HomeComponent,
                canActivate: [roleGuard],
                data: { title: 'Órdenes de trabajo', roles: ['ADMIN', 'SUPERVISOR', 'CLIENTE'] },
            },
            {
                path: 'catalog',
                component: ComingSoonComponent,
                canActivate: [roleGuard],
                data: {
                    title: 'Catálogo técnico',
                    roles: ['ADMIN', 'SUPERVISOR'],
                    description: 'Servicios, repuestos y stock. Disponible cuando ms-digitalfix-catalog esté integrado.',
                },
            },
            {
                path: 'reports',
                component: ComingSoonComponent,
                canActivate: [roleGuard],
                data: {
                    title: 'Reportería',
                    roles: ['ADMIN'],
                    description: 'Órdenes por hora, tiempo de resolución y servicios más solicitados. Disponible cuando ms-digitalfix-report esté integrado.',
                },
            },
            {
                path: 'audit',
                component: ComingSoonComponent,
                canActivate: [roleGuard],
                data: {
                    title: 'Auditoría',
                    roles: ['ADMIN', 'AUDITOR'],
                    description: 'Timeline de eventos de las órdenes. Disponible cuando ms-digitalfix-audit esté integrado.',
                },
            },
            {
                path: 'usuarios',
                component: UsuariosComponent,
                canActivate: [roleGuard],
                data: { title: 'Usuarios', roles: ['SUPERADMIN'] },
            },
            {
                path: 'servicios',
                component: ServiciosComponent,
                canActivate: [roleGuard],
                data: { title: 'Catálogo de servicios', roles: ['SUPERADMIN'] },
            },
            {
                path: 'clientes',
                component: ClientesComponent,
                canActivate: [roleGuard],
                data: { title: 'Clientes', roles: ['SUPERADMIN'] },
            },
            {
                path: 'clientes/nuevo',
                component: ClienteFormComponent,
                canActivate: [roleGuard],
                data: { title: 'Nuevo cliente', roles: ['SUPERADMIN'] },
            },
            {
                path: 'clientes/:id/editar',
                component: ClienteFormComponent,
                canActivate: [roleGuard],
                data: { title: 'Editar cliente', roles: ['SUPERADMIN'] },
            },
            {
                path: 'proveedores',
                component: ProveedoresComponent,
                canActivate: [roleGuard],
                data: { title: 'Proveedores', roles: ['SUPERADMIN'] },
            },
            {
                path: 'mensajeria',
                component: MensajeriaComponent,
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
