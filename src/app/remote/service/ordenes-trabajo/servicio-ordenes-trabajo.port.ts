import { Observable } from 'rxjs';
import { OrdenTrabajo, CrearOrdenTrabajoPeticion, ActualizarObservacionesPeticion, ClienteResumen, AgregarRepuestoPeticion, CuadrillaDisponible } from '../../dto/orden-trabajo.dto';
import { EstadoOrden } from '@models/orden-trabajo.model';

/**
 * Puerto (contrato) de la gestión de órdenes de trabajo — Inversión de Dependencias.
 *
 * Las pantallas dependen de esta abstracción del dominio, no del cliente HTTP. Es una
 * clase abstracta y no una interface porque así sirve también de token de inyección
 * sin que el dominio importe Angular: app.config.ts decide la implementación
 * ({ provide: PuertoOrdenesTrabajo, useExisting: ServicioOrdenesTrabajo }).
 */
export abstract class PuertoOrdenesTrabajo {
    /**
     * Consulta las órdenes de trabajo disponibles, con filtros opcionales.
     */
    abstract listar(estado?: EstadoOrden, idCliente?: number): Observable<OrdenTrabajo[]>;

    /**
     * Obtiene el detalle completo de una orden de trabajo por su identificador.
     */
    abstract buscarPorId(id: number): Observable<OrdenTrabajo>;

    /**
     * Registra una nueva orden de trabajo en estado CREADA.
     */
    abstract crear(peticion: CrearOrdenTrabajoPeticion): Observable<OrdenTrabajo>;

    /**
     * Modifica las observaciones de una orden de trabajo no terminal.
     */
    abstract actualizarObservaciones(id: number, peticion: ActualizarObservacionesPeticion): Observable<OrdenTrabajo>;

    /**
     * Transiciona el estado de la orden de trabajo según la máquina de estados permitida.
     */
    abstract cambiarEstado(id: number, nuevoEstado: EstadoOrden): Observable<OrdenTrabajo>;

    /**
     * Asigna una cuadrilla de terreno a la orden de trabajo con bloqueo pesimista ACID.
     */
    abstract asignarCuadrilla(id: number, idCuadrilla: number): Observable<OrdenTrabajo>;

    /**
     * Asigna un técnico especialista al servicio de la orden.
     */
    abstract asignarTecnico(id: number, idDetalleServicio: number, idTecnico: number): Observable<OrdenTrabajo>;

    /**
     * Agrega un repuesto del catálogo a la orden; si ya está asignada, descuenta su stock.
     */
    abstract agregarRepuesto(id: number, peticion: AgregarRepuestoPeticion): Observable<OrdenTrabajo>;

    /**
     * Quita un repuesto de la orden; si ya estaba asignada, devuelve su stock.
     */
    abstract quitarRepuesto(id: number, idDetalle: number): Observable<OrdenTrabajo>;

    /**
     * Cuadrillas disponibles para asignar una orden en terreno.
     */
    abstract listarCuadrillasDisponibles(): Observable<CuadrillaDisponible[]>;

    /**
     * Elimina una orden de trabajo (solo permitido en estado CREADA).
     */
    abstract eliminar(id: number): Observable<void>;

    /**
     * Obtiene el listado de clientes registrados en el sistema para facilitar la selección.
     */
    abstract listarClientes(): Observable<ClienteResumen[]>;
}
