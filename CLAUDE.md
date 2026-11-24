# EnZona web

Versión web oficial de EnZona (eventos cerca de ti con boletos QR). Cliente de **EnZona_Api**
(Spring Boot 3 + Java 21 + PostgreSQL en Aiven). Es la contraparte web de la app Android
`D:\EnZona-android_3` (Kotlin + Compose): misma identidad visual, misma lógica de negocio y el
mismo contrato de API. La app Android es **solo lectura**: nunca se modifica desde aquí.

## Stack

- Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript estricto, Tailwind CSS v4 (`@theme` en `globals.css`).
- `lucide-react` (iconos SVG), `qrcode.react` (QR), `leaflet` (OpenStreetMap, sin clave), `@zxing/browser` (cámara del validador), `zod` (formularios).
- Pruebas: Vitest (`npm test`). Sin pruebas de componentes por ahora.

## Cómo correr

```
cp .env.example .env.local      # ENZONA_API_URL=http://localhost:8080 (API en la PC contra Aiven) o https://enzona-api.onrender.com
npm install
npm run dev                     # http://localhost:3000
npm run typecheck && npm run lint && npm test && npm run build
```

La API se arranca aparte: `powershell -File D:\EnZona_Api\iniciar_api.ps1` (usa el `.env` de ese repo con la base de Aiven). Cuentas de prueba de la API: `asistente@uv.mx`, `organizador@uv.mx`, `validador@uv.mx`, `admin@uv.mx`, contraseña `enzona123` (si el sembrador está activo).

## Estructura

```
src/
  app/                    rutas (App Router). (publico)/ login, registro, verificacion, recuperar-contrasena
                          evento/[id] (+ asientos, pago), orden/[id], boleto/[id], mis-boletos, cuenta/*
                          mis-eventos/* (organizador), escanear (validador), admin/* (resumen, usuarios, eventos)
                          api/enzona/[...ruta]  ← intermediario hacia EnZona_Api (agrega el Bearer desde la cookie)
  components/ui           Boton, Campo, Superficies (Tarjeta, Aviso, ZonaDemostracion, FilaDato), Etiquetas, Estados, Dialogo
  components/marca        LogoEnZona (SVG en línea del vector oficial), AnimacionConexion
  components/eventos      Portada (16:9 o panel por categoría), TarjetaEvento, MapaEvento/MapaLeaflet
  components/compra       BarraCompra (fija abajo en móvil, panel en escritorio), SelectorCantidad
  components/boletos      TalonBoleto (talón con muescas), CodigoQr
  components/navegacion   Cascaron (cabecera escritorio + barra inferior móvil por rol)
  features/<dominio>      api.ts (lectura en servidor), acciones.ts (server actions), reglas.ts (lógica pura + tests), componentes cliente
  features/guias          guías de la primera vez (GuiaDePantalla + data-guia en cada pantalla; vistas por cuenta en localStorage)
  lib/api                 tipos.ts (DTO 1:1 con ApiService.kt), errores.ts (RFC 9457 → ErrorEnZona), servidor.ts, navegador.ts
  lib/sesion              cookie httpOnly con el JWT; sesionActual() cacheada por petición
  lib/formato.ts, fecha.ts, capacidades.ts, rutas.ts
```

## Decisiones clave

- **El servidor dispone.** Precios, totales, inventario, firma HMAC del QR, política de cancelación y permisos los decide la API. La web solo propone y muestra; sus validaciones son previas y amables, nunca la fuente de verdad.
- **Intermediario propio en lugar de CORS.** El navegador llama a `/api/enzona/...`; un route handler reenvía a `ENZONA_API_URL` con `Authorization: Bearer` tomado de la cookie httpOnly. Así no hay que tocar `CORS_ORIGINS` de la API ni exponer el token a JavaScript.
- **Capacidades.** Lo que la API no implementa (métodos guardados, OXXO/SPEI, centro de notificaciones, comisión al organizador, roles por admin, marcar realizado, SMS) está declarado en `lib/capacidades.ts` y la interfaz lo oculta, igual que `Capacidades` en Android.
- **Idempotencia.** Cada intento de compra lleva un `Idempotency-Key` (UUID). Un rechazo (201 con orden CANCELADA) renueva la clave para poder reintentar.
- **Paleta v2** exacta de la app (`#1F3A5F` marino, `#2E86AB` azul EnZona, `#24708F` profundo, `#F2643B` coral con texto tinta `#1B2432`, fondo `#EEF1F6`). Parejas con contraste < 4.5:1 no se usan para texto (blanco sobre coral, blanco sobre azul EnZona, gris suave como texto).
- **Fechas** en `America/Mexico_City` con abreviaturas fijas («Vie 25 Sep · 19:00»). Importes MXN con `Intl`.
- **Sin coautoría de Claude en commits.** Commits en formato conventional commits, sin trailers.

## Qué no hacer

- No cambiar el contrato ni la lógica de negocio documentados en `D:\EnZona-android_3\docs\notas_api_enzona.md` y `ApiService.kt`.
- No guardar el token en localStorage ni llamar a la API directamente desde el navegador.
- No usar emojis como iconos ni colores fuera de los tokens de `globals.css`.
