# Arquitectura del frontend DigitalFix

El código de `src/app` se organiza en capas. Cada capa solo puede depender de las que están **debajo** de ella:

```text
features   ─┐  Pantallas (una carpeta por pantalla)
layout     ─┤  Marco de la app: sidebar, topbar, menú por rol
shared     ─┤  Piezas reutilizables sin lógica de negocio propia
            ▼
data           Acceso a datos: servicios HTTP hacia el BFF
            ▼
domain         Modelos, reglas de negocio y puertos (contratos)
core           Transversal: sesión (MSAL), guards, configuración
```

| Capa | Contiene | Puede importar |
| --- | --- | --- |
| `domain/` | `models/` (tipos y reglas puras, ej. flujo de estados de una orden), `ports/` (contratos abstractos) | nada de la app, ni Angular |
| `core/` | `auth/` (MSAL, AuthService, guards), `config/` (environment, pantalla de carga) | `domain` |
| `data/` | `services/` (un servicio por recurso del BFF), `mocks/` (datos de demostración de solo lectura) | `domain`, `core` |
| `shared/` | `components/`, `directives/`, `pipes/`, `utils/` | `domain`, `data`, `core` |
| `layout/` | shell de la aplicación | `shared`, `data`, `domain`, `core` |
| `features/` | pantallas | todas las anteriores |

## Cómo importar

- **Entre capas**, siempre con alias: `@core/…`, `@domain/…`, `@data/…`, `@shared/…`, `@layout/…`, `@features/…` (definidos en `tsconfig.json`).
- **Dentro de una misma capa**, con rutas relativas (`./`, `../`).

Ejemplo: `import { PuertoOrdenesTrabajo } from '@domain/ports/servicio-ordenes-trabajo.port';`

## Estilos (CSS unificado)

```text
src/styles.scss              única entrada global (angular.json)
src/styles/_tokens.scss      colores y estados (variables CSS)
src/styles/_base.scss        reset y tipografía
src/styles/_components.scss  tarjeta, botones, alertas, tabla, modal, formularios, badges
```

- Un componente **no** vuelve a declarar estilos que ya están en `styles/`: su CSS propio queda solo para lo exclusivo de esa pantalla (ej. `home.component.css` para el detalle de una orden).
- Si un estilo se repite en dos pantallas, se mueve a `_components.scss`.
- Los colores se usan siempre como `var(--token)`.

## Principios SOLID aplicados

- **Responsabilidad única (S)**: cada servicio de `data/` agrupa las llamadas al BFF de un área (órdenes, clientes, catálogo…); los datos de demostración viven aparte (`data/mocks/`), no dentro del servicio HTTP; los estilos compartidos están en un solo lugar.
- **Abierto/cerrado (O)**: las pantallas nuevas se agregan en `features/` y en `app.routes.ts`, sin modificar las capas inferiores.
- **Sustitución de Liskov (L)**: `ServicioOrdenesTrabajo` cumple el contrato `PuertoOrdenesTrabajo` completo, así que cualquier implementación que lo cumpla (HTTP real, un mock para pruebas) puede reemplazarla.
- **Segregación de interfaces (I)**: cada puerto o servicio expone solo las operaciones de su recurso.
- **Inversión de dependencias (D)**: la pantalla de Órdenes depende del puerto `PuertoOrdenesTrabajo` (dominio), no del cliente HTTP. `app.config.ts` decide la implementación:
  `{ provide: PuertoOrdenesTrabajo, useExisting: ServicioOrdenesTrabajo }`.

## ACID

ACID es una garantía de las **transacciones de base de datos** y se cumple en el backend: `@Transactional` en los servicios de ms-workorders y ms-catalog, bloqueo pesimista al asignar cuadrillas y descontar stock, y compensación si una transacción revierte.

Lo que le corresponde al frontend es no romper esa garantía frente al usuario:

- **Atomicidad y durabilidad visibles**: una escritura (crear orden, cambiar estado, asignar…) solo se muestra como hecha cuando el backend confirmó su transacción. No hay escrituras simuladas en memoria: sin conexión, el usuario ve el error.
- **Consistencia**: la pantalla muestra el objeto que devuelve el backend tras guardar, no una copia armada localmente.
- **Aislamiento frente a dobles envíos**: los botones de guardar se deshabilitan mientras la petición está en curso (`guardando`, `procesandoAccion`), así una misma operación no se envía dos veces.

## Configuración de arranque

`app.config.ts` es común al navegador y al servidor SSR (rutas, locale `es-CL`, HTTP, puertos). `main.ts` le agrega solo MSAL, que existe únicamente en el navegador; `app.config.server.ts` le agrega solo el render del servidor.
