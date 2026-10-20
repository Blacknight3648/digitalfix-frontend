import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
    OrdenTrabajo,
    CrearOrdenTrabajoPeticion,
    ActualizarObservacionesPeticion,
    EstadoOrden,
    ClienteResumen,
} from '../model/orden-trabajo.model';

/**
 * Contrato de servicio para la gestión de órdenes de trabajo (DIP / ISP)
 * Desacopla la lógica de presentación de la capa de transporte HTTP.
 */
export interface IServicioOrdenesTrabajo {
    /**
     * Consulta las órdenes de trabajo disponibles, con filtros opcionales.
     */
    listar(estado?: EstadoOrden, idCliente?: number): Observable<OrdenTrabajo[]>;

    /**
     * Obtiene el detalle completo de una orden de trabajo por su identificador.
     */
    buscarPorId(id: number): Observable<OrdenTrabajo>;

    /**
     * Registra una nueva orden de trabajo en estado CREADA.
     */
    crear(peticion: CrearOrdenTrabajoPeticion): Observable<OrdenTrabajo>;

    /**
     * Modifica las observaciones de una orden de trabajo no terminal.
     */
    actualizarObservaciones(id: number, peticion: ActualizarObservacionesPeticion): Observable<OrdenTrabajo>;

    /**
     * Transiciona el estado de la orden de trabajo según la máquina de estados permitida.
     */
    cambiarEstado(id: number, nuevoEstado: EstadoOrden): Observable<OrdenTrabajo>;

    /**
     * Asigna una cuadrilla de terreno a la orden de trabajo con bloqueo pesimista ACID.
     */
    asignarCuadrilla(id: number, idCuadrilla: number): Observable<OrdenTrabajo>;

    /**
     * Asigna un técnico especialista al servicio de la orden.
     */
    asignarTecnico(id: number, idDetalleServicio: number, idTecnico: number): Observable<OrdenTrabajo>;

    /**
     * Elimina una orden de trabajo (solo permitido en estado CREADA).
     */
    eliminar(id: number): Observable<void>;

    /**
     * Obtiene el listado de clientes registrados en el sistema para facilitar la selección.
     */
    listarClientes(): Observable<ClienteResumen[]>;
}

/**
 * Token de inyección para el servicio de órdenes de trabajo (Dependency Inversion Principle)
 */
export const SERVICIO_ORDENES_TRABAJO = new InjectionToken<IServicioOrdenesTrabajo>(
    'SERVICIO_ORDENES_TRABAJO'
);
