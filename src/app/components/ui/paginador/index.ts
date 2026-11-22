import { PaginadorComponent } from './paginador.component';
import { PaginarPipe } from './paginar.pipe';

export { PaginadorComponent, TAMANOS_PAGINA } from './paginador.component';
export { PaginarPipe, paginaValida } from './paginar.pipe';

/** Paginador + pipe, para importar juntos en una pantalla con tabla. */
export const PAGINACION = [PaginadorComponent, PaginarPipe] as const;
