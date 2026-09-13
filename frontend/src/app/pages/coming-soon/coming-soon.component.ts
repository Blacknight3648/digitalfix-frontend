import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

// Página de relleno para las rutas del caso que todavía no tienen
// microservicio ni pantalla propia (dashboard, catalog, reports, audit).
// El título y la descripción vienen de "data" en app.routes.ts.
@Component({
    standalone: true,
    selector: 'app-coming-soon',
    templateUrl: './coming-soon.component.html',
    styleUrl: './coming-soon.component.css',
})
export class ComingSoonComponent {
    private readonly route = inject(ActivatedRoute);

    readonly title: string = this.route.snapshot.data['title'] ?? 'Próximamente';
    readonly description: string =
        this.route.snapshot.data['description'] ?? 'Esta sección está en construcción.';
}
