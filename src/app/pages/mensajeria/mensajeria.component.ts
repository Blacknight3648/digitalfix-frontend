import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { mensajeDeError } from '../../model/directorio.model';
import { ColaRabbit, ETIQUETA_LISTENER, ListenerRabbit, colasDe } from '../../model/mensajeria.model';
import { ServicioMensajeria } from '../../services/servicio-mensajeria.service';

// Panel de mensajería (ms-admin-queues vía BFF): estado de los consumidores de ms-notify
// y de sus colas, con control de listeners y purga de colas de cuarentena (DLQ).
@Component({
    standalone: true,
    selector: 'app-mensajeria',
    imports: [CommonModule],
    templateUrl: './mensajeria.component.html',
    styleUrl: '../shared/mantenedor.css',
})
export class MensajeriaComponent implements OnInit {
    private readonly servicio = inject(ServicioMensajeria);

    readonly etiqueta = ETIQUETA_LISTENER;

    listeners: ListenerRabbit[] = [];
    colas: ColaRabbit[] = [];
    cargando = false;
    // id del listener o nombre de la cola con una acción en curso
    ocupado = '';
    mensajeError = '';
    mensajeExito = '';

    ngOnInit(): void {
        this.cargar();
    }

    get mensajesEnCuarentena(): number {
        return this.colas.filter((c) => c.esDlq).reduce((total, c) => total + (c.mensajes ?? 0), 0);
    }

    // Las colas se descubren a partir de los listeners: cada consumidor informa las que escucha.
    cargar(): void {
        this.cargando = true;
        this.servicio
            .listarListeners()
            .pipe(
                switchMap((listeners) => {
                    this.listeners = [...listeners].sort((a, b) => a.listenerId.localeCompare(b.listenerId));
                    const nombres = [...new Set(listeners.flatMap(colasDe))].sort();
                    if (!nombres.length) {
                        return of([] as ColaRabbit[]);
                    }
                    return forkJoin(
                        nombres.map((nombre) =>
                            this.servicio.obtenerCola(nombre).pipe(
                                map((p): ColaRabbit => ({
                                    nombre,
                                    mensajes: p.QUEUE_MESSAGE_COUNT,
                                    consumidores: p.QUEUE_CONSUMER_COUNT,
                                    esDlq: nombre.endsWith('.dlq'),
                                })),
                                catchError(() => of<ColaRabbit>({ nombre, mensajes: null, consumidores: null, esDlq: nombre.endsWith('.dlq') })),
                            ),
                        ),
                    );
                }),
            )
            .subscribe({
                next: (colas) => {
                    this.colas = colas;
                    this.cargando = false;
                },
                error: (err) => {
                    this.listeners = [];
                    this.colas = [];
                    this.mensajeError = mensajeDeError(err, 'consultar el estado de RabbitMQ');
                    this.cargando = false;
                },
            });
    }

    colasDelListener(listener: ListenerRabbit): string {
        return colasDe(listener).join(', ');
    }

    controlar(listener: ListenerRabbit, accion: 'pause' | 'resume'): void {
        this.limpiarMensajes();
        this.ocupado = listener.listenerId;
        this.servicio.controlarListener(listener.listenerId, accion).subscribe({
            next: (r) => {
                this.ocupado = '';
                this.mensajeExito = r.message;
                this.cargar();
            },
            error: (err) => {
                this.ocupado = '';
                this.mensajeError = mensajeDeError(err, 'controlar el listener');
            },
        });
    }

    purgar(cola: ColaRabbit): void {
        if (!confirm(`¿Vaciar la cola ${cola.nombre}? Se descartan ${cola.mensajes ?? 0} mensaje(s) y no se puede deshacer.`)) {
            return;
        }
        this.limpiarMensajes();
        this.ocupado = cola.nombre;
        this.servicio.purgarCola(cola.nombre).subscribe({
            next: (r) => {
                this.ocupado = '';
                this.mensajeExito = `Cola ${cola.nombre} purgada: ${r.purgedMessagesCount} mensaje(s) descartados.`;
                this.cargar();
            },
            error: (err) => {
                this.ocupado = '';
                this.mensajeError = mensajeDeError(err, 'purgar la cola');
            },
        });
    }

    limpiarMensajes(): void {
        this.mensajeError = '';
        this.mensajeExito = '';
    }
}
