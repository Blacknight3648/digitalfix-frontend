import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientePeticion, mensajeDeError } from '../../../model/directorio.model';
import { DireccionFormulario, direccionAFormulario, direccionAPeticion, direccionVacia } from '../../../model/ubicacion.model';
import { ServicioClientes } from '../../../services/servicio-clientes.service';
import { CAMPOS_CHILE } from '../../../shared/campos-chile.directive';
import { DireccionCamposComponent } from '../../../shared/direccion-campos/direccion-campos.component';

interface FormularioCliente {
    rut: string;
    nombre: string;
    telefono: string | null;
    telefonoSecundario: string | null;
    email: string;
    direccion: DireccionFormulario;
}

function formularioVacio(): FormularioCliente {
    return { rut: '', nombre: '', telefono: null, telefonoSecundario: null, email: '', direccion: direccionVacia() };
}

// Página de alta y edición de un cliente (/clientes/nuevo y /clientes/:id/editar).
// Al guardar vuelve al listado y le pasa el mensaje de éxito por el estado de navegación.
@Component({
    standalone: true,
    selector: 'app-cliente-form',
    imports: [CommonModule, FormsModule, RouterLink, ...CAMPOS_CHILE, DireccionCamposComponent],
    templateUrl: './cliente-form.component.html',
    styleUrls: ['../../shared/mantenedor.css', './cliente-form.component.css'],
})
export class ClienteFormComponent implements OnInit {
    private readonly servicio = inject(ServicioClientes);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    // null = creando; con id = editando ese cliente.
    idEditando: number | null = null;
    formulario: FormularioCliente = formularioVacio();
    cargando = false;
    guardando = false;
    mensajeError = '';

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) {
            return;
        }
        this.idEditando = id;
        this.cargando = true;
        this.servicio.obtener(id).subscribe({
            next: (cliente) => {
                this.formulario = {
                    rut: cliente.rut,
                    nombre: cliente.nombreCompleto,
                    telefono: cliente.telefono,
                    telefonoSecundario: cliente.telefonoSecundario,
                    email: cliente.email,
                    direccion: direccionAFormulario(cliente.direccion),
                };
                this.cargando = false;
            },
            error: (err) => {
                this.mensajeError = mensajeDeError(err, 'cargar el cliente');
                this.cargando = false;
            },
        });
    }

    guardar(): void {
        this.mensajeError = '';
        const peticion: ClientePeticion = {
            rut: this.formulario.rut,
            nombre: this.formulario.nombre.trim(),
            telefono: this.formulario.telefono ?? '',
            telefonoSecundario: this.formulario.telefonoSecundario || null,
            email: this.formulario.email,
            direccion: direccionAPeticion(this.formulario.direccion),
        };
        const editando = this.idEditando !== null;
        const solicitud = editando
            ? this.servicio.actualizar(this.idEditando!, peticion)
            : this.servicio.crear(peticion);

        this.guardando = true;
        solicitud.subscribe({
            next: (cliente) => {
                this.guardando = false;
                const mensajeExito = editando
                    ? `Cliente ${cliente.nombreCompleto} actualizado.`
                    : `Cliente ${cliente.nombreCompleto} creado.`;
                this.router.navigate(['/clientes'], { state: { mensajeExito } });
            },
            error: (err) => {
                this.guardando = false;
                this.mensajeError = mensajeDeError(err, 'guardar el cliente');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
        });
    }
}
