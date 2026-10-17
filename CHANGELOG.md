# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [Versionado Semántico](https://semver.org/lang/es/).

## [0.1.0] - 2026-10-17

Primera versión de la aplicación web, conectada a la API de EnZona 0.1.0 y con paridad visual con la app Android.

### Agregado

- **Identidad y acceso:** registro con CURP y aviso de privacidad, verificación por código de correo y teléfono, inicio de sesión con correo o CURP, acceso del personal y cierre automático al vencer el token (RF-01 a RF-03).
- **Descubrimiento:** eventos de la zona o cercanos con la ubicación del navegador, búsqueda, filtros por categoría, lugar, precio y fecha guardados en la URL, y paginación infinita (RF-05 a RF-07, RF-19).
- **Detalle del evento:** tipos de boleto, cantidad hasta 10, mapa de OpenStreetMap con «Cómo llegar» y confirmación de asistencia a eventos gratuitos (RF-10).
- **Compra:** plano de asientos con secciones, zoom y elección por número; pago con desglose y total final, `Idempotency-Key` y escenarios de la pasarela sandbox; resultado de la orden con pago pendiente que se actualiza solo (RF-09, RF-11, RNF-09).
- **Boletos:** Mis boletos con vigentes y anteriores, boleto QR en forma de talón, navegación entre boletos de una orden y pantalla encendida mientras se muestra (RF-12).
- **Mi cuenta:** datos, contraseña, ajustes de ubicación y alta o baja del rol de organizador (RF-04).
- **Organizador:** Mis eventos con métricas, alta y edición con mapa, tipos de boleto y secciones, panel con reportes, publicación, personal de acceso y cancelación según la política de la API (RF-08, RF-13, RF-14, RF-17).
- **Validador:** escáner de QR con la cámara o captura manual, motivo de rechazo y bitácora reciente (RF-15).
- **Administración:** búsqueda, bloqueo y desbloqueo de usuarios y cancelación administrativa de eventos (RF-18).
- Modo demostración con API simulada (`npm run dev:demo`).
- Pruebas unitarias, de integración, de extremo a extremo y de accesibilidad (axe, WCAG 2.1 AA); CI con formato, análisis estático, tipos, cobertura mínima, auditoría y compilación.
- Pantalla de error por ruta que recarga sola si falta un fragmento tras publicar una versión nueva.
- Imagen Docker con nginx sin privilegios y cabeceras de seguridad; configuración para Cloudflare Pages.
- Documentación de arquitectura, seguridad, pruebas, despliegue, estilo y coherencia con Android.

[0.1.0]: https://github.com/WilliamSosa895/EnZona_Web/releases/tag/v0.1.0
