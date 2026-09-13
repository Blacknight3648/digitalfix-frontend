import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { ComingSoonComponent } from './pages/coming-soon/coming-soon.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { MsalGuard } from '@azure/msal-angular';
import { roleGuard } from './guards/role.guard';

// '' muestra el login, la puerta de entrada real de la app.
// El resto de las pantallas del caso (sección 6) comparten el layout
// (sidebar + topbar) y quedan detrás de MsalGuard (sesión) y, cuando
// corresponde, de roleGuard (autorización por rol).
export const routes: Routes = [
    { path: '', pathMatch: 'full', component: LoginComponent },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [MsalGuard],
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
            // Home es hoy la única pantalla con datos reales; cuando Dashboard
            // esté implementado, este redirect por defecto debería apuntar ahí.
            { path: '', pathMatch: 'full', redirectTo: 'home' },
        ],
    },
    { path: '**', redirectTo: '' },
];
