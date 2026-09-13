import { Component } from '@angular/core';

@Component({
    standalone: true,
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
    selector: 'app',
})
export class HomeComponent {

    counter = 10;

    //método para incrementar el contador
    increaseby(value: number): void {
        this.counter += value;
    }

    //método para decrementar el contador
    decreaseby(value: number): void {
        this.counter -= value;
    }

    reset(): void {
        this.counter = 10;
    }
}
