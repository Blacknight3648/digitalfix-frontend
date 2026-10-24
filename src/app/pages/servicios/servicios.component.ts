import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicioCatalogo, ServicioCatalogoPeticion } from '../../model/catalogo-servicio.model';
import { mensajeDeError } from '../../model/directorio.model';
import { ServicioCatalogoServicios } from '../../services/servicio-catalogo.service';
import { CAMPOS_CHILE } from '../../shared/campos-chile.directive';
import { capitalizarPrimera } from '../../shared/formato-chile';

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
    imports: [CommonModule, FormsModule, ...CAMPOS_CHILE],
    templateUrl: './servicios.component.html',
    styleUrl: '../shared/mantenedor.css',
})
export class ServiciosComponent implements OnInit {
    private readonly servicio = inject(ServicioCatalogoServicios);

    servicios: ServicioCatalogo[] = [];
    cargando = false;
    guardando = false;
    mensajeError = '';
    mensajeExito = '';
    terminoBusqueda = '';

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
        if (!termino) {
            return this.servicios;
        }
        return this.servicios.filter((s) =>
            [s.codigo, s.nombre, s.descripcion].some((campo) => campo?.toLowerCase().includes(termino)),
        );
    }

    get cantidadActivos(): number {
        return this.servicios.filter((s) => s.activo).length;
    }

    cargar(): void {
        this.cargando = true;
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
                this.mensajeExito = editando
                    ? `Servicio ${guardado.nombre} actualizado.`
                    : `Servicio ${guardado.nombre} creado.`;
                this.cargar();
            },
            error: (err) => {
                this.guardando = false;
                this.mensajeError = mensajeDeError(err, 'guardar el servicio');
            },
        });
    }

    eliminar(servicio: ServicioCatalogo): void {
        if (!confirm(`¿Eliminar el servicio ${servicio.nombre}? Si ya se usó en órdenes, el sistema pedirá desactivarlo.`)) {
            return;
        }
        this.limpiarMensajes();
        this.servicio.eliminar(servicio.idServicio).subscribe({
            next: () => {
                this.mensajeExito = `Servicio ${servicio.nombre} eliminado.`;
                this.cargar();
            },
            error: (err) => (this.mensajeError = mensajeDeError(err, 'eliminar el servicio')),
        });
    }

    limpiarMensajes(): void {
        this.mensajeError = '';
        this.mensajeExito = '';
    }
}
