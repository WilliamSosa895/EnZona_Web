# ---------- compilación ----------
FROM node:20-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# La URL de la API se fija al compilar (Vite incrusta las variables VITE_*).
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- servidor estático ----------
# Imagen sin privilegios de root (escucha en el puerto 8080)
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=compilacion /app/dist /usr/share/nginx/html
# Origen de la API permitido por la política de seguridad de contenido (CSP).
ENV API_ORIGIN=http://localhost:8080
EXPOSE 8080
