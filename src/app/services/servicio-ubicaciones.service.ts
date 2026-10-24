import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../environment/environment';
import { Comuna, Region } from '../model/ubicacion.model';

// Regiones y comunas (ms-workorders, vía BFF). Es un catálogo fijo: se guarda en memoria
// para no repetir la consulta cada vez que se abre un formulario.
@Injectable({
    providedIn: 'root',
})
export class ServicioUbicaciones {
    private readonly http = inject(HttpClient);
    private readonly ruta = `${environment.bffUrl}/api/regiones`;
    private regiones$?: Observable<Region[]>;
    private readonly comunas = new Map<number, Observable<Comuna[]>>();

    listarRegiones(): Observable<Region[]> {
        this.regiones$ ??= this.http.get<Region[]>(this.ruta).pipe(shareReplay(1));
        return this.regiones$;
    }

    listarComunas(idRegion: number): Observable<Comuna[]> {
        let comunas$ = this.comunas.get(idRegion);
        if (!comunas$) {
            comunas$ = this.http.get<Comuna[]>(`${this.ruta}/${idRegion}/comunas`).pipe(shareReplay(1));
            this.comunas.set(idRegion, comunas$);
        }
        return comunas$;
    }
}
