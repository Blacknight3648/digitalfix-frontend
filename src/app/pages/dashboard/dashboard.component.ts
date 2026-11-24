import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
    EMPTY,
    Subject,
    catchError,
    distinctUntilChanged,
    merge,
    of,
    switchMap,
    tap,
    timer,
} from 'rxjs';
import {
    ESTADOS_ACTIVOS_PANEL,
    EstadoActivoItem,
    KpiResponse,
    normalizarConteoEstados,
} from '@models/dashboard.model';
import { mensajeDeError } from '@utils/mensaje-error';
import { APP_ROLE_LABEL, AppRole, hasRoleAccess } from '@models/user.model';
import { AuthService } from '@contexts/auth/auth.service';
import { DashboardService } from '../../services/dashboard.service';

const POLLING_INTERVAL_MS = 10_000;
const KPI_RANGE = 'last24h';

@Component({
    standalone: true,
    selector: 'app-dashboard',
    imports: [CommonModule, RouterLink],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly dashboardService = inject(DashboardService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly refrescar$ = new Subject<void>();

    readonly etiquetaRol = APP_ROLE_LABEL;
    readonly intervaloSegundos = POLLING_INTERVAL_MS / 1000;
    readonly puedeVerKpis$ = toObservable(
        computed(() => hasRoleAccess(this.authService.currentUser()?.role, ['ADMIN', 'SUPERVISOR'])),
    ).pipe(distinctUntilChanged());

    kpis: KpiResponse | null = null;
    cargando = false;
    mensajeError = '';
    ultimaActualizacion: Date | null = null;

    constructor() {
        this.authService.syncFromActiveAccount();
    }

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.puedeVerKpis$
            .pipe(
                switchMap((permitido) => {
                    if (!permitido) {
                        this.kpis = null;
                        this.cargando = false;
                        this.mensajeError = '';
                        this.ultimaActualizacion = null;
                        return EMPTY;
                    }

                    // Ejecuta inmediatamente y reinicia el ciclo de 10s cada vez que el usuario refresca manualmente.
                    return merge(of(void 0), this.refrescar$).pipe(
                        switchMap(() => timer(0, POLLING_INTERVAL_MS)),
                        tap(() => {
                            this.cargando = true;
                        }),
                        switchMap(() =>
                            this.dashboardService.getKpis(KPI_RANGE).pipe(
                                tap((data) => {
                                    this.kpis = data;
                                    this.mensajeError = '';
                                    this.ultimaActualizacion = new Date();
                                    this.cargando = false;
                                }),
                                catchError((err) => {
                                    this.mensajeError = mensajeDeError(err, 'consultar los KPIs operativos');
                                    this.cargando = false;
                                    return of(null);
                                }),
                            ),
                        ),
                    );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    get rolActual(): AppRole {
        return this.authService.currentUser()?.role ?? 'CLIENTE';
    }

    get puedeVerKpis(): boolean {
        return hasRoleAccess(this.rolActual, ['ADMIN', 'SUPERVISOR']);
    }

    get desgloseEstados(): EstadoActivoItem[] {
        const conteo = normalizarConteoEstados(this.kpis?.activeStatusCount);
        const total = ESTADOS_ACTIVOS_PANEL.reduce(
            (acc, item) => acc + (conteo[item.estado] ?? 0),
            0,
        );

        return ESTADOS_ACTIVOS_PANEL.map((item) => {
            const cantidad = conteo[item.estado] ?? 0;
            const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
            return { ...item, cantidad, porcentaje };
        });
    }

    get totalOrdenesActivas(): number {
        return this.desgloseEstados.reduce((acc, item) => acc + item.cantidad, 0);
    }

    get tiempoResolucionFormateado(): string {
        const minutos = this.kpis?.avgResolutionTimeMinutes;
        if (minutos == null || !Number.isFinite(minutos) || minutos <= 0) {
            return '0 min';
        }
        if (minutos < 60) {
            return `${minutos.toFixed(1)} min`;
        }

        let horas = Math.floor(minutos / 60);
        let minutosRestantes = Math.round(minutos % 60);
        if (minutosRestantes === 60) {
            horas += 1;
            minutosRestantes = 0;
        }
        return minutosRestantes > 0 ? `${horas} h ${minutosRestantes} min` : `${horas} h`;
    }

    get rutaAlternativaRol(): string {
        return this.rolActual === 'AUDITOR' ? '/audit' : '/home';
    }

    get etiquetaRutaAlternativaRol(): string {
        return this.rolActual === 'AUDITOR' ? 'Ir a Auditoría' : 'Ir a Órdenes de trabajo';
    }

    actualizarManual(): void {
        if (!this.puedeVerKpis) {
            return;
        }
        this.refrescar$.next();
    }

    limpiarError(): void {
        this.mensajeError = '';
    }
}
