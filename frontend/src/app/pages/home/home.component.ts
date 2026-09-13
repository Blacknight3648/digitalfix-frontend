import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AppRole, APP_ROLE_LABEL } from '../../model/user.model';
import {
    WorkOrder,
    WorkOrderStatus,
    WORK_ORDER_STATUS_FLOW,
    WORK_ORDER_STATUS_LABEL,
    WORK_ORDER_STATUS_CSS_CLASS,
    WORK_ORDER_NEXT_ACTION_LABEL,
} from '../../model/work-order.model';

// Datos de ejemplo mientras ms-digitalfix-workorders no está disponible.
// Reemplazar por un WorkOrderService que consuma GET /api/workorders.
const MOCK_WORK_ORDERS: WorkOrder[] = [
    {
        id: '1042', cliente: 'Comercial Rojas Ltda.', servicio: 'Revisión tablero eléctrico',
        tecnico: null, estado: 'CREADA', fechaCreacion: '2026-09-12T09:10:00',
        timeline: [{ descripcion: 'Orden creada', actor: 'Cliente · Comercial Rojas', fecha: '2026-09-12T09:10:00' }],
    },
    {
        id: '1041', cliente: 'Ferretería Lo Prado', servicio: 'Cambio de breaker trifásico',
        tecnico: 'P. Muñoz', estado: 'ASIGNADA', fechaCreacion: '2026-09-12T06:05:00',
        timeline: [
            { descripcion: 'Orden creada', actor: 'Cliente · Ferretería Lo Prado', fecha: '2026-09-12T06:05:00' },
            { descripcion: 'Técnico asignado: P. Muñoz', actor: 'Supervisor · A. Vidal', fecha: '2026-09-12T07:00:00' },
        ],
    },
    {
        id: '1039', cliente: 'Edificio Las Torres', servicio: 'Mantención generador',
        tecnico: 'R. Soto', estado: 'EN_DESPLAZAMIENTO', fechaCreacion: '2026-09-11T10:00:00',
        timeline: [
            { descripcion: 'Orden creada', actor: 'Cliente · Las Torres', fecha: '2026-09-11T10:00:00' },
            { descripcion: 'Técnico asignado: R. Soto', actor: 'Supervisor · A. Vidal', fecha: '2026-09-11T11:30:00' },
            { descripcion: 'Técnico en camino', actor: 'Sistema', fecha: '2026-09-12T10:40:00' },
        ],
    },
    {
        id: '1035', cliente: 'Panadería El Trigal', servicio: 'Instalación de enchufes',
        tecnico: 'C. Fuentes', estado: 'EN_EJECUCION', fechaCreacion: '2026-09-10T09:00:00',
        timeline: [
            { descripcion: 'Orden creada', actor: 'Cliente · El Trigal', fecha: '2026-09-10T09:00:00' },
            { descripcion: 'Técnico asignado: C. Fuentes', actor: 'Supervisor · M. Rojas', fecha: '2026-09-10T09:40:00' },
            { descripcion: 'Técnico en camino', actor: 'Sistema', fecha: '2026-09-12T08:00:00' },
            { descripcion: 'Trabajo iniciado en terreno', actor: 'Técnico · C. Fuentes', fecha: '2026-09-12T10:10:00' },
        ],
    },
    {
        id: '1020', cliente: 'Condominio Los Aromos', servicio: 'Revisión de subestación',
        tecnico: 'P. Muñoz', estado: 'CERRADA', fechaCreacion: '2026-09-07T09:00:00',
        timeline: [
            { descripcion: 'Orden creada', actor: 'Cliente · Los Aromos', fecha: '2026-09-07T09:00:00' },
            { descripcion: 'Técnico asignado: P. Muñoz', actor: 'Supervisor · A. Vidal', fecha: '2026-09-07T09:30:00' },
            { descripcion: 'Técnico en camino', actor: 'Sistema', fecha: '2026-09-08T09:00:00' },
            { descripcion: 'Trabajo iniciado', actor: 'Técnico · P. Muñoz', fecha: '2026-09-08T09:30:00' },
            { descripcion: 'Orden cerrada', actor: 'Supervisor · A. Vidal', fecha: '2026-09-08T12:00:00' },
        ],
    },
    {
        id: '1018', cliente: 'Café Bellavista', servicio: 'Cambio de luminarias LED',
        tecnico: null, estado: 'CANCELADA', fechaCreacion: '2026-09-06T09:00:00',
        timeline: [
            { descripcion: 'Orden creada', actor: 'Cliente · Café Bellavista', fecha: '2026-09-06T09:00:00' },
            { descripcion: 'Orden cancelada por el cliente', actor: 'Cliente', fecha: '2026-09-06T09:20:00' },
        ],
    },
];

@Component({
    standalone: true,
    selector: 'app-home',
    imports: [CommonModule, FormsModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
})
export class HomeComponent {
    private readonly authService = inject(AuthService);

    readonly statuses: WorkOrderStatus[] = ['CREADA', 'ASIGNADA', 'EN_DESPLAZAMIENTO', 'EN_EJECUCION', 'CERRADA', 'CANCELADA'];
    readonly roleLabel = APP_ROLE_LABEL;
    readonly statusLabel = WORK_ORDER_STATUS_LABEL;
    readonly statusCssClass = WORK_ORDER_STATUS_CSS_CLASS;

    orders: WorkOrder[] = MOCK_WORK_ORDERS;

    searchTerm = '';
    statusFilter: WorkOrderStatus | '' = '';
    dateFrom = '';
    dateTo = '';
    selectedOrder: WorkOrder | null = null;

    constructor() {
        // Por si se entra directo a /home con una sesión de MSAL ya activa en cache
        // (por ejemplo al recargar la página), sin pasar de nuevo por el login.
        this.authService.syncFromActiveAccount();
    }

    get currentUser() {
        return this.authService.currentUser();
    }

    get currentRole(): AppRole {
        return this.currentUser?.role ?? 'ADMIN';
    }

    get filteredOrders(): WorkOrder[] {
        const term = this.searchTerm.trim().toLowerCase();
        const from = this.dateFrom ? new Date(this.dateFrom) : null;
        const to = this.dateTo ? new Date(`${this.dateTo}T23:59:59`) : null;

        return this.orders.filter((order) => {
            const matchesTerm = !term || order.cliente.toLowerCase().includes(term) || order.id.includes(term);
            const matchesStatus = !this.statusFilter || order.estado === this.statusFilter;
            const fecha = new Date(order.fechaCreacion);
            const matchesFrom = !from || fecha >= from;
            const matchesTo = !to || fecha <= to;
            return matchesTerm && matchesStatus && matchesFrom && matchesTo;
        });
    }

    canOperate(): boolean {
        return this.currentRole === 'SUPERVISOR' || this.currentRole === 'ADMIN';
    }

    canCreateOrder(): boolean {
        return this.currentRole !== 'AUDITOR';
    }

    nextActionFor(order: WorkOrder): string | null {
        return this.canOperate() ? WORK_ORDER_NEXT_ACTION_LABEL[order.estado] ?? null : null;
    }

    canCancel(order: WorkOrder): boolean {
        return this.currentRole === 'CLIENTE' && order.estado === 'CREADA';
    }

    // Regla del caso: no se puede pasar a EN_EJECUCION sin ASIGNAR antes;
    // por eso el avance siempre es al siguiente estado del flujo, nunca salta uno.
    advanceStatus(order: WorkOrder): void {
        const idx = WORK_ORDER_STATUS_FLOW.indexOf(order.estado);
        if (idx < 0 || idx >= WORK_ORDER_STATUS_FLOW.length - 1) {
            return;
        }

        const nuevo = WORK_ORDER_STATUS_FLOW[idx + 1];
        order.estado = nuevo;
        if (nuevo === 'ASIGNADA' && !order.tecnico) {
            order.tecnico = 'Por confirmar';
        }
        order.timeline.push({
            descripcion: `Estado actualizado a "${WORK_ORDER_STATUS_LABEL[nuevo]}"`,
            actor: `${this.roleLabel[this.currentRole]} · ${this.currentUser?.name ?? 'tú'}`,
            fecha: new Date().toISOString(),
        });
    }

    cancelOrder(order: WorkOrder): void {
        order.estado = 'CANCELADA';
        order.timeline.push({
            descripcion: 'Orden cancelada por el cliente',
            actor: `Cliente · ${this.currentUser?.name ?? 'tú'}`,
            fecha: new Date().toISOString(),
        });
    }

    openDetail(order: WorkOrder): void {
        this.selectedOrder = order;
    }

    closeModal(): void {
        this.selectedOrder = null;
    }

    onNuevaOrden(): void {
        // Placeholder hasta que exista el formulario real de creación de orden.
        if (typeof window !== 'undefined') {
            window.alert('Abriría el formulario de nueva orden');
        }
    }
}
