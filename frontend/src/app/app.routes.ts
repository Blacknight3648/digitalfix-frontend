import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MsalGuard } from '@azure/msal-angular';

export const routes: Routes = [
    { path: '', component: HomeComponent, canActivate: [MsalGuard] }, // Si entran a la raíz, el guardián los protege
    { path: '**', redirectTo: '' },
];
