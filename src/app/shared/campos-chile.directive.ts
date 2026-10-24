import { Directive, ElementRef, forwardRef, inject, input } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, NgControl, ValidationErrors, Validator } from '@angular/forms';
import {
    capitalizarNombre,
    capitalizarPrimera,
    correoValido,
    formatearMiles,
    formatearRut,
    formatearTelefono,
    leerMiles,
    normalizarCorreo,
    normalizarTelefono,
    rutValido,
    telefonoValido,
} from './formato-chile';

// Directivas para inputs con ngModel: formatean mientras se escribe, entregan al modelo el
// valor normalizado y validan (el error queda en el control, ej. ctrl.errors?.['rut']).
// Funcionan junto a "required": un campo vacío no es inválido para estas directivas.

/** Base común: escribe en el <input> y avisa al formulario. */
abstract class CampoFormateado implements ControlValueAccessor {
    protected readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
    protected onChange: (valor: unknown) => void = () => {};
    onTouched: () => void = () => {};

    abstract writeValue(valor: unknown): void;

    registerOnChange(fn: (valor: unknown) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(deshabilitado: boolean): void {
        this.el.nativeElement.disabled = deshabilitado;
    }

    protected mostrar(texto: string): void {
        if (this.el.nativeElement.value !== texto) {
            this.el.nativeElement.value = texto;
        }
    }
}

/** RUT/RUN: muestra "12.345.678-5" mientras se escribe y valida el dígito verificador. */
@Directive({
    selector: 'input[appRut]',
    standalone: true,
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RutDirective), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => RutDirective), multi: true },
    ],
    host: {
        '(input)': 'alEscribir()',
        '(blur)': 'onTouched()',
        autocomplete: 'off',
        maxlength: '12',
        placeholder: '12.345.678-5',
    },
})
export class RutDirective extends CampoFormateado implements Validator {
    writeValue(valor: unknown): void {
        this.mostrar(formatearRut(valor as string));
    }

    alEscribir(): void {
        const formateado = formatearRut(this.el.nativeElement.value);
        this.mostrar(formateado);
        this.onChange(formateado);
    }

    validate(control: AbstractControl): ValidationErrors | null {
        return !control.value || rutValido(control.value) ? null : { rut: true };
    }
}

/** Teléfono chileno: muestra "+56 9 1234 5678" y entrega "+56912345678". */
@Directive({
    selector: 'input[appTelefono]',
    standalone: true,
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TelefonoDirective), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => TelefonoDirective), multi: true },
    ],
    host: {
        '(input)': 'alEscribir()',
        '(blur)': 'onTouched()',
        type: 'tel',
        inputmode: 'tel',
        autocomplete: 'tel',
        maxlength: '16',
        placeholder: '+56 9 1234 5678',
    },
})
export class TelefonoDirective extends CampoFormateado implements Validator {
    writeValue(valor: unknown): void {
        this.mostrar(formatearTelefono(valor as string));
    }

    alEscribir(): void {
        const escrito = this.el.nativeElement.value;
        this.mostrar(formatearTelefono(escrito));
        this.onChange(normalizarTelefono(escrito) || null);
    }

    validate(control: AbstractControl): ValidationErrors | null {
        return !control.value || telefonoValido(control.value) ? null : { telefono: true };
    }
}

/** Correo: sin espacios, en minúsculas al salir del campo, y con dominio válido (.cl, .com...). */
@Directive({
    selector: 'input[appCorreo]',
    standalone: true,
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CorreoDirective), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => CorreoDirective), multi: true },
    ],
    host: {
        '(input)': 'alEscribir()',
        '(blur)': 'alSalir()',
        type: 'email',
        inputmode: 'email',
        autocomplete: 'email',
        maxlength: '100',
        placeholder: 'nombre@empresa.cl',
    },
})
export class CorreoDirective extends CampoFormateado implements Validator {
    writeValue(valor: unknown): void {
        this.mostrar((valor as string) ?? '');
    }

    alEscribir(): void {
        const sinEspacios = this.el.nativeElement.value.replace(/\s/g, '');
        this.mostrar(sinEspacios);
        this.onChange(sinEspacios);
    }

    alSalir(): void {
        const normalizado = normalizarCorreo(this.el.nativeElement.value);
        this.mostrar(normalizado);
        this.onChange(normalizado);
        this.onTouched();
    }

    validate(control: AbstractControl): ValidationErrors | null {
        return !control.value || correoValido(control.value) ? null : { correo: true };
    }
}

/** Monto en pesos: muestra "15.000" mientras se escribe y entrega el número 15000. */
@Directive({
    selector: 'input[appPesos]',
    standalone: true,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PesosDirective), multi: true }],
    host: {
        '(input)': 'alEscribir()',
        '(blur)': 'onTouched()',
        inputmode: 'numeric',
        autocomplete: 'off',
        maxlength: '15',
        placeholder: '0',
    },
})
export class PesosDirective extends CampoFormateado {
    writeValue(valor: unknown): void {
        this.mostrar(formatearMiles(valor as number));
    }

    alEscribir(): void {
        const monto = leerMiles(this.el.nativeElement.value);
        this.mostrar(formatearMiles(monto));
        this.onChange(monto);
    }
}

/**
 * Mayúsculas de texto con ngModel: "primera" pone la primera letra en mayúscula mientras se escribe
 * (nombre de un servicio); "nombre" capitaliza cada palabra al salir si se escribió todo en
 * minúsculas o todo en mayúsculas (nombre de una persona).
 */
@Directive({
    selector: 'input[appCapitalizar]',
    standalone: true,
    host: { '(input)': 'alEscribir()', '(blur)': 'alSalir()' },
})
export class CapitalizarDirective {
    readonly modo = input<'primera' | 'nombre'>('primera', { alias: 'appCapitalizar' });
    private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
    private readonly control = inject(NgControl, { self: true });

    alEscribir(): void {
        if (this.modo() === 'primera') {
            this.aplicar(capitalizarPrimera(this.el.nativeElement.value));
        }
    }

    alSalir(): void {
        const valor = this.el.nativeElement.value;
        this.aplicar(this.modo() === 'nombre' ? capitalizarNombre(valor) : capitalizarPrimera(valor).trim());
    }

    private aplicar(valor: string): void {
        if (valor !== this.el.nativeElement.value) {
            this.el.nativeElement.value = valor;
        }
        if (valor !== this.control.value) {
            this.control.control?.setValue(valor);
        }
    }
}

export const CAMPOS_CHILE = [RutDirective, TelefonoDirective, CorreoDirective, PesosDirective, CapitalizarDirective] as const;
