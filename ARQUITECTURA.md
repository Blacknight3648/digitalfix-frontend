# Arquitectura del frontend DigitalFix

La estructura de `src/app` sigue la del frontend de referencia One Tech (React), adaptada a Angular:

```text
src/app/
├── components/
│   ├── layout/            Marco de la app: main-layout, sidebar, topbar, menú por rol (nav-items)
│   ├── pages/             Una carpeta por pantalla, numerada en el orden del menú
│   │   ├── 1-login/
│   │   ├── 2-home/            Órdenes de trabajo (ruta /home)
│   │   ├── 3-catalogo/        Catálogo técnico de repuestos
│   │   ├── 4-usuarios/
│   │   ├── 5-servicios/
│   │   ├── 6-clientes/        (con cliente-form/ para alta y edición)
│   │   ├── 7-proveedores/
│   │   ├── 8-mensajeria/
│   │   └── 9-coming-soon/     Dashboard, Reportería y Auditoría mientras no existan
│   └── ui/                Piezas reutilizables: direccion-campos/, directives/, pipes/
├── contexts/
│   └── auth/              Sesión: AuthService (signals), MSAL, arranque y guards/
├── remote/
│   ├── dto/               Contratos con el backend (respuestas y peticiones)
│   └── service/           Un servicio HTTP por área, agrupados en carpetas
│       ├── api.ts             URL base (BFF) que usan todos los servicios
│       ├── ordenes-trabajo/   servicio + puerto (PuertoOrdenesTrabajo)
│       ├── directorio/        clientes y proveedores
│       ├── catalogo/          catálogo de servicios y repuestos
│       ├── ubicaciones/  usuarios/  mensajeria/
├── models/                Tipos y reglas de dominio: estados, flujos, etiquetas, roles
├── data/                  Datos de demostración de solo lectura
├── utils/                 Funciones puras: formato chileno, mensajes de error
└── config/                environment, pantalla de carga
```

## Equivalencias con One Tech (React → Angular)

| One Tech | DigitalFix | Adaptación |
| --- | --- | --- |
| `components/Layout/` | `components/layout/` | Componentes standalone; el menú vive en `nav-items.ts`. |
| `components/Pages/N-Nombre/` | `components/pages/N-nombre/` | Cada pantalla se carga diferida con `loadComponent` en `app.routes.ts`, en vez del `switch` de páginas de `App.tsx`. |
| `components/ui/` | `components/ui/` | Además de componentes, aquí van las **directivas** y **pipes** de Angular. |
| `contexts/AuthContext.tsx` | `contexts/auth/auth.service.ts` | Un Context de React equivale a un servicio `providedIn: 'root'` con **signals**. Los guards (`authGuard`, `roleGuard`) reemplazan las comprobaciones de rol en el render. |
| `remote/service/api.tsx` (Axios + interceptor) | `remote/service/api.ts` + `HttpClient` | El token Bearer lo adjunta `MsalInterceptor`: no hay interceptor propio. |
| `remote/service/<Área>/` | `remote/service/<área>/` | Servicios `@Injectable` que devuelven `Observable`. |
| `remote/DTO/` | `remote/dto/` | Contratos con el backend, `*.dto.ts`. |
| `types/` | `models/` | Se llama `models` porque un alias `@types/*` chocaría con los paquetes `@types` de npm. |
| `data/` | `data/` | Igual. |
| `utils/` | `utils/` | Igual. |
| `assets/`, `styles/` | `public/`, `src/styles/` | Convención de Angular: los archivos estáticos van en `public/`. |
| `tests/` | `*.spec.ts` junto a cada archivo | Convención de Angular (aún no hay pruebas). |

## Dependencias entre carpetas

Cada carpeta solo importa de las que están **debajo**:

```text
components/pages ─┐
components/layout ┤
components/ui    ─┤
                  ▼
contexts             sesión y guards
                  ▼
remote/service       HTTP hacia el BFF
                  ▼
data · utils         datos de demostración y funciones puras
                  ▼
models ⇄ remote/dto  tipos (los DTO usan los estados de models y viceversa, solo como tipos)
config               sin dependencias
```

## Cómo importar

- **Entre carpetas**, siempre con alias: `@components/…`, `@contexts/…`, `@remote/…`, `@models/…`, `@data/…`, `@utils/…`, `@config/…` (definidos en `tsconfig.json`).
- **Dentro de una misma carpeta** (por ejemplo, entre servicios de `remote/` o entre piezas de `components/ui/`), con rutas relativas.

Ejemplos:

```ts
import { OrdenTrabajo } from '@remote/dto/orden-trabajo.dto';           // contrato con el backend
import { ETIQUETA_ESTADO_ORDEN } from '@models/orden-trabajo.model';      // regla/presentación
import { PuertoOrdenesTrabajo } from '@remote/service/ordenes-trabajo/servicio-ordenes-trabajo.port';
import { AuthService } from '@contexts/auth/auth.service';
```

### ¿DTO o modelo?

- **`remote/dto/`**: lo que viaja por HTTP, con los mismos campos que el backend (`OrdenTrabajo`, `ClientePeticion`, `Repuesto`…).
- **`models/`**: lo que la app decide por sí misma: estados y su flujo, etiquetas y clases CSS, roles y permisos, el modelo del formulario de dirección y sus conversiones.
- **`utils/`**: funciones sin estado que no son de un dominio (formato de RUT/teléfono, `mensajeDeError`).

## Agregar una pantalla nueva

1. Crear `components/pages/10-nombre/nombre.component.ts` (standalone).
2. Si consume una API nueva: sus contratos en `remote/dto/nombre.dto.ts` y su servicio en `remote/service/<área>/`, armando la ruta con `API_URL`.
3. Registrar la ruta en `app.routes.ts` con `loadComponent` y, si corresponde, `roleGuard` y `data.roles`.
4. Agregarla al menú en `components/layout/nav-items.ts`.

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

- **Responsabilidad única (S)**: cada servicio de `remote/service/` agrupa las llamadas al BFF de un área; los contratos (`remote/dto/`) están separados de las reglas (`models/`); los datos de demostración viven aparte (`data/`), no dentro del servicio HTTP; los estilos compartidos están en un solo lugar.
- **Abierto/cerrado (O)**: las pantallas nuevas se agregan en `components/pages/` y en `app.routes.ts`, sin modificar las carpetas inferiores.
- **Sustitución de Liskov (L)**: `ServicioOrdenesTrabajo` cumple el contrato `PuertoOrdenesTrabajo` completo, así que cualquier implementación que lo cumpla (HTTP real, un mock para pruebas) puede reemplazarla.
- **Segregación de interfaces (I)**: cada puerto o servicio expone solo las operaciones de su recurso.
- **Inversión de dependencias (D)**: la pantalla de Órdenes depende del puerto `PuertoOrdenesTrabajo`, no del cliente HTTP. `app.config.ts` decide la implementación:
  `{ provide: PuertoOrdenesTrabajo, useExisting: ServicioOrdenesTrabajo }`.

## ACID

ACID es una garantía de las **transacciones de base de datos** y se cumple en el backend: `@Transactional` en los servicios de ms-workorders y ms-catalog, bloqueo pesimista al asignar cuadrillas y descontar stock, y compensación si una transacción revierte.

Lo que le corresponde al frontend es no romper esa garantía frente al usuario:

- **Atomicidad y durabilidad visibles**: una escritura (crear orden, cambiar estado, asignar…) solo se muestra como hecha cuando el backend confirmó su transacción. No hay escrituras simuladas en memoria: sin conexión, el usuario ve el error.
- **Consistencia**: la pantalla muestra el objeto que devuelve el backend tras guardar, no una copia armada localmente.
- **Aislamiento frente a dobles envíos**: los botones de guardar se deshabilitan mientras la petición está en curso (`guardando`, `procesandoAccion`), así una misma operación no se envía dos veces.

## Configuración de arranque

`app.config.ts` es común al navegador y al servidor SSR (rutas, locale `es-CL`, HTTP, puertos). `main.ts` le agrega solo MSAL, que existe únicamente en el navegador; `app.config.server.ts` le agrega solo el render del servidor.
