import { Component, OnInit, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { Comuna, DireccionFormulario, Region, enlaceGoogleMaps } from '../../model/ubicacion.model';
import { ServicioUbicaciones } from '../../services/servicio-ubicaciones.service';

// Campos de dirección con el formato habitual en Chile: región → comuna → calle y número.
// Se usa dentro del <form> del modal (sus campos se registran en ese NgForm, así el botón
// Guardar queda deshabilitado mientras la dirección esté incompleta).
@Component({
    standalone: true,
    selector: 'app-direccion-campos',
    imports: [CommonModule, FormsModule],
    templateUrl: './direccion-campos.component.html',
    styleUrl: '../../pages/shared/mantenedor.css',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class DireccionCamposComponent implements OnInit {
    private readonly ubicaciones = inject(ServicioUbicaciones);

    // Objeto del formulario del padre; se edita en el lugar.
    readonly direccion = input.required<DireccionFormulario>();

    // Atajo para el template: [(ngModel)] necesita un destino asignable.
    get d(): DireccionFormulario {
        return this.direccion();
    }

    regiones: Region[] = [];
    comunas: Comuna[] = [];
    cargandoComunas = false;
    errorCatalogo = '';

    ngOnInit(): void {
        this.ubicaciones.listarRegiones().subscribe({
            next: (regiones) => (this.regiones = regiones),
            error: () => (this.errorCatalogo = 'No se pudieron cargar las regiones.'),
        });
        if (this.direccion().idRegion) {
            this.cargarComunas(this.direccion().idRegion!);
        }
    }

    alCambiarRegion(idRegion: number | null): void {
        this.direccion().idComuna = null;
        this.comunas = [];
        if (idRegion) {
            this.cargarComunas(idRegion);
        }
    }

    // Código postal de Correos de Chile: solo 7 dígitos.
    alEscribirCodigoPostal(valor: string): void {
        this.direccion().codigoPostal = valor.replace(/\D/g, '').slice(0, 7);
    }

    get completaParaMapa(): boolean {
        const d = this.direccion();
        return !!(d.calle.trim() && d.numero.trim() && d.idComuna);
    }

    get enlaceMapa(): string {
        const d = this.direccion();
        const comuna = this.comunas.find((c) => c.idComuna === d.idComuna)?.nombre ?? '';
        const region = this.regiones.find((r) => r.idRegion === d.idRegion)?.nombre ?? '';
        return enlaceGoogleMaps([`${d.calle} ${d.numero}`, comuna, region].filter(Boolean).join(', '));
    }

    private cargarComunas(idRegion: number): void {
        this.cargandoComunas = true;
        this.ubicaciones.listarComunas(idRegion).subscribe({
            next: (comunas) => {
                this.comunas = comunas;
                this.cargandoComunas = false;
            },
            error: () => {
                this.errorCatalogo = 'No se pudieron cargar las comunas.';
                this.cargandoComunas = false;
            },
        });
    }
}
