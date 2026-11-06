import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_URL } from '../api';
import { OrdenTrabajo, CrearOrdenTrabajoPeticion, ActualizarObservacionesPeticion, CambioEstadoPeticion, AsignarCuadrillaPeticion, AsignarTecnicoPeticion, ClienteResumen, AgregarRepuestoPeticion, CuadrillaDisponible } from '../../dto/orden-trabajo.dto';
import { EstadoOrden } from '@models/orden-trabajo.model';
import { PuertoOrdenesTrabajo } from './servicio-ordenes-trabajo.port';
import { ORDENES_DEMO_RESPALDO } from '@data/ordenes-demo.data';

@Injectable({
    providedIn: 'root',
})
export class ServicioOrdenesTrabajo implements PuertoOrdenesTrabajo {
    private readonly http = inject(HttpClient);

    // URL base del BFF (digitalfix-bff-gateway, puerto 8090 en local), que enruta a ms-workorders. Debe
    // venir de environment: es la misma que msal.config registra como recurso
    // protegido, así MsalInterceptor adjunta el Bearer token a estas llamadas.
    private readonly baseUrl = API_URL;
    private readonly rutaOrdenes = `${this.baseUrl}/api/ordenes-trabajo`;
    private readonly rutaClientes = `${this.baseUrl}/api/clientes`;
    private readonly rutaCuadrillas = `${this.baseUrl}/api/cuadrillas`;

    /**
     * Consulta el listado de órdenes de trabajo en el microservicio.
     */
    listar(estado?: EstadoOrden, idCliente?: number): Observable<OrdenTrabajo[]> {
        let params = new HttpParams();
        if (estado) {
            params = params.set('estado', estado);
        }
        if (idCliente) {
            params = params.set('idCliente', idCliente.toString());
        }

        return this.http.get<OrdenTrabajo[]>(this.rutaOrdenes, { params }).pipe(
            map((ordenes) => this.normalizarOrdenes(ordenes)),
            catchError((err) => {
                console.warn(
                    `[ServicioOrdenesTrabajo] Microservicio en ${this.baseUrl} no responde o dio error (${err.status}). Utilizando datos sincronizados de respaldo.`,
                    err
                );
                // Si el BFF o ms-workorders no responden, retornamos la copia local filtrada
                let filtradas = ORDENES_DEMO_RESPALDO.map((o) => ({ ...o }));
                if (estado) {
                    filtradas = filtradas.filter((o) => o.estado === estado);
                }
                if (idCliente) {
                    filtradas = filtradas.filter((o) => o.cliente.idCliente === idCliente);
                }
                return of(filtradas);
            })
        );
    }

    /**
     * Consulta el detalle de una orden de trabajo por su ID.
     */
    buscarPorId(id: number): Observable<OrdenTrabajo> {
        return this.http.get<OrdenTrabajo>(`${this.rutaOrdenes}/${id}`).pipe(
            map((orden) => this.normalizarOrden(orden)),
            catchError((err) => {
                console.warn(`[ServicioOrdenesTrabajo] Buscando orden #${id} en datos locales de respaldo:`, err);
                const encontrada = ORDENES_DEMO_RESPALDO.find((o) => o.idOrdenTrabajo === id);
                if (encontrada) {
                    return of({ ...encontrada });
                }
                return throwError(() => err);
            })
        );
    }

    /**
     * Crea una nueva orden de trabajo en el microservicio.
     * Una escritura nunca se simula: si el BFF no responde, el error llega a la pantalla
     * (la orden existe solo cuando el backend confirmó su transacción).
     */
    crear(peticion: CrearOrdenTrabajoPeticion): Observable<OrdenTrabajo> {
        return this.http.post<OrdenTrabajo>(this.rutaOrdenes, peticion).pipe(
            map((orden) => this.normalizarOrden(orden))
        );
    }

    /**
     * Actualiza las observaciones de una orden de trabajo existente.
     */
    actualizarObservaciones(id: number, peticion: ActualizarObservacionesPeticion): Observable<OrdenTrabajo> {
        return this.http.put<OrdenTrabajo>(`${this.rutaOrdenes}/${id}`, peticion).pipe(
            map((orden) => this.normalizarOrden(orden))
        );
    }

    /**
     * Cambia el estado de la orden de trabajo según la máquina de estados.
     * Sin respaldo local: el estado mostrado es siempre el que confirmó el backend.
     */
    cambiarEstado(id: number, nuevoEstado: EstadoOrden): Observable<OrdenTrabajo> {
        const body: CambioEstadoPeticion = { estado: nuevoEstado };
        return this.http.put<OrdenTrabajo>(`${this.rutaOrdenes}/${id}/estado`, body).pipe(
            map((orden) => this.normalizarOrden(orden))
        );
    }

    /**
     * Asigna una cuadrilla a la orden de trabajo.
     */
    asignarCuadrilla(id: number, idCuadrilla: number): Observable<OrdenTrabajo> {
        const body: AsignarCuadrillaPeticion = { idCuadrilla };
        return this.http.put<OrdenTrabajo>(`${this.rutaOrdenes}/${id}/cuadrilla`, body).pipe(
            map((orden) => this.normalizarOrden(orden))
        );
    }

    /**
     * Asigna un técnico especialista al servicio de la orden.
     */
    asignarTecnico(id: number, idDetalleServicio: number, idTecnico: number): Observable<OrdenTrabajo> {
        const body: AsignarTecnicoPeticion = { idTecnico };
        return this.http
            .put<OrdenTrabajo>(`${this.rutaOrdenes}/${id}/servicios/${idDetalleServicio}/tecnico`, body)
            .pipe(map((orden) => this.normalizarOrden(orden)));
    }

    /**
     * Agrega un repuesto del catálogo a la orden (descuenta stock si la orden ya está asignada).
     */
    agregarRepuesto(id: number, peticion: AgregarRepuestoPeticion): Observable<OrdenTrabajo> {
        return this.http.post<OrdenTrabajo>(`${this.rutaOrdenes}/${id}/repuestos`, peticion).pipe(
            map((orden) => this.normalizarOrden(orden))
        );
    }

    /**
     * Quita un repuesto de la orden (devuelve el stock si la orden ya estaba asignada).
     */
    quitarRepuesto(id: number, idDetalle: number): Observable<OrdenTrabajo> {
        return this.http.delete<OrdenTrabajo>(`${this.rutaOrdenes}/${id}/repuestos/${idDetalle}`).pipe(
            map((orden) => this.normalizarOrden(orden))
        );
    }

    /**
     * Cuadrillas en estado DISPONIBLE (las EN_TERRENO ya están asignadas a otra orden).
     */
    listarCuadrillasDisponibles(): Observable<CuadrillaDisponible[]> {
        return this.http.get<CuadrillaDisponible[]>(this.rutaCuadrillas, { params: { estado: 'DISPONIBLE' } });
    }

    /**
     * Elimina una orden de trabajo (solo si está en CREADA).
     */
    eliminar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.rutaOrdenes}/${id}`);
    }

    /**
     * Consulta la lista de clientes disponibles para el selector de nueva orden.
     */
    listarClientes(): Observable<ClienteResumen[]> {
        return this.http.get<any[]>(this.rutaClientes).pipe(
            map((clientes) =>
                clientes.map((c) => {
                    const nombreArmado = `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim();
                    const nombreFinal = c.nombreCompleto || nombreArmado || c.razonSocial || 'Cliente';
                    return {
                        idCliente: Number(c.idCliente ?? c.id),
                        rut: c.rut ?? '',
                        nombreCompleto: nombreFinal,
                    };
                })
            ),
            catchError(() => {
                // Fallback de clientes conocidos
                return of([
                    { idCliente: 1, rut: '76.123.456-7', nombreCompleto: 'Comercial Rojas Ltda.' },
                    { idCliente: 2, rut: '77.890.123-4', nombreCompleto: 'Ferretería Lo Prado' },
                    { idCliente: 3, rut: '78.456.789-0', nombreCompleto: 'Edificio Las Torres' },
                    { idCliente: 4, rut: '79.111.222-3', nombreCompleto: 'Panadería El Trigal' },
                    { idCliente: 5, rut: '80.333.444-5', nombreCompleto: 'Condominio Los Aromos' },
                ]);
            })
        );
    }

    /**
     * Asegura que los campos de la orden recibida tengan el formato y los valores por defecto requeridos.
     */
    private normalizarOrdenes(lista: any[]): OrdenTrabajo[] {
        if (!Array.isArray(lista)) {
            return [];
        }
        return lista.map((item) => this.normalizarOrden(item));
    }

    private normalizarOrden(orden: any): OrdenTrabajo {
        return {
            idOrdenTrabajo: Number(orden.idOrdenTrabajo ?? orden.id),
            cliente: {
                idCliente: Number(orden.cliente?.idCliente ?? 0),
                rut: orden.cliente?.rut ?? '',
                nombreCompleto: orden.cliente?.nombreCompleto ?? 'Cliente general',
            },
            cuadrilla: orden.cuadrilla ? {
                idCuadrilla: Number(orden.cuadrilla.idCuadrilla),
                nombre: orden.cuadrilla.nombre ?? 'Cuadrilla',
                idTecnicoLider: Number(orden.cuadrilla.idTecnicoLider ?? 0),
                estado: orden.cuadrilla.estado ?? 'DISPONIBLE',
                miembros: orden.cuadrilla.miembros ?? [],
            } : null,
            estado: orden.estado as EstadoOrden,
            observaciones: orden.observaciones ?? '',
            fechaIngreso: orden.fechaIngreso ?? orden.fechaCreacion ?? new Date().toISOString(),
            fechaActualizacionEstado: orden.fechaActualizacionEstado,
            fechaCierre: orden.fechaCierre,
            servicios: Array.isArray(orden.servicios) ? orden.servicios : [],
            repuestos: Array.isArray(orden.repuestos) ? orden.repuestos : [],
            totalManoObra: Number(orden.totalManoObra ?? 0),
            historial: orden.historial ?? [
                {
                    descripcion: `Estado actual: ${orden.estado}`,
                    actor: 'Sistema DigitalFix',
                    fecha: orden.fechaActualizacionEstado ?? orden.fechaIngreso ?? new Date().toISOString(),
                },
            ],
        };
    }
}
