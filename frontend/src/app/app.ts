import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

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
  private readonly router = inject(Router);

  constructor() {
    // Una respuesta real de Microsoft siempre llega con una carga completa de la
    // página y se procesa en main.ts antes de arrancar Angular. Si el router
    // termina una navegación con #...state=... (p. ej. el autocompletado del
    // navegador estando ya en la app), es una URL vieja: se quita de la barra
    // de direcciones para que la app nunca quede con un login a medias.
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const tree = this.router.parseUrl(event.urlAfterRedirects);
        if (tree.fragment && new URLSearchParams(tree.fragment).has('state')) {
          tree.fragment = null;
          this.router.navigateByUrl(tree, { replaceUrl: true });
        }
      });
  }
}
