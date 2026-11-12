# EnZona · Web

Versión web de **EnZona**, la plataforma para descubrir eventos cerca de ti en Orizaba, confirmar
asistencia o comprar boletos y entrar con un código QR de un solo uso. Consume la misma API que la
app Android (**EnZona_Api**, Spring Boot 3 + PostgreSQL en Aiven) y reproduce su identidad visual
y sus reglas de negocio.

## Qué incluye

| Rol | Pantallas |
|---|---|
| Asistente | Inicio con zona, búsqueda y filtros (Cerca de mí, Gratis, De pago, Fecha, Lugar, Tipo) · Detalle del evento (mapa, tipos de boleto, cantidad, total final) · Plano de asientos («Seleccionados X de N») · Pago con tarjeta (token de un solo uso) · Compra confirmada · Tu boleto (talón con QR, «Boleto k de N») · Mis boletos · Mi cuenta |
| Organizador | Mis eventos · Nuevo/Editar evento (portada 16:9, fecha y hora, mapa, tipos, asientos por secciones) · Panel del evento (indicadores, ocupación, boletos emitidos, personal de acceso, cancelación con política del servidor) |
| Validador | Escanear con la cámara o escribir el código · resultado «PUEDE PASAR / NO PUEDE PASAR» · últimos accesos · modo sin conexión con manifiesto y sincronización |
| Administrador | Resumen de la plataforma · Usuarios (bloquear/activar) · Eventos (cancelar por moderación, quitar portada) |

Acceso: registro con CURP y aviso de privacidad, verificación por código, inicio de sesión por
correo o CURP, acceso separado para personal y recuperación de contraseña.

## Requisitos

- Node.js 20 o superior.
- EnZona_Api corriendo: en la PC (`powershell -File D:\EnZona_Api\iniciar_api.ps1`, puerto 8080, base de Aiven) o en la nube.

## Puesta en marcha

```bash
cp .env.example .env.local   # ajusta ENZONA_API_URL
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Valor |
|---|---|
| `ENZONA_API_URL` | `http://localhost:8080` (API en la PC) o `https://enzona-api.onrender.com` |
| `ENZONA_COOKIE` | Nombre de la cookie de sesión (opcional) |

El navegador nunca llama a la API directamente: el servidor de Next reenvía las peticiones desde
`/api/enzona/...` agregando el token de la cookie httpOnly. No hace falta cambiar `CORS_ORIGINS`.

## Verificación

```bash
npm run typecheck   # TypeScript estricto
npm run lint        # ESLint (next/core-web-vitals)
npm test            # Vitest: formato, fechas, reglas de compra, filtros, formulario de evento, estadísticas, validación offline
npm run build       # compilación de producción
```

## Verificar sin la API real

Si Aiven o Render no responden desde tu red, `npm run dev:simulada` levanta en el puerto 8099 una
API simulada con el mismo contrato y datos de demostración (cuentas `asistente@uv.mx`,
`organizador@uv.mx`, `validador@uv.mx`, `admin@uv.mx`, contraseña `enzona123`; código de
verificación `123456`). Arranca la web con `ENZONA_API_URL=http://localhost:8099 npm run dev`.
Es solo para desarrollo: no firma boletos de verdad ni persiste nada.

`scripts/recorrido-capturas.js` (Playwright con el Edge del sistema) recorre todos los flujos y
guarda las capturas de `docs/capturas/` que sirven de evidencia visual.

## Documentación de referencia

La lógica de negocio, el contrato y las capturas de la app están en `D:\EnZona-android_3\docs`
(`notas_api_enzona.md`, `README.md`, `ApiService.kt`). El contrato completo de la API vive en
`D:\EnZona_Api\docs\openapi.yaml`. Este repositorio no modifica ninguno de los dos.
