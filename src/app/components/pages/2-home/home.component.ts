import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService } from '@contexts/auth/auth.service';
import { AppRole, APP_ROLE_LABEL, hasRoleAccess } from '@models/user.model';
import { OrdenTrabajo, ClienteResumen, CrearOrdenTrabajoPeticion, CuadrillaDisponible, RepuestoOrdenTrabajo } from '@remote/dto/orden-trabajo.dto';
import { EstadoOrden, ETIQUETA_ESTADO_ORDEN, CLASE_CSS_ESTADO_ORDEN, FLUJO_ESTADOS_ORDEN, ETIQUETA_ACCION_SIGUIENTE_ORDEN } from '@models/orden-trabajo.model';
import { PuertoOrdenesTrabajo } from '@remote/service/ordenes-trabajo/servicio-ordenes-trabajo.port';
import { ServicioCatalogo } from '@remote/dto/catalogo-servicio.dto';
import { mensajeDeError } from '@utils/mensaje-error';
import { ServicioCatalogoServicios } from '@remote/service/catalogo/servicio-catalogo.service';
import { Repuesto } from '@remote/dto/repuesto.dto';
import { Proveedor } from '@remote/dto/directorio.dto';
import { ServicioRepuestos } from '@remote/service/catalogo/servicio-repuestos.service';
import { ServicioProveedores } from '@remote/service/directorio/servicio-proveedores.service';
import { PAGINACION } from '@components/ui/paginador';
import { NotificacionesService } from '@components/ui/notificaciones/notificaciones.service';
import { ConfirmacionService } from '@components/ui/confirmacion/confirmacion.service';

@Component({
    standalone: true,
    selector: 'app-home',
    imports: [CommonModule, FormsModule, ...PAGINACION],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly servicioOrdenes = inject(PuertoOrdenesTrabajo);
    private readonly catalogo = inject(ServicioCatalogoServicios);
    private readonly servicioRepuestos = inject(ServicioRepuestos);
    private readonly servicioProveedores = inject(ServicioProveedores);
    private readonly notificaciones = inject(NotificacionesService);
    private readonly confirmacion = inject(ConfirmacionService);

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
    readonly flujo = FLUJO_ESTADOS_ORDEN;
    readonly filasFantasma = [1, 2, 3, 4, 5];

    // Estado de la vista. mensajeError es solo el fallo de carga de la lista; el resultado
    // de las acciones se avisa con notificaciones flotantes.
    ordenes: OrdenTrabajo[] = [];
    cargando = false;
    procesandoAccion = false;
    mensajeError = '';

    // Filtros y paginación
    terminoBusqueda = '';
    filtroEstado: EstadoOrden | '' = '';
    fechaDesde = '';
    fechaHasta = '';
    pagina = 1;
    tamano = 10;

    // Modales
    ordenSeleccionada: OrdenTrabajo | null = null;
    modalCreacionAbierto = false;
    guardandoOrden = false;
    mensajeErrorCreacion = '';
    clientesDisponibles: ClienteResumen[] = [];
    // Servicios activos del catálogo: lo único que se puede elegir al crear una orden.
    serviciosCatalogo: ServicioCatalogo[] = [];

    // Formulario de nueva orden
    formularioNuevaOrden = {
        idCliente: null as number | null,
        idServicio: null as number | null,
        observaciones: '',
    };

    // Operación de la orden en el modal de detalle (Supervisor / Admin): asignar cuadrilla y
    // registrar repuestos. El stock vive en ms-catalog y se descuenta al asignar la orden.
    repuestosCatalogo: Repuesto[] = [];
    proveedoresProductos: Proveedor[] = [];
    cuadrillasDisponibles: CuadrillaDisponible[] = [];
    idCuadrillaElegida: number | null = null;
    formularioRepuesto = {
        idRepuesto: null as number | null,
        idProveedor: null as number | null,
        cantidad: 1 as number | null,
    };
    operandoDetalle = false;
    mensajeErrorDetalle = '';

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

    /** Cantidad de órdenes por estado, para los chips de filtro rápido. */
    get conteoPorEstado(): Record<EstadoOrden, number> {
        const conteo = Object.fromEntries(this.estadosDisponibles.map((e) => [e, 0])) as Record<EstadoOrden, number>;
        for (const orden of this.ordenes) {
            conteo[orden.estado] = (conteo[orden.estado] ?? 0) + 1;
        }
        return conteo;
    }

    get hayFiltros(): boolean {
        return !!(this.terminoBusqueda || this.filtroEstado || this.fechaDesde || this.fechaHasta);
    }

    filtrarEstado(estado: EstadoOrden | ''): void {
        this.filtroEstado = estado;
        this.pagina = 1;
    }

    limpiarFiltros(): void {
        this.terminoBusqueda = '';
        this.filtroEstado = '';
        this.fechaDesde = '';
        this.fechaHasta = '';
        this.pagina = 1;
    }

    /** Posición del estado en el flujo (para la barra de avance del detalle). */
    indiceEstado(orden: OrdenTrabajo): number {
        return FLUJO_ESTADOS_ORDEN.indexOf(orden.estado);
    }

    // Escape cierra el modal abierto (salvo que haya una confirmación encima: esa se cierra primero).
    @HostListener('document:keydown.escape')
    cerrarConEscape(): void {
        if (this.confirmacion.actual()) {
            return;
        }
        if (this.ordenSeleccionada) {
            this.cerrarModalDetalle();
        } else if (this.modalCreacionAbierto) {
            this.cerrarModalCreacion();
        }
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

        // Asignar exige técnico o cuadrilla (regla del backend): se elige en el detalle de la orden.
        if (orden.estado === 'CREADA') {
            this.abrirDetalle(orden);
            return;
        }

        const nuevoEstado = FLUJO_ESTADOS_ORDEN[indice + 1];
        this.procesandoAccion = true;

        this.servicioOrdenes.cambiarEstado(orden.idOrdenTrabajo, nuevoEstado).subscribe({
            next: (ordenActualizada) => {
                this.aplicarCambioEstado(orden.idOrdenTrabajo, ordenActualizada);
                this.notificaciones.exito(`Orden #${orden.idOrdenTrabajo} pasó a "${this.etiquetaEstado[ordenActualizada.estado]}".`);
                this.procesandoAccion = false;
            },
            error: (err) => {
                this.notificaciones.error(mensajeDeError(err, 'cambiar el estado de la orden'));
                this.procesandoAccion = false;
            },
        });
    }

    /**
     * Cancela una orden de trabajo (solo permitido en estado CREADA).
     */
    async cancelarOrden(orden: OrdenTrabajo): Promise<void> {
        const confirmada = await this.confirmacion.preguntar({
            titulo: `¿Cancelar la orden #${orden.idOrdenTrabajo}?`,
            mensaje: 'La orden quedará como cancelada y ya no se podrá asignar ni ejecutar.',
            confirmar: 'Cancelar orden',
            cancelar: 'Volver',
            peligro: true,
        });
        if (!confirmada) {
            return;
        }
        this.procesandoAccion = true;

        this.servicioOrdenes.cambiarEstado(orden.idOrdenTrabajo, 'CANCELADA').subscribe({
            next: (ordenActualizada) => {
                this.aplicarCambioEstado(orden.idOrdenTrabajo, ordenActualizada);
                this.notificaciones.exito(`Orden #${orden.idOrdenTrabajo} cancelada.`);
                this.procesandoAccion = false;
            },
            error: (err) => {
                this.notificaciones.error(mensajeDeError(err, 'cancelar la orden de trabajo'));
                this.procesandoAccion = false;
            },
        });
    }

    // Refleja un cambio de estado en la tabla y, si está abierta, en el detalle (que se
    // vuelve a consultar para traer el historial con el nuevo evento).
    private aplicarCambioEstado(id: number, actualizada: OrdenTrabajo): void {
        const combinar = (o: OrdenTrabajo): OrdenTrabajo => ({
            ...o,
            estado: actualizada.estado,
            cuadrilla: actualizada.cuadrilla ?? o.cuadrilla,
            fechaActualizacionEstado: actualizada.fechaActualizacionEstado,
        });
        this.ordenes = this.ordenes.map((o) => (o.idOrdenTrabajo === id ? combinar(o) : o));
        if (this.ordenSeleccionada?.idOrdenTrabajo === id) {
            this.ordenSeleccionada = combinar(this.ordenSeleccionada);
            this.servicioOrdenes.buscarPorId(id).subscribe({
                next: (detalle) => {
                    if (this.ordenSeleccionada?.idOrdenTrabajo === id) {
                        this.ordenSeleccionada = detalle;
                    }
                },
                error: () => {},
            });
        }
    }

    // Modal de Creación de Orden
    abrirModalCreacion(): void {
        this.modalCreacionAbierto = true;
        this.mensajeErrorCreacion = '';
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
        this.mensajeErrorCreacion = '';
        if (!this.formularioNuevaOrden.idCliente) {
            this.mensajeErrorCreacion = 'Debes seleccionar un cliente válido.';
            return;
        }
        if (!this.formularioNuevaOrden.idServicio) {
            this.mensajeErrorCreacion = 'Debes seleccionar el servicio a realizar.';
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
                // Nueva lista (no unshift) para que la tabla y los contadores se recalculen.
                this.ordenes = [creada, ...this.ordenes];
                this.filtroEstado = '';
                this.pagina = 1;
                this.notificaciones.exito(`Orden #${creada.idOrdenTrabajo} creada.`);
                this.guardandoOrden = false;
                this.cerrarModalCreacion();
            },
            error: (err) => {
                this.mensajeErrorCreacion = mensajeDeError(err, 'registrar la orden');
                this.guardandoOrden = false;
            },
        });
    }

    // Modal de Detalle
    abrirDetalle(orden: OrdenTrabajo): void {
        this.ordenSeleccionada = orden;
        this.mensajeErrorDetalle = '';
        if (this.puedeOperar()) {
            this.cargarDatosOperacion(orden);
        }
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

    // ---------------------------------------------------------------------
    // Operación de la orden: cuadrilla y repuestos (stock en ms-catalog)
    // ---------------------------------------------------------------------

    esEditable(orden: OrdenTrabajo): boolean {
        return orden.estado !== 'CERRADA' && orden.estado !== 'CANCELADA';
    }

    // Desde ASIGNADA los repuestos de la orden ya están descontados del stock.
    stockComprometido(orden: OrdenTrabajo): boolean {
        return orden.estado !== 'CREADA' && orden.estado !== 'CANCELADA';
    }

    // La orden guarda solo el ID del repuesto: el código y el nombre salen del catálogo.
    nombreRepuesto(rep: RepuestoOrdenTrabajo): string {
        const repuesto = this.repuestosCatalogo.find((r) => r.idRepuesto === rep.idRepuesto);
        return repuesto ? `${repuesto.codigo} · ${repuesto.nombre}` : `Repuesto #${rep.idRepuesto}`;
    }

    nombreProveedor(idProveedor: number): string {
        return this.proveedoresProductos.find((p) => p.idProveedor === idProveedor)?.razonSocial ?? `Proveedor #${idProveedor}`;
    }

    get repuestoElegido(): Repuesto | undefined {
        return this.repuestosCatalogo.find((r) => r.idRepuesto === this.formularioRepuesto.idRepuesto);
    }

    private cargarDatosOperacion(orden: OrdenTrabajo): void {
        // Stock siempre fresco: otra orden pudo haberlo consumido.
        this.servicioRepuestos.listar(true).subscribe({
            next: (repuestos) => (this.repuestosCatalogo = repuestos),
            error: (err) => console.warn('Error al cargar los repuestos del catálogo:', err),
        });
        if (!this.proveedoresProductos.length) {
            this.servicioProveedores.listarPorTipo('PRODUCTOS').subscribe({
                next: (proveedores) => {
                    this.proveedoresProductos = proveedores;
                    this.formularioRepuesto.idProveedor ??= proveedores[0]?.idProveedor ?? null;
                },
                error: (err) => console.warn('Error al cargar proveedores de productos:', err),
            });
        }
        this.cuadrillasDisponibles = [];
        this.idCuadrillaElegida = null;
        if (orden.estado === 'CREADA') {
            this.servicioOrdenes.listarCuadrillasDisponibles().subscribe({
                next: (cuadrillas) => {
                    this.cuadrillasDisponibles = cuadrillas;
                    this.idCuadrillaElegida = cuadrillas[0]?.idCuadrilla ?? null;
                },
                error: (err) => console.warn('Error al cargar cuadrillas:', err),
            });
        }
    }

    asignarCuadrilla(orden: OrdenTrabajo): void {
        if (!this.idCuadrillaElegida) {
            return;
        }
        const conRepuestos = orden.repuestos.length > 0;
        this.ejecutarEnDetalle(
            this.servicioOrdenes.asignarCuadrilla(orden.idOrdenTrabajo, this.idCuadrillaElegida),
            'asignar la cuadrilla',
            (actualizada) => `Orden asignada a ${actualizada.cuadrilla?.nombre ?? 'la cuadrilla'}.`
                + (conRepuestos ? ' Se descontó el stock de sus repuestos.' : ''),
        );
    }

    agregarRepuesto(orden: OrdenTrabajo): void {
        const { idRepuesto, idProveedor, cantidad } = this.formularioRepuesto;
        if (!idRepuesto || !idProveedor || !cantidad || cantidad < 1) {
            this.mensajeErrorDetalle = 'Elige el repuesto, el proveedor y una cantidad mayor a cero.';
            return;
        }
        const codigo = this.repuestoElegido?.codigo ?? `#${idRepuesto}`;
        const descuentaAhora = this.stockComprometido(orden);
        this.ejecutarEnDetalle(
            this.servicioOrdenes.agregarRepuesto(orden.idOrdenTrabajo, { idRepuesto, idProveedor, cantidad }),
            'agregar el repuesto',
            () => descuentaAhora
                ? `Se agregaron ${cantidad} de ${codigo} y se descontaron del stock.`
                : `Se agregaron ${cantidad} de ${codigo}; el stock se descuenta al asignar la orden.`,
            () => (this.formularioRepuesto = { ...this.formularioRepuesto, idRepuesto: null, cantidad: 1 }),
        );
    }

    async quitarRepuesto(orden: OrdenTrabajo, rep: RepuestoOrdenTrabajo): Promise<void> {
        const aviso = this.stockComprometido(orden) ? ' Las unidades vuelven al stock.' : '';
        const confirmada = await this.confirmacion.preguntar({
            titulo: '¿Quitar el repuesto?',
            mensaje: `Se quita ${this.nombreRepuesto(rep)} de la orden #${orden.idOrdenTrabajo}.${aviso}`,
            confirmar: 'Quitar',
            peligro: true,
        });
        if (!confirmada) {
            return;
        }
        this.ejecutarEnDetalle(
            this.servicioOrdenes.quitarRepuesto(orden.idOrdenTrabajo, rep.idDetalle),
            'quitar el repuesto',
            () => `Repuesto quitado.${aviso}`,
        );
    }

    // Ejecuta una operación sobre la orden abierta y refleja el resultado en el detalle y en la
    // tabla. Los errores (p. ej. 409 "Stock insuficiente para REP-0006...") se muestran en el modal.
    private ejecutarEnDetalle(
        solicitud: Observable<OrdenTrabajo>,
        accion: string,
        mensajeExito: (actualizada: OrdenTrabajo) => string,
        alTerminar?: () => void,
    ): void {
        this.operandoDetalle = true;
        this.mensajeErrorDetalle = '';
        solicitud.subscribe({
            next: (actualizada) => {
                this.operandoDetalle = false;
                this.ordenSeleccionada = actualizada;
                this.ordenes = this.ordenes.map((o) => o.idOrdenTrabajo === actualizada.idOrdenTrabajo ? actualizada : o);
                this.notificaciones.exito(mensajeExito(actualizada));
                alTerminar?.();
                this.cargarDatosOperacion(actualizada);
            },
            error: (err) => {
                this.operandoDetalle = false;
                this.mensajeErrorDetalle = mensajeDeError(err, accion);
            },
        });
    }
}
