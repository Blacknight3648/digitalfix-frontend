import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { ServicioCatalogo, ServicioCatalogoPeticion } from '../model/catalogo-servicio.model';

// CRUD del catálogo de servicios (ms-workorders, vía BFF). Usa HttpClient para que
// MsalInterceptor adjunte el Bearer token (bffUrl es recurso protegido).
@Injectable({
    providedIn: 'root',
})
export class ServicioCatalogoServicios {
    private readonly http = inject(HttpClient);
    private readonly ruta = `${environment.bffUrl}/api/servicios`;

    // soloActivos: lo que se ofrece al crear una orden; sin él, todo el catálogo (mantención).
    listar(soloActivos = false): Observable<ServicioCatalogo[]> {
        const params = new HttpParams().set('soloActivos', soloActivos);
        return this.http.get<ServicioCatalogo[]>(this.ruta, { params });
    }

    crear(peticion: ServicioCatalogoPeticion): Observable<ServicioCatalogo> {
        const { activo, ...cuerpo } = peticion;
        return this.http.post<ServicioCatalogo>(this.ruta, cuerpo);
    }

    actualizar(id: number, peticion: ServicioCatalogoPeticion): Observable<ServicioCatalogo> {
        return this.http.put<ServicioCatalogo>(`${this.ruta}/${id}`, peticion);
    }

    eliminar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.ruta}/${id}`);
    }
}
