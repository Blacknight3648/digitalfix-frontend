import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** El código documentará funciones debido a que es
 * un proyecto para aprendizaje, no profesional.
 */
@Component({                //Este es un componente visual
  selector: 'app-root',     //Es como la etiqueta HTML que se usará para mostrar el componente o decir que cumple una función de index
  standalone: true,         //Esto indica que el componente es independiente y no necesita de un módulo para funcionar
  imports: [RouterOutlet],  //Esto indica que el componente necesita de otro componente para funcionar, en este caso el RouterOutlet que es el que permite mostrar las rutas (centraliza los componentes para lograr un buen desacoplamiento)
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('digital-fix');
}
