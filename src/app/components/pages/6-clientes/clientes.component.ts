import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cliente } from '@remote/dto/directorio.dto';
import { mensajeDeError } from '@utils/mensaje-error';
import { enlaceGoogleMaps } from '@models/ubicacion.model';
import { ServicioClientes } from '@remote/service/directorio/servicio-clientes.service';
import { TelefonoPipe } from '@components/ui/pipes/telefono.pipe';
import { PAGINACION } from '@components/ui/paginador';
import { NotificacionesService } from '@components/ui/notificaciones/notificaciones.service';
import { ConfirmacionService } from '@components/ui/confirmacion/confirmacion.service';

// Listado de clientes (GET/DELETE /api/clientes de ms-workorders). El alta y la edición
// viven en su propia página (ClienteFormComponent), que al guardar vuelve aquí con el mensaje.
@Component({
    standalone: true,
    selector: 'app-clientes',
    imports: [CommonModule, FormsModule, RouterLink, TelefonoPipe, ...PAGINACION],
    templateUrl: './clientes.component.html',
})
export class ClientesComponent implements OnInit {
    private readonly servicio = inject(ServicioClientes);
    private readonly notificaciones = inject(NotificacionesService);
    private readonly confirmacion = inject(ConfirmacionService);
    readonly filasFantasma = [1, 2, 3, 4, 5];

    readonly enlaceMapa = enlaceGoogleMaps;

    clientes: Cliente[] = [];
    cargando = false;
    mensajeError = '';
    terminoBusqueda = '';
    pagina = 1;
    tamano = 10;

    ngOnInit(): void {
        // El formulario de alta/edición vuelve aquí con el mensaje en el estado de navegación.
        const mensajeExito = typeof history !== 'undefined' ? history.state?.mensajeExito : null;
        if (mensajeExito) {
            this.notificaciones.exito(mensajeExito);
        }
        this.cargar();
    }

    iniciales(nombre: string): string {
        const palabras = nombre.trim().split(/\s+/);
        return ((palabras[0]?.[0] ?? '') + (palabras.length > 1 ? palabras[palabras.length - 1][0] : '')).toUpperCase();
    }

    get clientesFiltrados(): Cliente[] {
        const termino = this.terminoBusqueda.trim().toLowerCase();
        if (!termino) {
            return this.clientes;
        }
        const soloDigitos = termino.replace(/[^0-9k]/g, '');
        return this.clientes.filter(
            (c) =>
                [c.nombreCompleto, c.email, c.telefono, c.direccion?.textoCompleto].some((campo) =>
                    campo?.toLowerCase().includes(termino),
                ) || (soloDigitos.length > 2 && c.rut.toLowerCase().replace(/[^0-9k]/g, '').includes(soloDigitos)),
        );
    }

    cargar(): void {
        this.cargando = true;
        this.mensajeError = '';
        this.servicio.listar().subscribe({
            next: (clientes) => {
                this.clientes = clientes;
                this.cargando = false;
            },
            error: (err) => {
                this.clientes = [];
                this.mensajeError = mensajeDeError(err, 'cargar los clientes');
                this.cargando = false;
            },
        });
    }

    async eliminar(cliente: Cliente): Promise<void> {
        const confirmada = await this.confirmacion.preguntar({
            titulo: `¿Eliminar a ${cliente.nombreCompleto}?`,
            mensaje: 'Esta acción no se puede deshacer.',
            confirmar: 'Eliminar',
            peligro: true,
        });
        if (!confirmada) {
            return;
        }
        this.servicio.eliminar(cliente.idCliente).subscribe({
            next: () => {
                this.notificaciones.exito(`Cliente ${cliente.nombreCompleto} eliminado.`);
                this.cargar();
            },
            error: (err) => this.notificaciones.error(mensajeDeError(err, 'eliminar el cliente')),
        });
    }
}
