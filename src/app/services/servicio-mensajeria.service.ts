import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { ListenerRabbit, PropiedadesCola } from '../model/mensajeria.model';

// Administración de RabbitMQ (ms-admin-queues, vía BFF con rol SUPERADMIN). Usa HttpClient
// para que MsalInterceptor adjunte el Bearer token (bffUrl es recurso protegido).
@Injectable({
    providedIn: 'root',
})
export class ServicioMensajeria {
    private readonly http = inject(HttpClient);
    private readonly ruta = `${environment.bffUrl}/api/v1`;

    listarListeners(): Observable<ListenerRabbit[]> {
        return this.http.get<ListenerRabbit[]>(`${this.ruta}/listeners`);
    }

    // accion: start | stop | pause | resume
    controlarListener(id: string, accion: 'start' | 'stop' | 'pause' | 'resume'): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.ruta}/listeners/${encodeURIComponent(id)}/${accion}`, null);
    }

    obtenerCola(nombre: string): Observable<PropiedadesCola> {
        return this.http.get<PropiedadesCola>(`${this.ruta}/queues/${encodeURIComponent(nombre)}`);
    }

    purgarCola(nombre: string): Observable<{ message: string; purgedMessagesCount: number }> {
        return this.http.post<{ message: string; purgedMessagesCount: number }>(
            `${this.ruta}/queues/${encodeURIComponent(nombre)}/purge`,
            null,
        );
    }
}
