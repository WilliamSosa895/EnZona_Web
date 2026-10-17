# Despliegue

La compilación (`npm run build`) produce archivos estáticos en `dist/`. Cualquier servidor estático sirve, siempre que devuelva `index.html` en las rutas de la aplicación y envíe las cabeceras de seguridad. Hay dos opciones preparadas.

La URL de la API se fija **al compilar** (`VITE_API_URL`): Vite la incrusta en el código. Cambiar de API requiere volver a compilar.

## Opción A: contenedor Docker con nginx

```bash
docker build --build-arg VITE_API_URL=https://api.enzona.mx -t enzona-web .
docker run --rm -p 8080:8080 -e API_ORIGIN=https://api.enzona.mx enzona-web
```

- La primera etapa compila con Node 20; la segunda copia `dist/` a `nginx-unprivileged` (sin root, puerto 8080).
- `API_ORIGIN` se sustituye en la plantilla de nginx al arrancar y define `connect-src` de la política de seguridad de contenido. Debe coincidir con el origen de `VITE_API_URL`.
- nginx sirve `/assets/` con caché de un año (los nombres llevan huella) e `index.html` sin caché, para que una versión nueva se vea de inmediato.

## Opción B: Cloudflare Pages

| Ajuste                 | Valor                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| Comando de compilación | `npm ci && npm run build && cp deploy/_headers deploy/_redirects dist/` |
| Carpeta de salida      | `dist`                                                                  |
| Variable de entorno    | `VITE_API_URL=https://api.enzona.mx`                                    |
| Versión de Node        | `20`                                                                    |

Antes de publicar, ajusta `connect-src` en `deploy/_headers` al dominio real de la API. `_redirects` envía todas las rutas a `index.html`.

## Configuración de la API

La API debe aceptar el origen de la web:

```properties
CORS_ORIGINS=https://enzona.mx
```

En desarrollo, el valor por defecto de la API (`http://localhost:5173`) ya permite el servidor de Vite. La API expone las cabeceras `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Total-Pages` y `Location`, que la web necesita leer.

## Requisitos del navegador

Chrome, Edge y Firefox recientes, y Safari 16 o superior (RNF-07). La cámara del escáner y la ubicación requieren HTTPS (o `localhost` en desarrollo).

## Lista de verificación

1. `npm run build` sin errores y `dist/` sin `mockServiceWorker.js`.
2. `VITE_API_URL` y `API_ORIGIN` (o `deploy/_headers`) apuntan al mismo origen de la API.
3. `CORS_ORIGINS` de la API incluye el dominio de la web.
4. El sitio se sirve por HTTPS.
5. Abrir una ruta interna directamente (por ejemplo, `/boletos`) carga la aplicación y no un 404.
6. La consola del navegador no muestra violaciones de la política de seguridad de contenido.
