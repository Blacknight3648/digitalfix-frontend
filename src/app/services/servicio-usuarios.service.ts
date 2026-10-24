import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { AreaSistema, EmpresaSistema, RolSistema, UsuarioPeticion, UsuarioSistema } from '../model/usuario-admin.model';

// Gestión de usuarios (ms-user, vía BFF). Usa HttpClient para que MsalInterceptor
// adjunte el Bearer token (bffUrl es recurso protegido).
@Injectable({
    providedIn: 'root',
})
export class ServicioUsuarios {
    private readonly http = inject(HttpClient);
    private readonly ruta = `${environment.bffUrl}/api/user`;

    listar(): Observable<UsuarioSistema[]> {
        return this.http.get<UsuarioSistema[]>(this.ruta);
    }

    listarRoles(): Observable<RolSistema[]> {
        return this.http.get<RolSistema[]>(`${this.ruta}/roles`);
    }

    listarEmpresas(): Observable<EmpresaSistema[]> {
        return this.http.get<EmpresaSistema[]>(`${this.ruta}/empresas`);
    }

    listarAreas(): Observable<AreaSistema[]> {
        return this.http.get<AreaSistema[]>(`${this.ruta}/areas`);
    }

    crearArea(nombre: string): Observable<AreaSistema> {
        return this.http.post<AreaSistema>(`${this.ruta}/areas`, { nombre });
    }

    crear(peticion: UsuarioPeticion): Observable<UsuarioSistema> {
        return this.http.post<UsuarioSistema>(this.ruta, peticion);
    }

    actualizar(id: number, peticion: UsuarioPeticion): Observable<UsuarioSistema> {
        return this.http.put<UsuarioSistema>(`${this.ruta}/${id}`, peticion);
    }

    // Baja lógica: el usuario queda INACTIVO y ya no puede iniciar sesión.
    darDeBaja(id: number): Observable<void> {
        return this.http.delete<void>(`${this.ruta}/${id}`);
    }
}
