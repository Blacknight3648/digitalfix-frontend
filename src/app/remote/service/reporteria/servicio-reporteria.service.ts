import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../api';
import {
    EventoAccesoDto,
    EventoOrdenDto,
    RangoReporte,
    ResumenReporteDto,
} from '../../dto/reporteria.dto';

// Reportería y auditoría vía BFF. Usa HttpClient para que MsalInterceptor adjunte el
// Bearer token (bffUrl es recurso protegido).
//   - ms-report: resumen por ventana, bitácora de eventos de órdenes y timeline por orden.
//   - ms-login:  auditoría de accesos (login, fallos, bloqueos, logout).
@Injectable({
    providedIn: 'root',
})
export class ServicioReporteria {
    private readonly http = inject(HttpClient);
    private readonly rutaReport = `${API_URL}/api/report`;
    private readonly rutaAudit = `${API_URL}/api/v1/audit`;

    obtenerResumen(rango: RangoReporte): Observable<ResumenReporteDto> {
        const params = new HttpParams().set('range', rango);
        return this.http.get<ResumenReporteDto>(`${this.rutaReport}/summary`, { params });
    }

    listarEventosOrdenes(rango: RangoReporte, estado?: string, limite = 200): Observable<EventoOrdenDto[]> {
        let params = new HttpParams().set('range', rango).set('limit', limite);
        if (estado) {
            params = params.set('status', estado);
        }
        return this.http.get<EventoOrdenDto[]>(`${this.rutaReport}/events`, { params });
    }

    obtenerTimelineOrden(idOrden: number): Observable<EventoOrdenDto[]> {
        return this.http.get<EventoOrdenDto[]>(`${this.rutaReport}/orders/${idOrden}/timeline`);
    }

    listarAccesos(): Observable<EventoAccesoDto[]> {
        return this.http.get<EventoAccesoDto[]>(`${this.rutaAudit}/login`);
    }
}
