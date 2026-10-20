# DigitalFix - Frontend

Frontend del sistema **DigitalFix**, una plataforma de órdenes de trabajo de mantención eléctrica. Construido con **Angular 19** (SSR + Express) e integrado con **Azure AD** mediante **MSAL** para autenticación corporativa y autorización por rol.

---

## Stack tecnológico

- **Framework**: Angular 19 (standalone components + SSR)
- **Autenticación**: Azure AD / Microsoft Entra ID vía `@azure/msal-angular` y `@azure/msal-browser`
- **Servidor SSR**: Express (`@angular/ssr`)
- **Lenguaje**: TypeScript
- **Estilos**: SCSS

---

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior
- npm
- [Docker](https://www.docker.com/) (opcional, para ejecutar en contenedor)

---

## Quick start (desarrollo local)

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200/` con recarga en caliente.

### Configuración de Azure AD (MSAL)

Los parámetros de autenticación se definen en [`src/app/environment/environment.ts`](src/app/environment/environment.ts):

```ts
export const environment = {
  production: false,
  azure: {
    clientId: '<AZURE_CLIENT_ID>',
    tenantId: '<AZURE_TENANT_ID>',
    authority: 'https://login.microsoftonline.com/<AZURE_TENANT_ID>',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    protectedResourceScopes: ['api://<AZURE_CLIENT_ID>/access_as_user'],
  },
  bffUrl: 'http://localhost:8090',
};
```

Ajusta estos valores según el App Registration de Azure AD. **Todas** las llamadas al backend van al BFF (`bffUrl`, `digitalfix-bff-gateway` en el puerto `8090`): el frontend nunca llama directamente a un microservicio.

### Autenticación y envío del token

| Pieza | Archivo | Qué hace |
|---|---|---|
| Configuración MSAL | `config/msal.config.ts` | `PublicClientApplication` (authority del tenant y redirect URI). `protectedResourceMap` registra `${bffUrl}/*` con el scope `api://<clientId>/access_as_user`. |
| Arranque | `config/auth-startup.ts` | Procesa la respuesta del redirect (`handleRedirectPromise`) antes de iniciar el router. |
| Interceptor | `MsalInterceptor` | Agrega `Authorization: Bearer <access_token>` a cada petición `HttpClient` hacia el BFF. Por eso **todos** los servicios usan `HttpClient` y nunca Axios ni fetch. |
| Sesión | `services/auth.service.ts` | Login y logout por redirect. Lee el usuario y el rol desde el BFF (`/api/v1/login/me`, que resuelve el rol en ms-user). |
| Guards | `guards/auth.guard.ts`, `guards/role.guard.ts` | Exigen una sesión activa y uno de los roles definidos en `data.roles` de cada ruta. |

### Pantallas por rol

| Ruta | Pantalla | Roles |
|---|---|---|
| `/` | Landing pública de clientes: ingreso al portal (MSAL) y contacto. Recibe el regreso desde Microsoft y redirige a `/home` si hay sesión | Pública |
| `/login` | Acceso de colaboradores y empresas asociadas (enlazado solo desde el pie de la landing) | Pública |
| `/home` | Órdenes de trabajo: crear, consultar y operar | ADMIN, SUPERVISOR, CLIENTE |
| `/usuarios` | Usuarios del sistema, roles, empresas y áreas | SUPERADMIN |
| `/servicios` | Catálogo de servicios (código `SRV-0001` automático, tarifa en CLP) | SUPERADMIN |
| `/clientes`, `/clientes/nuevo`, `/clientes/:id/editar` | Clientes con RUT, contacto y dirección chilena (región y comuna) | SUPERADMIN |
| `/proveedores` | Proveedores de productos o de servicios | SUPERADMIN |
| `/mensajeria` | Panel de RabbitMQ: consumidores de ms-notify (pausar o reanudar) y estado de las colas y DLQ | SUPERADMIN |

SUPERADMIN hereda todos los roles. El menú lateral (`layout/nav-items.ts`) muestra solo las opciones del rol del usuario.

### Validación y formato de datos (estándar chileno)

Los formularios validan y formatean en tiempo real (`shared/formato-chile.ts` y `shared/campos-chile.directive.ts`):
- RUT con puntos, guion y dígito verificador (`12.345.678-5`).
- Teléfono `+56 9 1234 5678`.
- Correo con dominio.
- Pesos con separador de miles (`$15.000`, locale `es-CL`).
- Capitalización de nombres.

El botón Guardar se deshabilita mientras haya campos inválidos, y el backend vuelve a validar todo.

### Build de producción

```bash
npm run build
```

El resultado queda en `dist/digital-fix/`, con dos carpetas: `browser/` (bundle estático) y `server/` (servidor SSR de Express, `server.mjs`).

---

## Dockerización

El frontend incluye un `Dockerfile` multi-stage (build con Angular CLI + runtime con Node/Express para SSR) y un `docker-compose.yml` en la raíz del repositorio.

### Build y ejecución con Docker

```bash
docker build -t digitalfix-frontend .
docker run --rm -p 4200:4000 --name digitalfix-frontend digitalfix-frontend
```

La aplicación queda disponible en `http://localhost:4200/`. El contenedor escucha internamente en el puerto `4000`, pero se mapea al `4200` del host porque ese es el Redirect URI que hoy está registrado en el App Registration de Azure AD (ver nota de MSAL más abajo).

### Con Docker Compose

```bash
docker compose up --build
```

Para detenerlo:

```bash
docker compose down
```

### Variables de entorno del contenedor

| Variable   | Descripción                              | Valor por defecto |
|------------|-------------------------------------------|--------------------|
| `PORT`     | Puerto donde escucha el servidor Express  | `4000`             |
| `NODE_ENV` | Entorno de ejecución de Node              | `production`       |

> Nota: los valores de Azure AD (`clientId`, `tenantId`, `apiBaseUrl`, etc.) se compilan dentro del bundle en build time desde `environment.ts`, por lo que deben quedar correctos **antes** de construir la imagen.

### ⚠️ MSAL y el Redirect URI (importante)

El `redirectUri` de MSAL se calcula dinámicamente a partir de `window.location.origin` (ver [`environment.ts`](src/app/environment/environment.ts)), así que la app siempre le pide a Azure AD que la devuelva al mismo origen desde el que se inició el login. Pero **Azure AD solo acepta orígenes que estén dados de alta como Redirect URI en el App Registration** ("DigitalFix" en Microsoft Entra ID → Authentication → Redirect URIs).

- Si vas a exponer la app en un puerto/host distinto a los ya registrados (por ejemplo, corriendo el contenedor directo en `4000` en vez de `4200`, o en un dominio de producción), primero agrega esa URL exacta en el App Registration, o el login de Microsoft terminará con `AADSTS50011` (redirect URI mismatch) o, si el navegador sí vuelve a un puerto sin nada escuchando, con `ERR_CONNECTION_REFUSED`.
- Por eso el `docker-compose.yml` y el ejemplo de `docker run` mapean el contenedor al puerto `4200`: es el que ya está registrado, así no hace falta tocar Azure para probar la imagen localmente.

### Detalle del Dockerfile

- **Etapa `build`**: imagen `node:20-alpine`, instala dependencias con `npm ci` y ejecuta `ng build --configuration production`, generando el bundle SSR (`browser/` + `server/`).
- **Etapa `runtime`**: imagen `node:20-alpine` liviana, instala solo dependencias de producción (`npm ci --omit=dev`) y copia el resultado del build. Se ejecuta con `node dist/digital-fix/server/server.mjs`, sirviendo tanto los assets estáticos como el renderizado en servidor.

---

## Estructura del proyecto

```text
digitalfix-frontend/
├── README.md
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── angular.json
├── package.json
└── src/
    ├── app/
    │   ├── config/         # Configuración de MSAL (Azure AD) y arranque de la sesión
    │   ├── environment/    # Variables de entorno (Azure, URL del BFF)
    │   ├── guards/         # Guards de ruta (sesión / rol)
    │   ├── layout/         # Layout principal, sidebar, topbar, menú por rol
    │   ├── model/          # Modelos y contratos del backend
    │   ├── pages/          # Páginas (login, home, usuarios, servicios, clientes, proveedores, mensajería)
    │   ├── services/       # Servicios HTTP (HttpClient + MsalInterceptor, siempre vía BFF)
    │   └── shared/         # Directivas y utilidades de formato chileno, campos de dirección
    ├── main.ts             # Bootstrap del cliente (browser)
    ├── main.server.ts      # Bootstrap del servidor (SSR)
    └── server.ts           # Servidor Express para SSR
```

---

## Scripts disponibles

```bash
npm start     # ng serve - servidor de desarrollo
npm run build # ng build - build de producción (browser + SSR)
npm run watch # build en modo watch (desarrollo)
```
