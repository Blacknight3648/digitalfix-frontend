import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { EntradaStockPeticion, MovimientoStock, Repuesto, RepuestoPeticion } from '../model/repuesto.model';

// Repuestos y stock de ms-catalog, vía BFF. Usa HttpClient para que MsalInterceptor adjunte el
// Bearer token (bffUrl es recurso protegido). Las salidas y devoluciones de stock no están aquí:
// las hace ms-workorders al asignar la orden (el BFF bloquea /api/catalog/stock al frontend).
@Injectable({
    providedIn: 'root',
})
export class ServicioRepuestos {
    private readonly http = inject(HttpClient);
    private readonly ruta = `${environment.bffUrl}/api/catalog/repuestos`;

    // soloActivos: lo que se puede agregar a una orden. bajoStock: lo que hay que reponer.
    listar(soloActivos = false, bajoStock = false): Observable<Repuesto[]> {
        const params = new HttpParams().set('soloActivos', soloActivos).set('bajoStock', bajoStock);
        return this.http.get<Repuesto[]>(this.ruta, { params });
    }

    crear(peticion: RepuestoPeticion): Observable<Repuesto> {
        const { activo, ...cuerpo } = peticion;
        return this.http.post<Repuesto>(this.ruta, cuerpo);
    }

    actualizar(id: number, peticion: RepuestoPeticion): Observable<Repuesto> {
        const { stockInicial, ...cuerpo } = peticion;
        return this.http.put<Repuesto>(`${this.ruta}/${id}`, cuerpo);
    }

    eliminar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.ruta}/${id}`);
    }

    registrarEntrada(id: number, peticion: EntradaStockPeticion): Observable<MovimientoStock> {
        return this.http.post<MovimientoStock>(`${this.ruta}/${id}/entradas`, peticion);
    }

    movimientos(id: number): Observable<MovimientoStock[]> {
        return this.http.get<MovimientoStock[]>(`${this.ruta}/${id}/movimientos`);
    }
}
