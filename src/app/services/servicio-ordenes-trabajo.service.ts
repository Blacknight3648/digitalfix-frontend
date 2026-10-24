import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../environment/environment';
import {
    OrdenTrabajo,
    CrearOrdenTrabajoPeticion,
    ActualizarObservacionesPeticion,
    CambioEstadoPeticion,
    AsignarCuadrillaPeticion,
    AsignarTecnicoPeticion,
    EstadoOrden,
    ClienteResumen,
    AgregarRepuestoPeticion,
    CuadrillaDisponible,
} from '../model/orden-trabajo.model';
import { IServicioOrdenesTrabajo } from './servicio-ordenes-trabajo.interface';

// Fallback de demostración en caso de que el microservicio esté apagado en local
const ORDENES_DEMO_RESPALDO: OrdenTrabajo[] = [
    {
        idOrdenTrabajo: 1042,
        cliente: { idCliente: 1, rut: '76.123.456-7', nombreCompleto: 'Comercial Rojas Ltda.' },
        cuadrilla: null,
        estado: 'CREADA',
        observaciones: 'Revisión y diagnóstico de tablero eléctrico principal en sucursal.',
        fechaIngreso: '2026-09-12T09:10:00',
        servicios: [{ idDetalle: 1, idServicio: 101, idTecnico: null, descripcionManoObra: 'Revisión tablero eléctrico', precioManoObra: 45000 }],
        repuestos: [],
        totalManoObra: 45000,
        historial: [{ descripcion: 'Orden creada en el sistema', actor: 'Cliente · Comercial Rojas', fecha: '2026-09-12T09:10:00' }],
    },
    {
        idOrdenTrabajo: 1041,
        cliente: { idCliente: 2, rut: '77.890.123-4', nombreCompleto: 'Ferretería Lo Prado' },
        cuadrilla: { idCuadrilla: 1, nombre: 'Cuadrilla Alfa Terreno', idTecnicoLider: 12, estado: 'ASIGNADA', miembros: [12, 14] },
        estado: 'ASIGNADA',
        observaciones: 'Cambio urgente de interruptor termomagnético trifásico.',
        fechaIngreso: '2026-09-12T06:05:00',
        servicios: [{ idDetalle: 2, idServicio: 102, idTecnico: 12, descripcionManoObra: 'Cambio de breaker trifásico', precioManoObra: 65000 }],
        repuestos: [{ idDetalle: 1, idRepuesto: 201, idProveedor: 5, cantidadUtilizada: 1 }],
        totalManoObra: 65000,
        historial: [
            { descripcion: 'Orden creada en el sistema', actor: 'Cliente · Ferretería Lo Prado', fecha: '2026-09-12T06:05:00' },
            { descripcion: 'Cuadrilla Alfa Terreno asignada', actor: 'Supervisor de Operaciones', fecha: '2026-09-12T07:00:00' },
        ],
    },
    {
        idOrdenTrabajo: 1039,
        cliente: { idCliente: 3, rut: '78.456.789-0', nombreCompleto: 'Edificio Las Torres' },
        cuadrilla: { idCuadrilla: 2, nombre: 'Cuadrilla Beta Generadores', idTecnicoLider: 15, estado: 'EN_TRANSITO', miembros: [15, 16] },
        estado: 'EN_DESPLAZAMIENTO',
        observaciones: 'Mantención preventiva y pruebas de transferencia del generador diésel.',
        fechaIngreso: '2026-09-11T10:00:00',
        servicios: [{ idDetalle: 3, idServicio: 103, idTecnico: 15, descripcionManoObra: 'Mantención generador', precioManoObra: 85000 }],
        repuestos: [],
        totalManoObra: 85000,
        historial: [
            { descripcion: 'Orden creada', actor: 'Cliente · Las Torres', fecha: '2026-09-11T10:00:00' },
            { descripcion: 'Cuadrilla asignada', actor: 'Supervisor', fecha: '2026-09-11T11:30:00' },
            { descripcion: 'Técnico y cuadrilla en desplazamiento a terreno', actor: 'Sistema de Despacho', fecha: '2026-09-12T10:40:00' },
        ],
    },
    {
        idOrdenTrabajo: 1035,
        cliente: { idCliente: 4, rut: '79.111.222-3', nombreCompleto: 'Panadería El Trigal' },
        cuadrilla: { idCuadrilla: 1, nombre: 'Cuadrilla Alfa Terreno', idTecnicoLider: 12, estado: 'EN_LABOR', miembros: [12, 14] },
        estado: 'EN_EJECUCION',
        observaciones: 'Habilitación de enchufes industriales para nuevos hornos.',
        fechaIngreso: '2026-09-10T09:00:00',
        servicios: [{ idDetalle: 4, idServicio: 104, idTecnico: 12, descripcionManoObra: 'Instalación de enchufes industriales', precioManoObra: 55000 }],
        repuestos: [],
        totalManoObra: 55000,
        historial: [
            { descripcion: 'Orden creada', actor: 'Cliente · El Trigal', fecha: '2026-09-10T09:00:00' },
            { descripcion: 'Cuadrilla asignada', actor: 'Supervisor', fecha: '2026-09-10T09:40:00' },
            { descripcion: 'Desplazamiento iniciado', actor: 'Sistema', fecha: '2026-09-12T08:00:00' },
            { descripcion: 'Trabajos técnicos iniciados en faena', actor: 'Técnico Líder', fecha: '2026-09-12T10:10:00' },
        ],
    },
    {
        idOrdenTrabajo: 1020,
        cliente: { idCliente: 5, rut: '80.333.444-5', nombreCompleto: 'Condominio Los Aromos' },
        cuadrilla: { idCuadrilla: 3, nombre: 'Cuadrilla Gama Alta Tensión', idTecnicoLider: 18, estado: 'DISPONIBLE', miembros: [18] },
        estado: 'CERRADA',
        observaciones: 'Inspección termográfica de subestación y apriete de bornes completado satisfactoriamente.',
        fechaIngreso: '2026-09-07T09:00:00',
        fechaCierre: '2026-09-08T12:00:00',
        servicios: [{ idDetalle: 5, idServicio: 105, idTecnico: 18, descripcionManoObra: 'Revisión y protocolo subestación', precioManoObra: 120000 }],
        repuestos: [],
        totalManoObra: 120000,
        historial: [
            { descripcion: 'Orden creada', actor: 'Cliente · Los Aromos', fecha: '2026-09-07T09:00:00' },
            { descripcion: 'Cuadrilla asignada', actor: 'Supervisor', fecha: '2026-09-07T09:30:00' },
            { descripcion: 'Desplazamiento iniciado', actor: 'Sistema', fecha: '2026-09-08T09:00:00' },
            { descripcion: 'Trabajo iniciado', actor: 'Técnico', fecha: '2026-09-08T09:30:00' },
            { descripcion: 'Orden cerrada y certificada con informe', actor: 'Supervisor', fecha: '2026-09-08T12:00:00' },
        ],
    },
];

@Injectable({
    providedIn: 'root',
})
export class ServicioOrdenesTrabajo implements IServicioOrdenesTrabajo {
    private readonly http = inject(HttpClient);

    // URL base del BFF (digitalfix-bff-gateway, puerto 8090 en local), que enruta a ms-workorders. Debe
    // venir de environment: es la misma que msal.config registra como recurso
    // protegido, así MsalInterceptor adjunta el Bearer token a estas llamadas.
    private readonly baseUrl = environment.bffUrl;
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
                let filtradas = [...ORDENES_DEMO_RESPALDO];
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
                    return of(encontrada);
                }
                return throwError(() => err);
            })
        );
    }

    /**
     * Crea una nueva orden de trabajo en el microservicio.
     */
    crear(peticion: CrearOrdenTrabajoPeticion): Observable<OrdenTrabajo> {
        return this.http.post<OrdenTrabajo>(this.rutaOrdenes, peticion).pipe(
            map((orden) => this.normalizarOrden(orden)),
            catchError((err) => {
                // Solo sin conexión (status 0) se usa el respaldo local; un 400/409 del backend
                // es una respuesta real y debe llegar a la pantalla.
                if (!this.sinConexion(err)) {
                    return throwError(() => err);
                }
                console.warn(`[ServicioOrdenesTrabajo] Error al conectar con el backend para crear orden. Registrando en memoria local:`, err);
                // Respaldo optimista en memoria
                const nuevaOrden: OrdenTrabajo = {
                    idOrdenTrabajo: Math.floor(1000 + Math.random() * 9000),
                    cliente: {
                        idCliente: peticion.idCliente,
                        rut: '76.000.000-0',
                        nombreCompleto: `Cliente #${peticion.idCliente}`,
                    },
                    cuadrilla: null,
                    estado: 'CREADA',
                    observaciones: peticion.observaciones ?? '',
                    fechaIngreso: new Date().toISOString(),
                    servicios: (peticion.servicios ?? []).map((s, index) => ({
                        idDetalle: index + 1,
                        idServicio: s.idServicio,
                        idTecnico: s.idTecnico ?? null,
                        descripcionManoObra: s.descripcionManoObra ?? 'Servicio técnico',
                        precioManoObra: s.precioManoObra ?? 0,
                    })),
                    repuestos: [],
                    totalManoObra: (peticion.servicios ?? []).reduce((acc, curr) => acc + (curr.precioManoObra ?? 0), 0),
                    historial: [
                        {
                            descripcion: 'Orden creada en el portal',
                            actor: 'Usuario actual',
                            fecha: new Date().toISOString(),
                        },
                    ],
                };
                ORDENES_DEMO_RESPALDO.unshift(nuevaOrden);
                return of(nuevaOrden);
            })
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
     */
    cambiarEstado(id: number, nuevoEstado: EstadoOrden): Observable<OrdenTrabajo> {
        const body: CambioEstadoPeticion = { estado: nuevoEstado };
        return this.http.put<OrdenTrabajo>(`${this.rutaOrdenes}/${id}/estado`, body).pipe(
            map((orden) => this.normalizarOrden(orden)),
            catchError((err) => {
                // Un 409 (p. ej. "Stock insuficiente") no debe enmascararse como avance local.
                if (!this.sinConexion(err)) {
                    return throwError(() => err);
                }
                console.warn(`[ServicioOrdenesTrabajo] Transicionando estado localmente para orden #${id}:`, err);
                const encontrada = ORDENES_DEMO_RESPALDO.find((o) => o.idOrdenTrabajo === id);
                if (encontrada) {
                    encontrada.estado = nuevoEstado;
                    encontrada.historial = encontrada.historial ?? [];
                    encontrada.historial.push({
                        descripcion: `Estado avanzado a ${nuevoEstado}`,
                        actor: 'Operador del sistema',
                        fecha: new Date().toISOString(),
                    });
                    return of({ ...encontrada });
                }
                return throwError(() => err);
            })
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

    // status 0: el navegador no obtuvo respuesta (BFF caído, CORS, red). Cualquier otro status es
    // una respuesta real del backend.
    private sinConexion(err: any): boolean {
        return err?.status === 0;
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
