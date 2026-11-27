import { Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import { mensajeDeError } from '@utils/mensaje-error';
import { exportarCsv } from '@utils/exportar-csv';
import { RangoReporte, ResumenReporteDto, TramoReporteDto } from '@remote/dto/reporteria.dto';
import { ServicioReporteria } from '@remote/service/reporteria/servicio-reporteria.service';
import {
    ESTADOS_ORDEN_REPORTE,
    RANGOS_REPORTE,
    claseEstado,
    etiquetaEstado,
    formatearMinutos,
} from '@models/reporteria.model';

// Geometría del gráfico (unidades del viewBox; el SVG escala al ancho del panel).
const ANCHO = 760;
const ALTO = 240;
const MARGEN = { arriba: 12, derecha: 8, abajo: 28, izquierda: 36 };
const MAX_ETIQUETAS_X = 8;

interface BarraGrafico {
    x: number;
    y: number;
    ancho: number;
    alto: number;
    ruta: string;
}

interface ColumnaGrafico {
    tramo: TramoReporteDto;
    indice: number;
    x: number;
    ancho: number;
    creadas: BarraGrafico;
    cerradas: BarraGrafico;
    etiqueta: string | null;
}

// Reportería operativa (ms-report vía BFF): volumen de órdenes creadas vs cerradas por
// tramo de tiempo, tiempos de resolución, transiciones por estado y técnicos con más cierres.
@Component({
    standalone: true,
    selector: 'app-reporteria',
    imports: [CommonModule],
    providers: [DatePipe],
    templateUrl: './reporteria.component.html',
    styleUrl: './reporteria.component.css',
})
export class ReporteriaComponent implements OnInit {
    private readonly servicio = inject(ServicioReporteria);
    private readonly destroyRef = inject(DestroyRef);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly datePipe = inject(DatePipe);
    private readonly cargar$ = new Subject<void>();

    readonly rangos = RANGOS_REPORTE;
    readonly ancho = ANCHO;
    readonly alto = ALTO;
    readonly margen = MARGEN;
    readonly formatearMinutos = formatearMinutos;
    readonly etiquetaEstado = etiquetaEstado;
    readonly claseEstado = claseEstado;

    rango: RangoReporte = 'last24h';
    resumen: ResumenReporteDto | null = null;
    cargando = false;
    mensajeError = '';
    ultimaActualizacion: Date | null = null;
    verTabla = false;
    columnaActiva: ColumnaGrafico | null = null;

    // Derivados del resumen, recalculados una vez por respuesta.
    columnas: ColumnaGrafico[] = [];
    ticksY: { valor: number; y: number }[] = [];
    estados: { estado: string; cantidad: number; porcentaje: number }[] = [];

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cargar$
            .pipe(
                tap(() => {
                    this.cargando = true;
                    this.mensajeError = '';
                }),
                switchMap(() =>
                    this.servicio.obtenerResumen(this.rango).pipe(
                        catchError((err) => {
                            this.mensajeError = mensajeDeError(err, 'cargar la reportería');
                            return of(null);
                        }),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((resumen) => {
                this.cargando = false;
                if (resumen) {
                    this.resumen = resumen;
                    this.ultimaActualizacion = new Date();
                    this.recalcular(resumen);
                }
            });
        this.cargar();
    }

    cargar(): void {
        this.cargar$.next();
    }

    cambiarRango(rango: RangoReporte): void {
        if (rango === this.rango) {
            return;
        }
        this.rango = rango;
        this.columnaActiva = null;
        this.cargar();
    }

    get descripcionRango(): string {
        return this.rangos.find((r) => r.valor === this.rango)?.descripcion ?? '';
    }

    get tasaCierre(): number | null {
        const t = this.resumen?.totals;
        if (!t || t.created === 0) {
            return null;
        }
        return Math.round((t.closed / t.created) * 100);
    }

    get sinDatos(): boolean {
        return !!this.resumen && this.resumen.totals.events === 0;
    }

    etiquetaTramo(tramo: TramoReporteDto): string {
        const minutos = this.resumen?.bucketMinutes ?? 60;
        const inicio = new Date(tramo.start);
        const fin = new Date(inicio.getTime() + minutos * 60_000);
        const formato = minutos >= 360 ? 'dd/MM HH:mm' : 'HH:mm';
        return `${this.datePipe.transform(inicio, formato)} – ${this.datePipe.transform(fin, 'HH:mm')}`;
    }

    // Posición del tooltip en % del ancho, acotada para que no se salga del panel.
    get posicionTooltip(): number {
        if (!this.columnaActiva) {
            return 0;
        }
        const centro = this.columnaActiva.x + this.columnaActiva.ancho / 2;
        return Math.min(85, Math.max(15, (centro / ANCHO) * 100));
    }

    exportar(): void {
        const r = this.resumen;
        if (!r) {
            return;
        }
        const filas = r.series.map((t) => [
            this.datePipe.transform(t.start, 'yyyy-MM-dd HH:mm'),
            t.created,
            t.closed,
            t.cancelled,
        ]);
        exportarCsv(`reporteria-${r.range}-${this.datePipe.transform(new Date(), 'yyyyMMdd-HHmm')}.csv`,
            ['Inicio del tramo', 'Creadas', 'Cerradas', 'Canceladas'], filas);
    }

    private recalcular(r: ResumenReporteDto): void {
        // Eje Y: máximo "redondo" para que las líneas guía caigan en números legibles.
        const maximo = Math.max(1, ...r.series.map((t) => Math.max(t.created, t.closed)));
        const paso = pasoRedondo(maximo / 4);
        const tope = Math.max(paso * 4, paso * Math.ceil(maximo / paso));
        const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
        const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
        const escalaY = (v: number) => MARGEN.arriba + altoUtil - (v / tope) * altoUtil;

        this.ticksY = [];
        for (let v = 0; v <= tope; v += paso) {
            this.ticksY.push({ valor: v, y: escalaY(v) });
        }

        const n = Math.max(1, r.series.length);
        const anchoColumna = anchoUtil / n;
        // Dos barras por tramo con 2px de separación entre ellas y aire a los lados.
        const anchoBarra = Math.max(2, Math.min(18, (anchoColumna * 0.7 - 2) / 2));
        const cadaCuanto = Math.ceil(n / MAX_ETIQUETAS_X);
        const formatoX = r.bucketMinutes >= 360 ? 'dd/MM' : 'HH:mm';

        this.columnas = r.series.map((tramo, indice) => {
            const x = MARGEN.izquierda + indice * anchoColumna;
            const centro = x + anchoColumna / 2;
            const barra = (valor: number, xBarra: number): BarraGrafico => {
                const y = escalaY(valor);
                const alto = MARGEN.arriba + altoUtil - y;
                return { x: xBarra, y, ancho: anchoBarra, alto, ruta: rutaBarra(xBarra, y, anchoBarra, alto) };
            };
            const inicio = new Date(tramo.start);
            // En 7 días se rotula el tramo que abre cada día (hora local); en el resto, uno de cada N.
            const mostrarEtiqueta = r.bucketMinutes >= 360
                ? inicio.getHours() < r.bucketMinutes / 60
                : indice % cadaCuanto === 0;
            return {
                tramo,
                indice,
                x,
                ancho: anchoColumna,
                creadas: barra(tramo.created, centro - anchoBarra - 1),
                cerradas: barra(tramo.closed, centro + 1),
                etiqueta: mostrarEtiqueta ? this.datePipe.transform(inicio, formatoX) : null,
            };
        });

        const totalEventos = Object.values(r.eventsByStatus).reduce((a, b) => a + b, 0);
        this.estados = ESTADOS_ORDEN_REPORTE.map((estado) => {
            const cantidad = r.eventsByStatus[estado] ?? 0;
            return { estado, cantidad, porcentaje: totalEventos ? Math.round((cantidad / totalEventos) * 100) : 0 };
        });
    }
}

// 1, 2, 5, 10, 20, 50... el paso más chico que cubre "aproximado".
function pasoRedondo(aproximado: number): number {
    const base = Math.pow(10, Math.floor(Math.log10(Math.max(aproximado, 1))));
    for (const m of [1, 2, 5, 10]) {
        if (m * base >= aproximado) {
            return m * base;
        }
    }
    return 10 * base;
}

// Barra con las esquinas superiores redondeadas (4px) y la base recta sobre el eje.
function rutaBarra(x: number, y: number, ancho: number, alto: number): string {
    if (alto <= 0) {
        return '';
    }
    const r = Math.min(4, ancho / 2, alto);
    return `M${x},${y + alto}V${y + r}Q${x},${y} ${x + r},${y}H${x + ancho - r}Q${x + ancho},${y} ${x + ancho},${y + r}V${y + alto}Z`;
}
