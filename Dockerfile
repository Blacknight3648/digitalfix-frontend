# ==========================================
# Etapa 1: Compilación de la App Angular
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar para producción
COPY . .
RUN npm run build -- --configuration production

# ==========================================
# Etapa 2: Servidor Nginx de Producción
# ==========================================
FROM nginx:alpine

# Limpiar archivos por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar configuración personalizada de Nginx para enrutamiento SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los artefactos estáticos compilados de Angular
COPY --from=builder /app/dist/digital-fix/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
