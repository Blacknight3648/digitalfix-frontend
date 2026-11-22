import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import {
    ETIQUETA_TIPO_MOVIMIENTO,
    ETIQUETA_UNIDAD_MEDIDA,
    EntradaStockPeticion,
    MovimientoStock,
    Repuesto,
    RepuestoPeticion,
    UNIDADES_MEDIDA,
} from '../../model/repuesto.model';
import { mensajeDeError } from '../../model/directorio.model';
import { hasRoleAccess } from '../../model/user.model';
import { AuthService } from '../../services/auth.service';
import { OrdenAlfabetico, ServicioRepuestos } from '../../services/servicio-repuestos.service';
import { CAMPOS_CHILE } from '../../shared/campos-chile.directive';
import { capitalizarPrimera } from '../../shared/formato-chile';

const FORMULARIO_VACIO: RepuestoPeticion = {
    nombre: '',
    descripcion: '',
    unidadMedida: 'UNIDAD',
    precioUnitario: null,
    stockMinimo: null,
    stockInicial: null,
    activo: true,
};

type Modal = 'repuesto' | 'entrada' | 'historial';

// Catálogo técnico (pantalla /catalog del caso): repuestos y stock de ms-catalog.
// Admin y Supervisor consultan el stock y su historial; solo Admin mantiene el catálogo y repone.
// El stock baja solo al asignar una orden (lo descuenta ms-workorders), nunca desde aquí.
@Component({
    standalone: true,
    selector: 'app-catalogo',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ...CAMPOS_CHILE],
    templateUrl: './catalogo.component.html',
    styleUrl: '../shared/mantenedor.css',
})
export class CatalogoComponent implements OnInit {
    private readonly servicio = inject(ServicioRepuestos);
    private readonly authService = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly recargar$ = new Subject<void>();

    readonly unidades = UNIDADES_MEDIDA;
    readonly etiquetaUnidad = ETIQUETA_UNIDAD_MEDIDA;
    readonly etiquetaMovimiento = ETIQUETA_TIPO_MOVIMIENTO;
    readonly searchControl = new FormControl('', { nonNullable: true });

    repuestos: Repuesto[] = [];
    cargando = false;
    guardando = false;
    mensajeError = '';
    mensajeExito = '';
    currentSort: OrdenAlfabetico = 'asc';
    soloBajoStock = false;

    modal: Modal | null = null;
    // Repuesto sobre el que actúa el modal abierto (null = creando uno nuevo).
    seleccionado: Repuesto | null = null;
    formulario: RepuestoPeticion = { ...FORMULARIO_VACIO };
    entrada: EntradaStockPeticion = { cantidad: null, referencia: '' };
    movimientos: MovimientoStock[] = [];
    cargandoMovimientos = false;

    ngOnInit(): void {
        this.recargar$.pipe(
            tap(() => {
                this.cargando = true;
            }),
            switchMap(() =>
                this.servicio.listar(false, this.soloBajoStock, this.searchControl.value, this.currentSort).pipe(
                    tap(() => {
                        this.mensajeError = '';
                    }),
                    catchError((err) => {
                        this.mensajeError = mensajeDeError(err, 'cargar el catálogo de repuestos');
                        return of([] as Repuesto[]);
                    }),
                ),
            ),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe((repuestos) => {
            this.repuestos = repuestos;
            this.cargando = false;
        });

        this.searchControl.valueChanges.pipe(
            debounceTime(350),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe(() => {
            this.cargar();
        });

        this.cargar();
    }

    // Mantención y reposición: solo Admin (SUPERADMIN hereda). El backend aplica la misma regla.
    get puedeAdministrar(): boolean {
        return hasRoleAccess(this.authService.currentUser()?.role, ['ADMIN']);
    }

    get hayFiltrosActivos(): boolean {
        return Boolean(this.searchControl.value.trim()) || this.soloBajoStock;
    }

    get cantidadBajoStock(): number {
        return this.repuestos.filter((r) => r.activo && r.bajoStockMinimo).length;
    }

    cargar(): void {
        this.recargar$.next();
    }

    cambiarOrden(direccion: OrdenAlfabetico): void {
        if (this.currentSort === direccion) {
            return;
        }
        this.currentSort = direccion;
        this.cargar();
    }

    abrirCreacion(): void {
        this.abrir('repuesto', null);
        this.formulario = { ...FORMULARIO_VACIO };
    }

    abrirEdicion(repuesto: Repuesto): void {
        this.abrir('repuesto', repuesto);
        this.formulario = {
            nombre: repuesto.nombre,
            descripcion: repuesto.descripcion ?? '',
            unidadMedida: repuesto.unidadMedida,
            precioUnitario: repuesto.precioUnitario,
            stockMinimo: repuesto.stockMinimo,
            activo: repuesto.activo,
        };
    }

    abrirEntrada(repuesto: Repuesto): void {
        this.abrir('entrada', repuesto);
        this.entrada = { cantidad: null, referencia: '' };
    }

    abrirHistorial(repuesto: Repuesto): void {
        this.abrir('historial', repuesto);
        this.movimientos = [];
        this.cargandoMovimientos = true;
        this.servicio.movimientos(repuesto.idRepuesto).subscribe({
            next: (movimientos) => {
                this.movimientos = movimientos;
                this.cargandoMovimientos = false;
            },
            error: (err) => {
                this.mensajeError = mensajeDeError(err, 'cargar el historial de stock');
                this.cargandoMovimientos = false;
            },
        });
    }

    cerrarModal(): void {
        this.modal = null;
    }

    guardar(): void {
        this.limpiarMensajes();
        const peticion: RepuestoPeticion = {
            ...this.formulario,
            nombre: capitalizarPrimera(this.formulario.nombre).trim(),
            descripcion: this.formulario.descripcion?.trim() || null,
        };
        const editando = this.seleccionado !== null;
        const solicitud = editando
            ? this.servicio.actualizar(this.seleccionado!.idRepuesto, peticion)
            : this.servicio.crear(peticion);

        this.guardando = true;
        solicitud.subscribe({
            next: (guardado) => {
                this.guardando = false;
                this.modal = null;
                this.mensajeExito = editando
                    ? `Repuesto ${guardado.codigo} actualizado.`
                    : `Repuesto ${guardado.codigo} creado con ${guardado.stockDisponible} en stock.`;
                this.cargar();
            },
            error: (err) => {
                this.guardando = false;
                this.mensajeError = mensajeDeError(err, 'guardar el repuesto');
            },
        });
    }

    registrarEntrada(): void {
        const repuesto = this.seleccionado!;
        this.limpiarMensajes();
        this.guardando = true;
        this.servicio.registrarEntrada(repuesto.idRepuesto, {
            cantidad: this.entrada.cantidad,
            referencia: this.entrada.referencia.trim(),
        }).subscribe({
            next: (movimiento) => {
                this.guardando = false;
                this.modal = null;
                this.mensajeExito = `Se repusieron ${movimiento.cantidad} de ${repuesto.codigo}; stock actual: ${movimiento.stockResultante}.`;
                this.cargar();
            },
            error: (err) => {
                this.guardando = false;
                this.mensajeError = mensajeDeError(err, 'reponer el stock');
            },
        });
    }

    eliminar(repuesto: Repuesto): void {
        if (!confirm(`¿Eliminar el repuesto ${repuesto.codigo}? Si ya tiene movimientos de stock, el sistema pedirá desactivarlo.`)) {
            return;
        }
        this.limpiarMensajes();
        this.servicio.eliminar(repuesto.idRepuesto).subscribe({
            next: () => {
                this.mensajeExito = `Repuesto ${repuesto.codigo} eliminado.`;
                this.cargar();
            },
            error: (err) => (this.mensajeError = mensajeDeError(err, 'eliminar el repuesto')),
        });
    }

    limpiarMensajes(): void {
        this.mensajeError = '';
        this.mensajeExito = '';
    }

    private abrir(modal: Modal, repuesto: Repuesto | null): void {
        this.limpiarMensajes();
        this.seleccionado = repuesto;
        this.modal = modal;
    }
}
