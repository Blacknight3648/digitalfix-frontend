// src/app/config/pantalla-carga.ts

/**
 * Pantalla de carga de index.html (#df-carga). La activa un script inline
 * antes de que arranque Angular cuando se vuelve desde Microsoft o ya hay una
 * sesión en caché, para que no se vea el login prerenderizado mientras MSAL
 * procesa el regreso y el router entra a home. El login la oculta al terminar.
 */
export function ocultarPantallaCarga(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.classList.remove('df-cargando');
}
