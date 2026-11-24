import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@remote/service/api';
import { KpiResponse } from '@models/dashboard.model';

export type { KpiResponse } from '@models/dashboard.model';

// Métricas operativas en tiempo real de digitalfix-ms-report, vía BFF.
// Usa HttpClient para que MsalInterceptor adjunte el Bearer token (bffUrl es recurso protegido).
@Injectable({
    providedIn: 'root',
})
export class DashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${API_URL}/api/report/kpis`;

    getKpis(range = 'last24h'): Observable<KpiResponse> {
        const params = new HttpParams().set('range', range);
        return this.http.get<KpiResponse>(this.apiUrl, { params });
    }
}
