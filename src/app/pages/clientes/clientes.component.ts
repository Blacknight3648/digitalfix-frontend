import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cliente, mensajeDeError } from '../../model/directorio.model';
import { enlaceGoogleMaps } from '../../model/ubicacion.model';
import { ServicioClientes } from '../../services/servicio-clientes.service';
import { TelefonoPipe } from '../../shared/telefono.pipe';

// Listado de clientes (GET/DELETE /api/clientes de ms-workorders). El alta y la edición
// viven en su propia página (ClienteFormComponent), que al guardar vuelve aquí con el mensaje.
@Component({
    standalone: true,
    selector: 'app-clientes',
    imports: [CommonModule, FormsModule, RouterLink, TelefonoPipe],
    templateUrl: './clientes.component.html',
    styleUrl: '../shared/mantenedor.css',
})
export class ClientesComponent implements OnInit {
    private readonly servicio = inject(ServicioClientes);

    readonly enlaceMapa = enlaceGoogleMaps;

    clientes: Cliente[] = [];
    cargando = false;
    mensajeError = '';
    mensajeExito = '';
    terminoBusqueda = '';

    ngOnInit(): void {
        this.mensajeExito = history.state?.mensajeExito ?? '';
        this.cargar();
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

    eliminar(cliente: Cliente): void {
        if (!confirm(`¿Eliminar al cliente ${cliente.nombreCompleto}? Esta acción no se puede deshacer.`)) {
            return;
        }
        this.limpiarMensajes();
        this.servicio.eliminar(cliente.idCliente).subscribe({
            next: () => {
                this.mensajeExito = `Cliente ${cliente.nombreCompleto} eliminado.`;
                this.cargar();
            },
            error: (err) => (this.mensajeError = mensajeDeError(err, 'eliminar el cliente')),
        });
    }

    limpiarMensajes(): void {
        this.mensajeError = '';
        this.mensajeExito = '';
    }
}
