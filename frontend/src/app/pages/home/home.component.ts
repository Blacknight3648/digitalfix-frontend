import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { WorkOrderService } from '../../services/work-order.service';
import { AppRole, APP_ROLE_LABEL } from '../../model/user.model';
import {
    WorkOrder,
    WorkOrderStatus,
    WORK_ORDER_STATUS_FLOW,
    WORK_ORDER_STATUS_LABEL,
    WORK_ORDER_STATUS_CSS_CLASS,
    WORK_ORDER_NEXT_ACTION_LABEL,
} from '../../model/work-order.model';

@Component({
    standalone: true,
    selector: 'app-home',
    imports: [CommonModule, FormsModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly workOrderService = inject(WorkOrderService);

    readonly statuses: WorkOrderStatus[] = ['CREADA', 'ASIGNADA', 'EN_DESPLAZAMIENTO', 'EN_EJECUCION', 'CERRADA', 'CANCELADA'];
    readonly roleLabel = APP_ROLE_LABEL;
    readonly statusLabel = WORK_ORDER_STATUS_LABEL;
    readonly statusCssClass = WORK_ORDER_STATUS_CSS_CLASS;

    orders: WorkOrder[] = [];
    loading = false;
    errorMessage = '';

    searchTerm = '';
    statusFilter: WorkOrderStatus | '' = '';
    dateFrom = '';
    dateTo = '';
    selectedOrder: WorkOrder | null = null;

    // Estado del modal "Nueva orden" (digitalfix-ms-workorders solo pide
    // cliente/servicio/tecnico; el estado inicial CREADA lo pone el backend).
    showCreateModal = false;
    creating = false;
    createError = '';
    newCliente = '';
    newServicio = '';
    newTecnico = '';

    ngOnInit(): void {
        this.loadOrders();
    }

    loadOrders(): void {
        this.loading = true;
        this.errorMessage = '';
        this.workOrderService.getAll().subscribe({
            next: (orders) => {
                this.orders = orders;
                this.loading = false;
            },
            error: (err) => {
                console.error('[digitalfix-ms-workorders] Error al cargar órdenes:', err);
                this.loading = false;
                this.errorMessage =
                    'No se pudo cargar la lista de órdenes. Verifica que digitalfix-ms-workorders esté corriendo.';
            },
        });
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
    // (digitalfix-ms-workorders todavía no valida esta regla en el servidor;
    // ver la nota en WorkOrderService.updateStatus del backend.)
    advanceStatus(order: WorkOrder): void {
        const idx = WORK_ORDER_STATUS_FLOW.indexOf(order.estado);
        if (idx < 0 || idx >= WORK_ORDER_STATUS_FLOW.length - 1) {
            return;
        }

        const nuevo = WORK_ORDER_STATUS_FLOW[idx + 1];
        this.workOrderService.updateStatus(order.id, nuevo).subscribe({
            next: (actualizada) => this.replaceOrder(order, actualizada, nuevo),
            error: (err) => {
                console.error('[digitalfix-ms-workorders] Error al actualizar estado:', err);
                this.errorMessage = 'No se pudo actualizar el estado de la orden.';
            },
        });
    }

    cancelOrder(order: WorkOrder): void {
        this.workOrderService.cancel(order.id).subscribe({
            next: (actualizada) => this.replaceOrder(order, actualizada, 'CANCELADA'),
            error: (err) => {
                console.error('[digitalfix-ms-workorders] Error al cancelar la orden:', err);
                this.errorMessage = 'No se pudo cancelar la orden.';
            },
        });
    }

    openDetail(order: WorkOrder): void {
        this.selectedOrder = order;
    }

    closeModal(): void {
        this.selectedOrder = null;
    }

    onNuevaOrden(): void {
        this.createError = '';
        this.newCliente = '';
        this.newServicio = '';
        this.newTecnico = '';
        this.showCreateModal = true;
    }

    closeCreateModal(): void {
        this.showCreateModal = false;
    }

    submitCreateOrder(): void {
        if (!this.newCliente.trim() || !this.newServicio.trim()) {
            this.createError = 'Cliente y servicio son obligatorios.';
            return;
        }

        this.creating = true;
        this.createError = '';
        this.workOrderService
            .create({
                cliente: this.newCliente.trim(),
                servicio: this.newServicio.trim(),
                tecnico: this.newTecnico.trim() || undefined,
            })
            .subscribe({
                next: (creada) => {
                    this.orders = [creada, ...this.orders];
                    this.creating = false;
                    this.showCreateModal = false;
                },
                error: (err) => {
                    console.error('[digitalfix-ms-workorders] Error al crear la orden:', err);
                    this.creating = false;
                    this.createError = 'No se pudo crear la orden. Intenta de nuevo.';
                },
            });
    }

    // Reemplaza la orden en la lista local con la version que devolvio el
    // backend, y agrega una linea al timeline SOLO para esta sesion (no se
    // persiste: el historial real lo va a servir ms-digitalfix-audit).
    private replaceOrder(anterior: WorkOrder, actualizada: WorkOrder, nuevoEstado: WorkOrderStatus): void {
        const conTimeline: WorkOrder = {
            ...actualizada,
            timeline: [
                ...anterior.timeline,
                {
                    descripcion: `Estado actualizado a "${WORK_ORDER_STATUS_LABEL[nuevoEstado]}"`,
                    actor: `${this.roleLabel[this.currentRole]} · ${this.currentUser?.name ?? 'tú'}`,
                    fecha: new Date().toISOString(),
                },
            ],
        };
        this.orders = this.orders.map((o) => (o.id === anterior.id ? conTimeline : o));
        if (this.selectedOrder?.id === anterior.id) {
            this.selectedOrder = conTimeline;
        }
    }
}
