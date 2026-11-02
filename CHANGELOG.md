# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

Alineación con la app Android (`main` hasta `1650605`: v6, logo v1.2, correo real y dirección del mapa) y con las ramas de la API `feature/imagenes-evento`, `feature/correo-resend` y `feature/activar-cuenta-admin`.

### Agregado

- **Identidad visual v1.2:** logo nuevo en SVG con la geometría del diseñador, íconos de la aplicación con el pin sobre azul marino y favicon SVG.
- **Pantalla de conexión:** al abrir con una sesión guardada, el logo se arma por partes mientras se comprueba la sesión con `GET /api/usuarios/me`; sin conexión se ofrece reintentar. Con «reducir movimiento» se muestra quieto.
- **Campana-boleto en Inicio** y pantalla de Notificaciones que explica que los avisos llegan por correo.
- **Activar sin código** en la administración para cuentas pendientes cuyo correo no llegó (`POST /api/admin/usuarios/{id}/verificacion`).
- Chip «Usar la dirección del mapa» en el formulario de evento.
- **Portada de eventos:** se muestra en el catálogo y el detalle; el organizador la elige, la encuadra en 16:9 (arrastrar, rueda, dos dedos, control «Acercar», teclado y «Girar») y se sube recortada al crear o guardar el evento; «Quitar portada» para el organizador y la administración. Avisa el motivo cuando la moderación de la API la rechaza (`IMAGEN_NO_PERMITIDA`).
- **Guías interactivas de la primera vez** en Inicio, detalle, plano de asientos, boleto, Mis eventos, panel y formulario de nuevo evento; «Volver a ver las guías» en Mi cuenta.
- **Validación sin conexión** (RNF-08, CP-14): descarga del manifiesto, validación local, escaneos pendientes que sobreviven al cierre de la pestaña y «Enviar N» para sincronizarlos.
- **Resumen de administración** (RF-18): indicadores y gráficas de cuentas, eventos, ingresos y ocupación.
- «Cerca de mí» como filtro de Inicio y distancia en cada tarjeta.
- Lista de boletos emitidos en el panel del evento.
- Aviso de qué datos faltan para crear o guardar un evento y dirección del punto al fijar el marcador.

### Cambiado

- **Correo real (Resend):** el registro ya no pide teléfono; la verificación espera 60 s para reenviar (también al llegar desde el registro y tras recargar), separa el error de reenvío del de verificación y explica cómo activar una cuenta que tiene un teléfono pendiente. Textos de la carpeta de no deseados en la verificación, el boleto y la ayuda.
- Editar mis datos ya no cambia el teléfono (se conserva el actual) y Seguridad lo muestra solo si la cuenta tiene uno.
- Al tocar el mapa, la dirección de ese punto sustituye la escrita en el formulario de evento.
- Cabecera de Inicio con el logo más grande y el título un punto más pequeño.
- **Validador pensado para la puerta:** cámara a pantalla casi completa con linterna, resultado a toda la zona en verde «PUEDE PASAR» o rojo «NO PUEDE PASAR», contadores, «Escribir código» y «Últimos accesos». Mismos títulos de resultado que Android.
- El acceso del personal muestra solo su trabajo: sin «Inicio» ni «Mis boletos».
- La administración abre en el resumen; las pestañas se recorren con flechas, Inicio y Fin.
- Un evento que ya comenzó no ofrece «Cancelar evento» en la administración.
- La CSP permite las portadas de la API y de Cloudinary y la geocodificación de OpenStreetMap.

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
