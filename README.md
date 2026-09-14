# DigitalFix - Frontend

Frontend del sistema **DigitalFix**, una plataforma de órdenes de trabajo de mantención eléctrica. Construido con **Angular 19** (SSR + Express) e integrado con **Azure AD** mediante **MSAL** para autenticación corporativa y autorización por rol.

El código de la aplicación vive en [`frontend/`](frontend/).

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
cd frontend
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200/` con recarga en caliente.

### Configuración de Azure AD (MSAL)

Los parámetros de autenticación se definen en [`frontend/src/app/environment/environment.ts`](frontend/src/app/environment/environment.ts):

```ts
export const environment = {
  production: false,
  azure: {
    clientId: '<AZURE_CLIENT_ID>',
    tenantId: '<AZURE_TENANT_ID>',
    authority: 'https://login.microsoftonline.com/<AZURE_TENANT_ID>',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    protectedResourceScopes: ['api://digitalfix-api/Access.All'],
  },
  apiBaseUrl: 'http://localhost:8080',
};
```

Ajusta estos valores según el App Registration de Azure AD y la URL del backend (API Gateway / BFF).

### Build de producción

```bash
cd frontend
npm run build
```

El resultado queda en `frontend/dist/digital-fix/`, con dos carpetas: `browser/` (bundle estático) y `server/` (servidor SSR de Express, `server.mjs`).

---

## Dockerización

El frontend incluye un `Dockerfile` multi-stage (build con Angular CLI + runtime con Node/Express para SSR) y un `docker-compose.yml` en [`frontend/`](frontend/).

### Build y ejecución con Docker

```bash
cd frontend
docker build -t digitalfix-frontend .
docker run --rm -p 4200:4000 --name digitalfix-frontend digitalfix-frontend
```

La aplicación queda disponible en `http://localhost:4200/`. El contenedor escucha internamente en el puerto `4000`, pero se mapea al `4200` del host porque ese es el Redirect URI que hoy está registrado en el App Registration de Azure AD (ver nota de MSAL más abajo).

### Con Docker Compose

```bash
cd frontend
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

El `redirectUri` de MSAL se calcula dinámicamente a partir de `window.location.origin` (ver [`environment.ts`](frontend/src/app/environment/environment.ts)), así que la app siempre le pide a Azure AD que la devuelva al mismo origen desde el que se inició el login. Pero **Azure AD solo acepta orígenes que estén dados de alta como Redirect URI en el App Registration** ("DigitalFix" en Microsoft Entra ID → Authentication → Redirect URIs).

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
└── frontend/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .dockerignore
    ├── angular.json
    ├── package.json
    └── src/
        ├── app/
        │   ├── config/         # Configuración de MSAL (Azure AD)
        │   ├── environment/    # Variables de entorno (Azure, API base URL)
        │   ├── guards/         # Guards de ruta (autenticación / roles)
        │   ├── layout/         # Layout principal, sidebar, topbar
        │   ├── model/          # Modelos de dominio (usuario, orden de trabajo)
        │   ├── pages/          # Páginas (login, home, coming-soon)
        │   └── services/       # Servicios (auth, HTTP)
        ├── main.ts             # Bootstrap del cliente (browser)
        ├── main.server.ts      # Bootstrap del servidor (SSR)
        └── server.ts           # Servidor Express para SSR
```

---

## Scripts disponibles (`frontend/`)

```bash
npm start     # ng serve - servidor de desarrollo
npm run build # ng build - build de producción (browser + SSR)
npm run watch # build en modo watch (desarrollo)
```
