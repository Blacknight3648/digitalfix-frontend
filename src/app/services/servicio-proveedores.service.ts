import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { Proveedor, ProveedorPeticion, TipoProveedor } from '../model/directorio.model';

// CRUD de proveedores contra digitalfix-ms-workorders. Usa HttpClient para que
// MsalInterceptor adjunte el Bearer token (bffUrl es recurso protegido).
@Injectable({
    providedIn: 'root',
})
export class ServicioProveedores {
    private readonly http = inject(HttpClient);
    private readonly ruta = `${environment.bffUrl}/api/proveedores`;

    listar(): Observable<Proveedor[]> {
        return this.http.get<Proveedor[]>(this.ruta);
    }

    // Repuestos de una orden: solo proveedores de PRODUCTOS.
    listarPorTipo(tipo: TipoProveedor): Observable<Proveedor[]> {
        return this.http.get<Proveedor[]>(this.ruta, { params: { tipo } });
    }

    crear(peticion: ProveedorPeticion): Observable<Proveedor> {
        return this.http.post<Proveedor>(this.ruta, peticion);
    }

    actualizar(id: number, peticion: ProveedorPeticion): Observable<Proveedor> {
        const { rut, ...cuerpo } = peticion;
        return this.http.put<Proveedor>(`${this.ruta}/${id}`, cuerpo);
    }

    eliminar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.ruta}/${id}`);
    }
}
