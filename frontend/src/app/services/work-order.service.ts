import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environment/environment';
import { WorkOrder, WorkOrderStatus } from '../model/work-order.model';

export interface CreateWorkOrderPayload {
    cliente: string;
    servicio: string;
    tecnico?: string;
}

// Lo que realmente devuelve digitalfix-ms-workorders (sin "timeline": ese
// historial lo va a construir ms-digitalfix-audit via Kafka, no este servicio).
type WorkOrderApiResponse = Omit<WorkOrder, 'timeline'>;

// Habla directo con digitalfix-ms-workorders (sin pasar por MsalInterceptor:
// ese microservicio todavia no exige JWT, ver su application.yaml).
@Injectable({ providedIn: 'root' })
export class WorkOrderService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.workOrdersApiUrl}/api/workorders`;

    getAll(estado?: WorkOrderStatus): Observable<WorkOrder[]> {
        const url = estado ? `${this.baseUrl}?estado=${estado}` : this.baseUrl;
        return this.http.get<WorkOrderApiResponse[]>(url).pipe(
            map((orders) => orders.map(withEmptyTimeline)),
        );
    }

    create(payload: CreateWorkOrderPayload): Observable<WorkOrder> {
        return this.http.post<WorkOrderApiResponse>(this.baseUrl, payload).pipe(map(withEmptyTimeline));
    }

    updateStatus(id: string, estado: WorkOrderStatus): Observable<WorkOrder> {
        return this.http
            .put<WorkOrderApiResponse>(`${this.baseUrl}/${id}/status`, { estado })
            .pipe(map(withEmptyTimeline));
    }

    cancel(id: string): Observable<WorkOrder> {
        return this.updateStatus(id, 'CANCELADA');
    }
}

function withEmptyTimeline(order: WorkOrderApiResponse): WorkOrder {
    return { ...order, timeline: [] };
}
