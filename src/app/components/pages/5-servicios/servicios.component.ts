import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicioCatalogo, ServicioCatalogoPeticion } from '@remote/dto/catalogo-servicio.dto';
import { mensajeDeError } from '@utils/mensaje-error';
import { ServicioCatalogoServicios } from '@remote/service/catalogo/servicio-catalogo.service';
import { CAMPOS_CHILE } from '@components/ui/directives/campos-chile.directive';
import { capitalizarPrimera } from '@utils/formato-chile';
import { PAGINACION } from '@components/ui/paginador';
import { NotificacionesService } from '@components/ui/notificaciones/notificaciones.service';
import { ConfirmacionService } from '@components/ui/confirmacion/confirmacion.service';

const FORMULARIO_VACIO: ServicioCatalogoPeticion = {
    nombre: '',
    descripcion: '',
    tarifa: null,
    activo: true,
};

// Mantenedor del catálogo de servicios (GET/POST/PUT/DELETE /api/servicios de ms-workorders).
// Es la lista de la que el cliente elige al crear su orden, en vez de escribir la labor a mano.
@Component({
    standalone: true,
    selector: 'app-servicios',
    imports: [CommonModule, FormsModule, ...CAMPOS_CHILE, ...PAGINACION],
    templateUrl: './servicios.component.html',
})
export class ServiciosComponent implements OnInit {
    private readonly servicio = inject(ServicioCatalogoServicios);
    private readonly notificaciones = inject(NotificacionesService);
    private readonly confirmacion = inject(ConfirmacionService);
    readonly filasFantasma = [1, 2, 3, 4, 5];

    servicios: ServicioCatalogo[] = [];
    cargando = false;
    guardando = false;
    mensajeError = '';
    terminoBusqueda = '';
    filtroEstado: '' | 'activos' | 'inactivos' = '';
    pagina = 1;
    tamano = 10;

    modalAbierto = false;
    // null = creando; con id = editando ese servicio.
    idEditando: number | null = null;
    formulario: ServicioCatalogoPeticion = { ...FORMULARIO_VACIO };
    // Código del servicio en edición (solo lectura: lo genera el sistema).
    codigoEditando = '';

    ngOnInit(): void {
        this.cargar();
    }

    get serviciosFiltrados(): ServicioCatalogo[] {
        const termino = this.terminoBusqueda.trim().toLowerCase();
        return this.servicios.filter((s) =>
            (!this.filtroEstado || s.activo === (this.filtroEstado === 'activos'))
            && (!termino || [s.codigo, s.nombre, s.descripcion].some((campo) => campo?.toLowerCase().includes(termino))),
        );
    }

    get cantidadActivos(): number {
        return this.servicios.filter((s) => s.activo).length;
    }

    cargar(): void {
        this.cargando = true;
        if (!this.modalAbierto) {
            this.mensajeError = '';
        }
        this.servicio.listar().subscribe({
            next: (servicios) => {
                this.servicios = servicios;
                this.cargando = false;
            },
            error: (err) => {
                this.servicios = [];
                this.mensajeError = mensajeDeError(err, 'cargar el catálogo de servicios');
                this.cargando = false;
            },
        });
    }

    abrirCreacion(): void {
        this.limpiarMensajes();
        this.idEditando = null;
        this.formulario = { ...FORMULARIO_VACIO };
        this.modalAbierto = true;
    }

    abrirEdicion(servicio: ServicioCatalogo): void {
        this.limpiarMensajes();
        this.idEditando = servicio.idServicio;
        this.codigoEditando = servicio.codigo;
        this.formulario = {
            nombre: servicio.nombre,
            descripcion: servicio.descripcion ?? '',
            tarifa: servicio.tarifa,
            activo: servicio.activo,
        };
        this.modalAbierto = true;
    }

    cerrarModal(): void {
        this.modalAbierto = false;
    }

    guardar(): void {
        this.limpiarMensajes();
        const peticion: ServicioCatalogoPeticion = {
            ...this.formulario,
            nombre: capitalizarPrimera(this.formulario.nombre).trim(),
            descripcion: this.formulario.descripcion?.trim() || null,
        };
        const editando = this.idEditando !== null;
        const solicitud = editando
            ? this.servicio.actualizar(this.idEditando!, peticion)
            : this.servicio.crear(peticion);

        this.guardando = true;
        solicitud.subscribe({
            next: (guardado) => {
                this.guardando = false;
                this.modalAbierto = false;
                this.notificaciones.exito(editando
                    ? `Servicio ${guardado.nombre} actualizado.`
                    : `Servicio ${guardado.nombre} creado.`);
                this.cargar();
            },
            error: (err) => {
                this.guardando = false;
                this.mensajeError = mensajeDeError(err, 'guardar el servicio');
            },
        });
    }

    async eliminar(servicio: ServicioCatalogo): Promise<void> {
        const confirmada = await this.confirmacion.preguntar({
            titulo: `¿Eliminar ${servicio.nombre}?`,
            mensaje: 'Si ya se usó en órdenes, el sistema pedirá desactivarlo en vez de eliminarlo.',
            confirmar: 'Eliminar',
            peligro: true,
        });
        if (!confirmada) {
            return;
        }
        this.servicio.eliminar(servicio.idServicio).subscribe({
            next: () => {
                this.notificaciones.exito(`Servicio ${servicio.nombre} eliminado.`);
                this.cargar();
            },
            error: (err) => this.notificaciones.error(mensajeDeError(err, 'eliminar el servicio')),
        });
    }

    limpiarMensajes(): void {
        this.mensajeError = '';
    }

    @HostListener('document:keydown.escape')
    cerrarConEscape(): void {
        if (!this.confirmacion.actual()) {
            this.cerrarModal();
        }
    }
}
