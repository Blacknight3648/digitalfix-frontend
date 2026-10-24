import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { mensajeDeError } from '../../model/directorio.model';
import { AreaSistema, EmpresaSistema, RolSistema, UsuarioPeticion, UsuarioSistema } from '../../model/usuario-admin.model';
import { AuthService } from '../../services/auth.service';
import { ServicioUsuarios } from '../../services/servicio-usuarios.service';
import { CAMPOS_CHILE } from '../../shared/campos-chile.directive';
import { capitalizarNombre, capitalizarPrimera } from '../../shared/formato-chile';
import { TelefonoPipe } from '../../shared/telefono.pipe';

const FORMULARIO_VACIO: UsuarioPeticion = {
    email: '',
    nombre: '',
    apellido: '',
    telefono: null,
    idArea: null,
    idEmpresa: null,
    idRol: null,
};

// Gestión de usuarios del sistema (GET/POST/PUT/DELETE /api/user de ms-user).
// Un usuario creado aquí queda pre-asignado por correo: al iniciar sesión con
// Microsoft por primera vez, ms-user le vincula su cuenta y conserva este rol.
@Component({
    standalone: true,
    selector: 'app-usuarios',
    imports: [CommonModule, FormsModule, ...CAMPOS_CHILE, TelefonoPipe],
    templateUrl: './usuarios.component.html',
    styleUrl: '../shared/mantenedor.css',
})
export class UsuariosComponent implements OnInit {
    private readonly servicio = inject(ServicioUsuarios);
    private readonly authService = inject(AuthService);

    usuarios: UsuarioSistema[] = [];
    roles: RolSistema[] = [];
    empresas: EmpresaSistema[] = [];
    areas: AreaSistema[] = [];
    // Alta rápida de un área desde el formulario.
    creandoArea = false;
    nombreAreaNueva = '';
    guardandoArea = false;
    cargando = false;
    guardando = false;
    mensajeError = '';
    mensajeExito = '';
    terminoBusqueda = '';
    filtroRol = '';

    modalAbierto = false;
    // null = creando; con id = editando ese usuario.
    idEditando: number | null = null;
    formulario: UsuarioPeticion = { ...FORMULARIO_VACIO };

    ngOnInit(): void {
        this.cargar();
    }

    get usuariosFiltrados(): UsuarioSistema[] {
        const termino = this.terminoBusqueda.trim().toLowerCase();
        return this.usuarios.filter((u) => {
            const coincideRol = !this.filtroRol || u.codigoRol === this.filtroRol;
            const coincideTermino =
                !termino ||
                [`${u.nombre} ${u.apellido}`, u.email, u.nombreEmpresa, u.area].some((campo) =>
                    campo?.toLowerCase().includes(termino),
                );
            return coincideRol && coincideTermino;
        });
    }

    // No se permite darse de baja a uno mismo: dejaría la sesión actual sin usuario.
    esUsuarioActual(usuario: UsuarioSistema): boolean {
        return usuario.email.toLowerCase() === this.authService.currentUser()?.email?.toLowerCase();
    }

    cargar(): void {
        this.cargando = true;
        forkJoin({
            usuarios: this.servicio.listar(),
            roles: this.servicio.listarRoles(),
            empresas: this.servicio.listarEmpresas(),
            areas: this.servicio.listarAreas(),
        }).subscribe({
            next: ({ usuarios, roles, empresas, areas }) => {
                this.usuarios = usuarios;
                this.roles = roles;
                this.empresas = empresas;
                this.areas = areas;
                this.cargando = false;
            },
            error: (err) => {
                this.usuarios = [];
                this.mensajeError = mensajeDeError(err, 'cargar los usuarios');
                this.cargando = false;
            },
        });
    }

    abrirCreacion(): void {
        this.limpiarMensajes();
        this.idEditando = null;
        this.formulario = {
            ...FORMULARIO_VACIO,
            // Por defecto, la empresa interna y el rol de menor privilegio.
            idEmpresa: this.empresas.find((e) => e.rut === 'DIGITALFIX')?.id ?? this.empresas[0]?.id ?? null,
            idRol: this.roles.find((r) => r.codigo === 'CLIENTE')?.id ?? null,
        };
        this.modalAbierto = true;
    }

    abrirEdicion(usuario: UsuarioSistema): void {
        this.limpiarMensajes();
        this.idEditando = usuario.id;
        this.formulario = {
            email: usuario.email,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            telefono: usuario.telefono,
            idArea: usuario.idArea,
            idEmpresa: usuario.idEmpresa,
            idRol: usuario.idRol,
        };
        this.modalAbierto = true;
    }

    cerrarModal(): void {
        this.modalAbierto = false;
    }

    guardar(): void {
        this.limpiarMensajes();
        const peticion: UsuarioPeticion = {
            ...this.formulario,
            email: this.formulario.email.trim().toLowerCase(),
            nombre: capitalizarNombre(this.formulario.nombre),
            apellido: capitalizarNombre(this.formulario.apellido),
            telefono: this.formulario.telefono || null,
        };
        const editando = this.idEditando !== null;
        const solicitud = editando
            ? this.servicio.actualizar(this.idEditando!, peticion)
            : this.servicio.crear(peticion);

        this.guardando = true;
        solicitud.subscribe({
            next: (usuario) => {
                this.guardando = false;
                this.modalAbierto = false;
                this.mensajeExito = editando
                    ? `Usuario ${usuario.email} actualizado. Si cambió el rol, se aplica en su próxima sesión (máx. 5 min).`
                    : `Usuario ${usuario.email} creado como ${usuario.nombreRol}. Podrá entrar con su cuenta Microsoft de ese correo.`;
                this.cargar();
            },
            error: (err) => {
                this.guardando = false;
                this.mensajeError = mensajeDeError(err, 'guardar el usuario');
            },
        });
    }

    abrirAreaNueva(): void {
        this.creandoArea = true;
        this.nombreAreaNueva = '';
    }

    cancelarAreaNueva(): void {
        this.creandoArea = false;
    }

    guardarAreaNueva(): void {
        const nombre = capitalizarPrimera(this.nombreAreaNueva).trim();
        if (!nombre) {
            return;
        }
        this.guardandoArea = true;
        this.servicio.crearArea(nombre).subscribe({
            next: (area) => {
                this.areas = [...this.areas, area].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
                this.formulario.idArea = area.id;
                this.creandoArea = false;
                this.guardandoArea = false;
            },
            error: (err) => {
                this.mensajeError = mensajeDeError(err, 'crear el área');
                this.guardandoArea = false;
            },
        });
    }

    darDeBaja(usuario: UsuarioSistema): void {
        if (!confirm(`¿Dar de baja a ${usuario.nombre} ${usuario.apellido}? Ya no podrá iniciar sesión.`)) {
            return;
        }
        this.limpiarMensajes();
        this.servicio.darDeBaja(usuario.id).subscribe({
            next: () => {
                this.mensajeExito = `Usuario ${usuario.email} dado de baja.`;
                this.cargar();
            },
            error: (err) => (this.mensajeError = mensajeDeError(err, 'dar de baja al usuario')),
        });
    }

    limpiarMensajes(): void {
        this.mensajeError = '';
        this.mensajeExito = '';
    }
}
