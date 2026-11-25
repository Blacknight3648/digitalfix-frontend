import { Component, DestroyRef, HostListener, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import { PAGINACION } from '@components/ui/paginador';
import { mensajeDeError } from '@utils/mensaje-error';
import { exportarCsv } from '@utils/exportar-csv';
import { EventoAccesoDto, EventoOrdenDto, RangoReporte } from '@remote/dto/reporteria.dto';
import { ServicioReporteria } from '@remote/service/reporteria/servicio-reporteria.service';
import {
    ESTADOS_ORDEN_REPORTE,
    EVENTOS_ACCESO,
    RANGOS_REPORTE,
    TipoEventoAcceso,
    claseEstado,
    configEventoAcceso,
    etiquetaEstado,
    fechaAccesoUtc,
    formatearDuracion,
} from '@models/reporteria.model';

type Pestana = 'ordenes' | 'accesos';

interface EventoAcceso extends EventoAccesoDto {
    fecha: Date;
}

// Auditoría (Admin y Auditor):
//   - Bitácora de cambios de estado de las órdenes (ms-report), con la línea de tiempo de cada orden.
//   - Accesos al sistema: inicios de sesión, intentos fallidos, bloqueos y cierres (ms-login).
@Component({
    standalone: true,
    selector: 'app-auditoria',
    imports: [CommonModule, FormsModule, ...PAGINACION],
    providers: [DatePipe],
    templateUrl: './auditoria.component.html',
    styleUrl: './auditoria.component.css',
})
export class AuditoriaComponent implements OnInit {
    private readonly servicio = inject(ServicioReporteria);
    private readonly destroyRef = inject(DestroyRef);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly datePipe = inject(DatePipe);
    private readonly cargarOrdenes$ = new Subject<void>();
    private readonly cargarAccesos$ = new Subject<void>();

    readonly rangos = RANGOS_REPORTE;
    readonly estadosOrden = ESTADOS_ORDEN_REPORTE;
    readonly tiposAcceso = Object.keys(EVENTOS_ACCESO) as TipoEventoAcceso[];
    readonly etiquetaEstado = etiquetaEstado;
    readonly claseEstado = claseEstado;
    readonly configAcceso = configEventoAcceso;
    readonly formatearDuracion = formatearDuracion;

    pestana: Pestana = 'ordenes';

    // ---------- Eventos de órdenes ----------
    rango: RangoReporte = 'last24h';
    filtroEstado = '';
    busquedaOrden = '';
    eventos: EventoOrdenDto[] = [];
    cargandoOrdenes = false;
    errorOrdenes = '';
    ordenesCargadas = false;
    paginaOrdenes = 1;
    tamanoOrdenes = 10;

    // Línea de tiempo de una orden
    ordenTimeline: number | null = null;
    timeline: EventoOrdenDto[] = [];
    cargandoTimeline = false;
    errorTimeline = '';

    // ---------- Accesos ----------
    accesos: EventoAcceso[] = [];
    filtroAcceso: TipoEventoAcceso | '' = '';
    busquedaAcceso = '';
    cargandoAccesos = false;
    errorAccesos = '';
    accesosCargados = false;
    paginaAccesos = 1;
    tamanoAccesos = 10;

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.cargarOrdenes$
            .pipe(
                tap(() => {
                    this.cargandoOrdenes = true;
                    this.errorOrdenes = '';
                }),
                switchMap(() =>
                    this.servicio.listarEventosOrdenes(this.rango, this.filtroEstado || undefined, 500).pipe(
                        catchError((err) => {
                            this.errorOrdenes = mensajeDeError(err, 'cargar la bitácora de órdenes');
                            return of(null);
                        }),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((eventos) => {
                this.cargandoOrdenes = false;
                if (eventos) {
                    this.eventos = eventos;
                    this.ordenesCargadas = true;
                    this.paginaOrdenes = 1;
                }
            });

        this.cargarAccesos$
            .pipe(
                tap(() => {
                    this.cargandoAccesos = true;
                    this.errorAccesos = '';
                }),
                switchMap(() =>
                    this.servicio.listarAccesos().pipe(
                        catchError((err) => {
                            this.errorAccesos = mensajeDeError(err, 'cargar la auditoría de accesos');
                            return of(null);
                        }),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((accesos) => {
                this.cargandoAccesos = false;
                if (accesos) {
                    this.accesos = accesos
                        .map((a) => ({ ...a, fecha: fechaAccesoUtc(a.registeredAt) }))
                        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
                    this.accesosCargados = true;
                    this.paginaAccesos = 1;
                }
            });

        this.cargarOrdenes$.next();
    }

    cambiarPestana(pestana: Pestana): void {
        this.pestana = pestana;
        // Cada pestaña se carga la primera vez que se abre.
        if (pestana === 'accesos' && !this.accesosCargados && !this.cargandoAccesos) {
            this.cargarAccesos$.next();
        }
    }

    actualizar(): void {
        if (this.pestana === 'ordenes') {
            this.cargarOrdenes$.next();
        } else {
            this.cargarAccesos$.next();
        }
    }

    get cargando(): boolean {
        return this.pestana === 'ordenes' ? this.cargandoOrdenes : this.cargandoAccesos;
    }

    // ---------- Órdenes ----------

    cambiarRango(rango: RangoReporte): void {
        if (rango !== this.rango) {
            this.rango = rango;
            this.cargarOrdenes$.next();
        }
    }

    cambiarEstado(): void {
        this.cargarOrdenes$.next();
    }

    get eventosFiltrados(): EventoOrdenDto[] {
        const termino = this.busquedaOrden.trim().replace(/^#/, '');
        if (!termino) {
            return this.eventos;
        }
        return this.eventos.filter((e) =>
            String(e.orderId).includes(termino) || (e.traceId ?? '').toLowerCase().includes(termino.toLowerCase()));
    }

    get ordenesDistintas(): number {
        return new Set(this.eventos.map((e) => e.orderId)).size;
    }

    abrirTimeline(idOrden: number): void {
        this.ordenTimeline = idOrden;
        this.timeline = [];
        this.errorTimeline = '';
        this.cargandoTimeline = true;
        this.servicio
            .obtenerTimelineOrden(idOrden)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (eventos) => {
                    if (this.ordenTimeline === idOrden) {
                        this.timeline = eventos;
                        this.cargandoTimeline = false;
                    }
                },
                error: (err) => {
                    if (this.ordenTimeline === idOrden) {
                        this.errorTimeline = mensajeDeError(err, 'cargar la línea de tiempo de la orden');
                        this.cargandoTimeline = false;
                    }
                },
            });
    }

    @HostListener('document:keydown.escape')
    cerrarTimeline(): void {
        this.ordenTimeline = null;
    }

    get duracionTotalTimeline(): string {
        if (this.timeline.length < 2) {
            return '';
        }
        return formatearDuracion(this.timeline[0].occurredAt, this.timeline[this.timeline.length - 1].occurredAt);
    }

    exportarOrdenes(): void {
        const filas = this.eventosFiltrados.map((e) => [
            this.datePipe.transform(e.occurredAt, 'yyyy-MM-dd HH:mm:ss'),
            e.orderId,
            e.previousStatus ? etiquetaEstado(e.previousStatus) : '',
            etiquetaEstado(e.newStatus),
            e.assignedTechnicianId,
            e.clientId,
            e.eventType,
            e.traceId,
            e.eventId,
        ]);
        exportarCsv(`auditoria-ordenes-${this.rango}-${this.marcaArchivo()}.csv`,
            ['Fecha', 'Orden', 'Estado anterior', 'Estado nuevo', 'Técnico', 'Cliente', 'Tipo de evento', 'Trace ID', 'Event ID'],
            filas);
    }

    // ---------- Accesos ----------

    conteoAcceso(tipo: TipoEventoAcceso): number {
        return this.accesos.filter((a) => a.event === tipo).length;
    }

    filtrarAcceso(tipo: TipoEventoAcceso | ''): void {
        this.filtroAcceso = this.filtroAcceso === tipo ? '' : tipo;
        this.paginaAccesos = 1;
    }

    get accesosFiltrados(): EventoAcceso[] {
        const termino = this.busquedaAcceso.trim().toLowerCase();
        return this.accesos.filter((a) =>
            (!this.filtroAcceso || a.event === this.filtroAcceso)
            && (!termino
                || a.userEntraId.toLowerCase().includes(termino)
                || (a.ipAddress ?? '').toLowerCase().includes(termino)
                || (a.failureReason ?? '').toLowerCase().includes(termino)));
    }

    exportarAccesos(): void {
        const filas = this.accesosFiltrados.map((a) => [
            this.datePipe.transform(a.fecha, 'yyyy-MM-dd HH:mm:ss'),
            a.userEntraId,
            configEventoAcceso(a.event).etiqueta,
            a.ipAddress,
            a.failureReason,
        ]);
        exportarCsv(`auditoria-accesos-${this.marcaArchivo()}.csv`,
            ['Fecha', 'Usuario', 'Evento', 'IP', 'Motivo'], filas);
    }

    private marcaArchivo(): string {
        return this.datePipe.transform(new Date(), 'yyyyMMdd-HHmm') ?? 'export';
    }
}
