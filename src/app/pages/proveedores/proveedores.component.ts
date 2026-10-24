import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    DESCRIPCION_TIPO_PROVEEDOR,
    ETIQUETA_TIPO_PROVEEDOR,
    Proveedor,
    ProveedorPeticion,
    TipoProveedor,
    mensajeDeError,
} from '../../model/directorio.model';
import {
    DireccionFormulario,
    direccionAFormulario,
    direccionAPeticion,
    direccionVacia,
    enlaceGoogleMaps,
} from '../../model/ubicacion.model';
import { ServicioProveedores } from '../../services/servicio-proveedores.service';
import { CAMPOS_CHILE } from '../../shared/campos-chile.directive';
import { DireccionCamposComponent } from '../../shared/direccion-campos/direccion-campos.component';
import { TelefonoPipe } from '../../shared/telefono.pipe';

interface FormularioProveedor {
    rut: string;
    razonSocial: string;
    tipo: TipoProveedor;
    giro: string;
    telefono: string | null;
    email: string;
    direccion: DireccionFormulario;
}

function formularioVacio(): FormularioProveedor {
    return { rut: '', razonSocial: '', tipo: 'PRODUCTOS', giro: '', telefono: null, email: '', direccion: direccionVacia() };
}

// Mantenedor de proveedores (GET/POST/PUT/DELETE /api/proveedores de ms-workorders). Cada
// proveedor es de SERVICIOS o de PRODUCTOS; solo los de productos abastecen repuestos.
@Component({
    standalone: true,
    selector: 'app-proveedores',
    imports: [CommonModule, FormsModule, ...CAMPOS_CHILE, DireccionCamposComponent, TelefonoPipe],
    templateUrl: './proveedores.component.html',
    styleUrl: '../shared/mantenedor.css',
})
export class ProveedoresComponent implements OnInit {
    private readonly servicio = inject(ServicioProveedores);

    readonly tipos: TipoProveedor[] = ['PRODUCTOS', 'SERVICIOS'];
    readonly etiquetaTipo = ETIQUETA_TIPO_PROVEEDOR;
    readonly descripcionTipo = DESCRIPCION_TIPO_PROVEEDOR;
    readonly enlaceMapa = enlaceGoogleMaps;

    proveedores: Proveedor[] = [];
    cargando = false;
    guardando = false;
    mensajeError = '';
    mensajeExito = '';
    terminoBusqueda = '';
    filtroTipo: TipoProveedor | '' = '';

    modalAbierto = false;
    // null = creando; con id = editando ese proveedor.
    idEditando: number | null = null;
    formulario: FormularioProveedor = formularioVacio();

    ngOnInit(): void {
        this.cargar();
    }

    get proveedoresFiltrados(): Proveedor[] {
        const termino = this.terminoBusqueda.trim().toLowerCase();
        const soloDigitos = termino.replace(/[^0-9k]/g, '');
        return this.proveedores.filter((p) => {
            const coincideTipo = !this.filtroTipo || p.tipo === this.filtroTipo;
            const coincideTermino =
                !termino ||
                [p.razonSocial, p.giro, p.email, p.direccion?.textoCompleto].some((campo) =>
                    campo?.toLowerCase().includes(termino),
                ) ||
                (soloDigitos.length > 2 && p.rut.toLowerCase().replace(/[^0-9k]/g, '').includes(soloDigitos));
            return coincideTipo && coincideTermino;
        });
    }

    cargar(): void {
        this.cargando = true;
        this.servicio.listar().subscribe({
            next: (proveedores) => {
                this.proveedores = proveedores;
                this.cargando = false;
            },
            error: (err) => {
                this.proveedores = [];
                this.mensajeError = mensajeDeError(err, 'cargar los proveedores');
                this.cargando = false;
            },
        });
    }

    abrirCreacion(): void {
        this.limpiarMensajes();
        this.idEditando = null;
        this.formulario = formularioVacio();
        this.modalAbierto = true;
    }

    abrirEdicion(proveedor: Proveedor): void {
        this.limpiarMensajes();
        this.idEditando = proveedor.idProveedor;
        this.formulario = {
            rut: proveedor.rut,
            razonSocial: proveedor.razonSocial,
            tipo: proveedor.tipo,
            giro: proveedor.giro ?? '',
            telefono: proveedor.telefono,
            email: proveedor.email,
            direccion: direccionAFormulario(proveedor.direccion),
        };
        this.modalAbierto = true;
    }

    cerrarModal(): void {
        this.modalAbierto = false;
    }

    guardar(): void {
        this.limpiarMensajes();
        const peticion: ProveedorPeticion = {
            rut: this.formulario.rut,
            razonSocial: this.formulario.razonSocial.trim(),
            tipo: this.formulario.tipo,
            giro: this.formulario.giro.trim() || null,
            telefono: this.formulario.telefono ?? '',
            email: this.formulario.email,
            direccion: direccionAPeticion(this.formulario.direccion),
        };
        const editando = this.idEditando !== null;
        const solicitud = editando
            ? this.servicio.actualizar(this.idEditando!, peticion)
            : this.servicio.crear(peticion);

        this.guardando = true;
        solicitud.subscribe({
            next: (proveedor) => {
                this.guardando = false;
                this.modalAbierto = false;
                this.mensajeExito = editando
                    ? `Proveedor ${proveedor.razonSocial} actualizado.`
                    : `Proveedor ${proveedor.razonSocial} creado.`;
                this.cargar();
            },
            error: (err) => {
                this.guardando = false;
                this.mensajeError = mensajeDeError(err, 'guardar el proveedor');
            },
        });
    }

    eliminar(proveedor: Proveedor): void {
        if (!confirm(`¿Eliminar al proveedor ${proveedor.razonSocial}? Esta acción no se puede deshacer.`)) {
            return;
        }
        this.limpiarMensajes();
        this.servicio.eliminar(proveedor.idProveedor).subscribe({
            next: () => {
                this.mensajeExito = `Proveedor ${proveedor.razonSocial} eliminado.`;
                this.cargar();
            },
            error: (err) => (this.mensajeError = mensajeDeError(err, 'eliminar el proveedor')),
        });
    }

    limpiarMensajes(): void {
        this.mensajeError = '';
        this.mensajeExito = '';
    }
}
