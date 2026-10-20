import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AppRole, APP_ROLE_LABEL, hasRoleAccess } from '../../model/user.model';
import {
    OrdenTrabajo,
    EstadoOrden,
    ClienteResumen,
    CrearOrdenTrabajoPeticion,
    ETIQUETA_ESTADO_ORDEN,
    CLASE_CSS_ESTADO_ORDEN,
    FLUJO_ESTADOS_ORDEN,
    ETIQUETA_ACCION_SIGUIENTE_ORDEN,
} from '../../model/orden-trabajo.model';
import { ServicioOrdenesTrabajo } from '../../services/servicio-ordenes-trabajo.service';
import { ServicioCatalogo } from '../../model/catalogo-servicio.model';
import { mensajeDeError } from '../../model/directorio.model';
import { ServicioCatalogoServicios } from '../../services/servicio-catalogo.service';

@Component({
    standalone: true,
    selector: 'app-home',
    imports: [CommonModule, FormsModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly servicioOrdenes = inject(ServicioOrdenesTrabajo);
    private readonly catalogo = inject(ServicioCatalogoServicios);

    readonly estadosDisponibles: EstadoOrden[] = [
        'CREADA',
        'ASIGNADA',
        'EN_DESPLAZAMIENTO',
        'EN_EJECUCION',
        'CERRADA',
        'CANCELADA',
    ];
    readonly etiquetaRol = APP_ROLE_LABEL;
    readonly etiquetaEstado = ETIQUETA_ESTADO_ORDEN;
    readonly claseCssEstado = CLASE_CSS_ESTADO_ORDEN;

    // Estado de la vista
    ordenes: OrdenTrabajo[] = [];
    cargando = false;
    procesandoAccion = false;
    mensajeError = '';
    mensajeExito = '';

    // Filtros
    terminoBusqueda = '';
    filtroEstado: EstadoOrden | '' = '';
    fechaDesde = '';
    fechaHasta = '';

    // Modales
    ordenSeleccionada: OrdenTrabajo | null = null;
    modalCreacionAbierto = false;
    guardandoOrden = false;
    clientesDisponibles: ClienteResumen[] = [];
    // Servicios activos del catálogo: lo único que se puede elegir al crear una orden.
    serviciosCatalogo: ServicioCatalogo[] = [];

    // Formulario de nueva orden
    formularioNuevaOrden = {
        idCliente: null as number | null,
        idServicio: null as number | null,
        observaciones: '',
    };

    constructor() {
        this.authService.syncFromActiveAccount();
    }

    ngOnInit(): void {
        this.cargarOrdenes();
        this.cargarClientes();
        this.cargarCatalogo();
    }

    get usuarioActual() {
        return this.authService.currentUser();
    }

    get rolActual(): AppRole {
        return this.usuarioActual?.role ?? 'CLIENTE';
    }

    /**
     * Filtra la lista de órdenes reactivamente por búsqueda, estado y rango de fechas.
     */
    get ordenesFiltradas(): OrdenTrabajo[] {
        const termino = this.terminoBusqueda.trim().toLowerCase();
        const desde = this.fechaDesde ? new Date(this.fechaDesde) : null;
        const hasta = this.fechaHasta ? new Date(`${this.fechaHasta}T23:59:59`) : null;

        return this.ordenes.filter((orden) => {
            const coincideId = orden.idOrdenTrabajo.toString().includes(termino);
            const coincideCliente = orden.cliente?.nombreCompleto?.toLowerCase().includes(termino) ?? false;
            const coincideServicio = orden.servicios?.some((s) =>
                this.nombreServicio(s.idServicio, s.descripcionManoObra).toLowerCase().includes(termino)) ?? false;
            const coincideTermino = !termino || coincideId || coincideCliente || coincideServicio;

            const coincideEstado = !this.filtroEstado || orden.estado === this.filtroEstado;

            const fecha = new Date(orden.fechaIngreso);
            const coincideDesde = !desde || fecha >= desde;
            const coincideHasta = !hasta || fecha <= hasta;

            return coincideTermino && coincideEstado && coincideDesde && coincideHasta;
        });
    }

    /**
     * Carga las órdenes desde el microservicio digitalfix-ms-workorders.
     */
    cargarOrdenes(): void {
        this.cargando = true;
        this.mensajeError = '';
        this.servicioOrdenes.listar().subscribe({
            next: (datos) => {
                this.ordenes = datos;
                this.cargando = false;
            },
            error: (err) => {
                this.mensajeError = 'No se pudo conectar con el microservicio de órdenes de trabajo.';
                this.cargando = false;
                console.error(err);
            },
        });
    }

    /**
     * Retorna la descripción del servicio principal o de las observaciones de la orden.
     */
    obtenerDescripcionServicio(orden: OrdenTrabajo): string {
        const primerServicio = orden.servicios?.[0];
        if (primerServicio) {
            return this.nombreServicio(primerServicio.idServicio, primerServicio.descripcionManoObra);
        }
        return orden.observaciones || 'Servicio técnico especializado';
    }

    // La orden guarda solo el ID del servicio (3FN): el nombre sale del catálogo. Si el
    // servicio ya no está en la lista cargada, se usa la descripción guardada en la orden.
    nombreServicio(idServicio: number, descripcion?: string | null): string {
        return this.serviciosCatalogo.find((s) => s.idServicio === idServicio)?.nombre
            ?? descripcion
            ?? `Servicio #${idServicio}`;
    }

    get servicioSeleccionado(): ServicioCatalogo | undefined {
        return this.serviciosCatalogo.find((s) => s.idServicio === this.formularioNuevaOrden.idServicio);
    }

    /**
     * Carga los servicios activos del catálogo para el selector de nueva orden.
     */
    cargarCatalogo(): void {
        this.catalogo.listar(true).subscribe({
            next: (servicios) => (this.serviciosCatalogo = servicios),
            error: (err) => console.warn('Error al cargar el catálogo de servicios:', err),
        });
    }

    /**
     * Carga el listado de clientes para poblar el selector en el modal de nueva orden.
     */
    cargarClientes(): void {
        this.servicioOrdenes.listarClientes().subscribe({
            next: (clientes) => {
                this.clientesDisponibles = clientes;
                if (clientes.length > 0 && !this.formularioNuevaOrden.idCliente) {
                    this.formularioNuevaOrden.idCliente = clientes[0].idCliente;
                }
            },
            error: (err) => console.warn('Error al cargar clientes:', err),
        });
    }

    // Permisos según el rol de usuario
    puedeOperar(): boolean {
        return hasRoleAccess(this.rolActual, ['SUPERVISOR', 'ADMIN']);
    }

    puedeCrearOrden(): boolean {
        return this.rolActual !== 'AUDITOR';
    }

    puedeCancelar(orden: OrdenTrabajo): boolean {
        return this.rolActual === 'CLIENTE' && orden.estado === 'CREADA';
    }

    siguienteAccion(orden: OrdenTrabajo): string | null {
        return this.puedeOperar() ? ETIQUETA_ACCION_SIGUIENTE_ORDEN[orden.estado] ?? null : null;
    }

    /**
     * Avanza el estado de la orden siguiendo la máquina de estados estricta del backend.
     */
    avanzarEstado(orden: OrdenTrabajo): void {
        const indice = FLUJO_ESTADOS_ORDEN.indexOf(orden.estado);
        if (indice < 0 || indice >= FLUJO_ESTADOS_ORDEN.length - 1) {
            return;
        }

        const nuevoEstado = FLUJO_ESTADOS_ORDEN[indice + 1];
        this.procesandoAccion = true;
        this.limpiarMensajes();

        this.servicioOrdenes.cambiarEstado(orden.idOrdenTrabajo, nuevoEstado).subscribe({
            next: (ordenActualizada) => {
                orden.estado = ordenActualizada.estado;
                orden.cuadrilla = ordenActualizada.cuadrilla ?? orden.cuadrilla;
                orden.fechaActualizacionEstado = ordenActualizada.fechaActualizacionEstado;
                this.mensajeExito = `Orden #${orden.idOrdenTrabajo} actualizada a "${this.etiquetaEstado[nuevoEstado]}" exitosamente.`;
                this.procesandoAccion = false;
            },
            error: (err) => {
                const mensajeBackend = err?.error?.mensaje ?? err?.error?.error ?? 'Error al cambiar estado.';
                this.mensajeError = `No se pudo cambiar el estado: ${mensajeBackend}`;
                this.procesandoAccion = false;
            },
        });
    }

    /**
     * Cancela una orden de trabajo (solo permitido en estado CREADA).
     */
    cancelarOrden(orden: OrdenTrabajo): void {
        if (!confirm(`¿Estás seguro de cancelar la orden #${orden.idOrdenTrabajo}?`)) {
            return;
        }
        this.procesandoAccion = true;
        this.limpiarMensajes();

        this.servicioOrdenes.cambiarEstado(orden.idOrdenTrabajo, 'CANCELADA').subscribe({
            next: (ordenActualizada) => {
                orden.estado = ordenActualizada.estado;
                this.mensajeExito = `Orden #${orden.idOrdenTrabajo} cancelada correctamente.`;
                this.procesandoAccion = false;
            },
            error: (err) => {
                this.mensajeError = 'No se pudo cancelar la orden de trabajo.';
                this.procesandoAccion = false;
            },
        });
    }

    // Modal de Creación de Orden
    abrirModalCreacion(): void {
        this.modalCreacionAbierto = true;
        this.limpiarMensajes();
        if (this.clientesDisponibles.length > 0 && !this.formularioNuevaOrden.idCliente) {
            this.formularioNuevaOrden.idCliente = this.clientesDisponibles[0].idCliente;
        }
    }

    cerrarModalCreacion(): void {
        this.modalCreacionAbierto = false;
        this.formularioNuevaOrden = {
            idCliente: this.clientesDisponibles[0]?.idCliente ?? null,
            idServicio: null,
            observaciones: '',
        };
    }

    guardarNuevaOrden(): void {
        if (!this.formularioNuevaOrden.idCliente) {
            this.mensajeError = 'Debes seleccionar un cliente válido.';
            return;
        }
        if (!this.formularioNuevaOrden.idServicio) {
            this.mensajeError = 'Debes seleccionar el servicio a realizar.';
            return;
        }

        this.guardandoOrden = true;
        const peticion: CrearOrdenTrabajoPeticion = {
            idCliente: this.formularioNuevaOrden.idCliente,
            observaciones: this.formularioNuevaOrden.observaciones.trim() || undefined,
            // Sin precio: el backend cobra la tarifa vigente del servicio elegido.
            servicios: [{ idServicio: this.formularioNuevaOrden.idServicio }],
        };

        this.servicioOrdenes.crear(peticion).subscribe({
            next: (creada) => {
                this.ordenes.unshift(creada);
                this.mensajeExito = `¡Orden #${creada.idOrdenTrabajo} creada con éxito!`;
                this.guardandoOrden = false;
                this.cerrarModalCreacion();
            },
            error: (err) => {
                this.mensajeError = mensajeDeError(err, 'registrar la orden');
                this.guardandoOrden = false;
            },
        });
    }

    // Modal de Detalle
    abrirDetalle(orden: OrdenTrabajo): void {
        this.ordenSeleccionada = orden;
        // Intenta refrescar el detalle completo desde el servidor
        this.servicioOrdenes.buscarPorId(orden.idOrdenTrabajo).subscribe({
            next: (detalle) => {
                this.ordenSeleccionada = detalle;
            },
            error: () => {
                // Si falla la consulta puntual, se conserva la copia cargada
            },
        });
    }

    cerrarModalDetalle(): void {
        this.ordenSeleccionada = null;
    }

    limpiarMensajes(): void {
        this.mensajeError = '';
        this.mensajeExito = '';
    }
}
