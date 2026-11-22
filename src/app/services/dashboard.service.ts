import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { KpiResponse } from '../model/dashboard.model';

export type { KpiResponse } from '../model/dashboard.model';

// Métricas operativas en tiempo real de digitalfix-ms-report, vía BFF.
// Usa HttpClient para que MsalInterceptor adjunte el Bearer token (bffUrl es recurso protegido).
@Injectable({
    providedIn: 'root',
})
export class DashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.bffUrl}/api/report/kpis`;

    getKpis(range = 'last24h'): Observable<KpiResponse> {
        const params = new HttpParams().set('range', range);
        return this.http.get<KpiResponse>(this.apiUrl, { params });
    }
}
