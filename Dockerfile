# ---- Build stage ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
# Instalar Angular CLI explícitamente para asegurar la existencia del ejecutable
RUN npm install -g @angular/cli

COPY . .
# Usar la bandera -- para pasar parámetros al script definido en package.json
RUN npm run build -- --configuration production

# ---- Runtime stage ----
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist/digital-fix ./dist/digital-fix

EXPOSE 4000

CMD ["node", "dist/digital-fix/server/server.mjs"]