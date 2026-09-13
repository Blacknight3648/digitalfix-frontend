import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { MsalGuard } from '@azure/msal-angular';

//Las rutas son las que permiten mostrar las rutas de la aplicación
//la raíz ('') muestra el login, que es la puerta de entrada real de la app
//'home' queda protegida por el guardián msalGuard: solo se entra con sesión ya validada por Microsoft
//si el guardián msalGuard devuelve true, se entra a la ruta
//si el guardián msalGuard devuelve false, no se entra a la ruta

export const routes: Routes = [
    { path: '', component: LoginComponent }, // Página de inicio real: login
    { path: 'home', component: HomeComponent, canActivate: [MsalGuard] },
    { path: '**', redirectTo: '' },
];
