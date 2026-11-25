// Contratos de digitalfix-ms-report (vía BFF) y de la auditoría de accesos de ms-login.
// Las fechas de ms-report llegan como ISO-8601 UTC.

export type RangoReporte = 'last1h' | 'last24h' | 'last7d';

// GET /api/report/events y GET /api/report/orders/{id}/timeline
export interface EventoOrdenDto {
    id: number;
    eventId: string;
    eventType: string | null;
    orderId: number;
    previousStatus: string | null;
    newStatus: string;
    assignedTechnicianId: number | null;
    clientId: number | null;
    occurredAt: string;
    receivedAt: string | null;
    traceId: string | null;
}

// GET /api/report/summary?range=
export interface TramoReporteDto {
    start: string;
    created: number;
    closed: number;
    cancelled: number;
}

export interface ResumenReporteDto {
    range: RangoReporte;
    from: string;
    to: string;
    bucketMinutes: number;
    series: TramoReporteDto[];
    totals: {
        created: number;
        closed: number;
        cancelled: number;
        events: number;
        distinctOrders: number;
    };
    eventsByStatus: Record<string, number>;
    resolution: {
        samples: number;
        avgMinutes: number;
        p50Minutes: number;
        p90Minutes: number;
        maxMinutes: number;
    };
    topTechnicians: { technicianId: number; closed: number }[];
}

// GET /api/v1/audit/login (ms-login): últimos 50 eventos de acceso.
// registeredAt es LocalDateTime del servidor (UTC en Docker), sin zona.
export interface EventoAccesoDto {
    id: number;
    userEntraId: string;
    event: string;
    ipAddress: string | null;
    failureReason: string | null;
    registeredAt: string;
}
