import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { Cliente, ClientePeticion } from '../model/directorio.model';

// CRUD de clientes contra digitalfix-ms-workorders. Usa HttpClient para que
// MsalInterceptor adjunte el Bearer token (bffUrl es recurso protegido).
@Injectable({
    providedIn: 'root',
})
export class ServicioClientes {
    private readonly http = inject(HttpClient);
    private readonly ruta = `${environment.bffUrl}/api/clientes`;

    listar(): Observable<Cliente[]> {
        return this.http.get<Cliente[]>(this.ruta);
    }

    obtener(id: number): Observable<Cliente> {
        return this.http.get<Cliente>(`${this.ruta}/${id}`);
    }

    crear(peticion: ClientePeticion): Observable<Cliente> {
        return this.http.post<Cliente>(this.ruta, peticion);
    }

    actualizar(id: number, peticion: ClientePeticion): Observable<Cliente> {
        const { rut, ...cuerpo } = peticion;
        return this.http.put<Cliente>(`${this.ruta}/${id}`, cuerpo);
    }

    eliminar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.ruta}/${id}`);
    }
}
