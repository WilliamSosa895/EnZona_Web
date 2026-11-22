# Coherencia con la app Android

La web replica la app Android del equipo (Kotlin + Jetpack Compose) en apariencia, textos y reglas, y usa la misma API. Esta guía registra qué se tomó de Android, qué cambia en la web y qué quedó fuera del alcance.

## Fuentes revisadas

- App Android (`main`, commit `1650605`, 28 de octubre de 2026): la v6 (`4b9b86b`, «API del equipo, portada con encuadre, guías interactivas y validador para la puerta») y los cambios posteriores: logo v1.2 y animación de conexión (`ea8d192`), verificación con correo real (`076fcf1`) y servidor configurable (`f7645eb`, `1650605`). Se revisaron `ui/theme`, `ui/components` (incluidos `GuiaInteractiva.kt`, `Portada.kt` y `AnimacionConexion.kt`), las pantallas de `ui/screens`, `data/Guias.kt`, `data/model/Estadisticas.kt`, `data/Repositorio.kt`, `data/remote/RepositorioRemoto.kt`, `res/drawable` (`enzona_logo.xml`, `ic_campana_boleto.xml`), `docs/figma_v3/svg_a_vector.py` y `docs/notas_api_enzona.md`.
- API, ramas sobre la versión 0.1.0 todavía sin integrar a `develop`:
  - `feature/imagenes-evento`: portada de eventos y moderación (migración V6).
  - `feature/correo-resend`: envío de correos por Resend; no cambia endpoints, pero el código y los boletos llegan a un correo real.
  - `feature/activar-cuenta-admin`: `POST /api/admin/usuarios/{id}/verificacion`.
  - Documentos revisados: `docs/ENDPOINTS.md`, `docs/openapi.yaml`, `docs/CODIGOS_DE_ERROR.md`, `docs/VARIABLES_DE_ENTORNO.md`, `docs/CORREO_RESEND.md` y las reglas de `ReglasEvento`, `GestionEventosService`, `ImagenEventoService`, `PerfilService`, `AdministracionService`, `OrdenService`, `ValidacionService` y `PasarelaSandbox`.
- Documentos del proyecto: requisitos y casos de prueba v2, esquema de base de datos v2 e identidad de marca.

## Sistema de diseño

| Elemento           | Android                                                                                        | Web                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Colores            | `Color.kt` (azul marino, azul EnZona, coral, tinta, semánticos)                                | Mismos valores en `src/styles/tokens.css`                                                |
| Tipografía         | Roboto, escala Material 3 (`Type.kt`)                                                          | Roboto local (`@fontsource`), mismas tallas y pesos                                      |
| Espaciado y radios | `Dimensiones.kt` (`Espacio`, `Tamanos`)                                                        | Variables `--esp-*`, `--radio-*`, `--control` (48 px), `--boton-principal` (52 px)       |
| Componentes        | `BotonEnZona`, `CampoEnZona`, `TarjetaEnZona`, `Aviso`, `BarraAccion`, `EtiquetaEstadoBoleto`… | `Boton`, `Campo`, `Tarjeta`, `Aviso`, `BarraAccion`, `EtiquetaEstadoBoleto`… en `src/ui` |
| Navegación         | `NavigationBar` por rol                                                                        | Barra inferior en el teléfono y riel lateral en escritorio, mismas pestañas por rol      |
| Íconos             | Material Icons                                                                                 | Material Design Icons (`react-icons/md`)                                                 |
| Fechas             | `FechaEvento.kt`: «Vie 25 Sep · 19:00», mes corto en minúsculas                                | `src/lib/fechas.ts`, mismo formato y zona                                                |

## Pantallas

| Android                                  | Web                                        | Notas                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoginScreen` (normal y personal)        | `AccesoPage`                               | Mismas reglas: el administrador entra por el acceso del personal                                                                                      |
| `RegisterScreen`                         | `RegistroPage`                             | Sin teléfono (no hay SMS); agrega la casilla del aviso de privacidad que exige la API (LFPDPPP)                                                       |
| `OtpScreen`                              | `VerificacionPage`                         | Código del correo; reenvío con cuenta regresiva de 60 s desde el registro; aviso si la cuenta tiene un teléfono pendiente                             |
| `HomeScreen`                             | `InicioPage`                               | Logo, campana-boleto, zona, filtro «Cerca de mí», búsqueda y filtros en la URL, distancia en la tarjeta; paginación infinita                          |
| `NotificacionesScreen`                   | `NotificacionesPage`                       | Explica que los avisos llegan por correo (la API no tiene centro de notificaciones)                                                                   |
| `EventDetailScreen`                      | `DetalleEventoPage`                        | Portada, tipos de boleto, cantidad hasta 10, mapa y «Cómo llegar»                                                                                     |
| `SeatMapScreen`                          | `AsientosPage`                             | Escenario, secciones, curvatura, pasillo, zoom y «Elegir por número»                                                                                  |
| `CheckoutScreen`                         | `PagoPage`                                 | Desglose y total final; ver «Pago» abajo                                                                                                              |
| `OrderSummaryScreen`                     | `OrdenPage`                                | Agrega el estado «pago en proceso», que la API sí tiene                                                                                               |
| `TicketsScreen`                          | `MisBoletosPage`                           | Vigentes y anteriores, «Boleto k de N»                                                                                                                |
| `TicketDetailScreen`                     | `BoletoPage`                               | Talón con muescas y QR sobre blanco; ver «Boleto» abajo                                                                                               |
| `ProfileScreen`                          | `PerfilPage`                               | Alta y baja del rol de organizador con los mismos diálogos; «Volver a ver las guías»                                                                  |
| `EditProfileScreen`, `SecurityScreen`    | `EditarDatosPage`, `SeguridadPage`         | El teléfono no se edita y solo aparece si la cuenta tiene uno; el CURP no se muestra: la API no lo devuelve                                           |
| `HelpScreen`, `PrivacyScreen`, legal     | `AyudaPage`, `PrivacidadPage`, `LegalPage` | Mismo contenido                                                                                                                                       |
| `OrganizerHomeScreen`                    | `MisEventosPage`                           | Métricas, ocupación y botón «Nuevo evento»                                                                                                            |
| `EventFormScreen`                        | `FormularioEventoPage`                     | Portada con encuadre, datos faltantes junto a los botones y dirección sugerida; admite varios tipos de boleto y varias secciones, como permite la API |
| `EventStatsScreen`                       | `PanelEventoPage`                          | Reportes, boletos emitidos, publicación, personal de acceso y cancelación                                                                             |
| `ScannerScreen`                          | `EscanerPage`                              | Pantalla para la puerta, en línea y sin conexión; ver «Validación» abajo                                                                              |
| `AdminScreen`, `EstadisticasAdminScreen` | `AdminPage`, `ResumenAdmin`                | Resumen, usuarios (con «Activar sin código») y eventos (con «Quitar portada»); ver «Fuera del alcance»                                                |
| `PantallaConectando` (arranque)          | `Arranque`, `PantallaConectando`           | Misma animación y tiempos; ver «Arranque» abajo                                                                                                       |
| `GuiaInteractiva`, `Guias`               | `features/guias`                           | Mismas guías, claves y pasos; ver «Guías» abajo                                                                                                       |

## Novedades de la versión 6 de Android incorporadas

| Android v6                                                                                                                                                                                        | Web                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Portada: selector del sistema, enderezar EXIF, encuadre 16:9 (arrastrar, pellizcar, «Acercar», «Girar»), 1600 px y JPEG, subida tras guardar                                                      | Igual. Además de arrastrar y pellizcar, se acerca con la rueda del ratón y se maneja con el teclado (flechas y + / −) |
| Portada en catálogo y detalle; sustituto por categoría mientras carga o si falla                                                                                                                  | Igual                                                                                                                 |
| «Quitar portada» en la administración                                                                                                                                                             | Igual, con una miniatura para ver qué se quita                                                                        |
| `422 IMAGEN_NO_PERMITIDA` mostrado en el formulario                                                                                                                                               | Igual; los datos del evento quedan guardados y se avisa el motivo                                                     |
| Guías de la primera vez en 7 pantallas, «Volver a ver las guías»                                                                                                                                  | Igual: Omitir, Atrás, Siguiente o tocar en cualquier parte; también Escape y flechas                                  |
| Validador para la puerta: solo «Escanear» y «Perfil», cámara grande con linterna, verde «PUEDE PASAR» (3 s y vibración) o rojo «NO PUEDE PASAR», contadores, «Escribir código», «Últimos accesos» | Igual. La linterna aparece solo si el navegador la expone (Chrome en Android)                                         |
| Validación sin conexión con el manifiesto y «Enviar N»                                                                                                                                            | Igual (antes era exclusiva de Android)                                                                                |
| Resumen de administración con indicadores y gráficas                                                                                                                                              | Igual                                                                                                                 |
| «Cerca de mí» como filtro, distancia en la tarjeta y «del más cercano al más lejano»                                                                                                              | Igual                                                                                                                 |
| Panel del evento con la lista de boletos emitidos (manifiesto)                                                                                                                                    | Igual; se conserva también la tabla de ventas por tipo                                                                |
| «Para crear el evento falta: …» y dirección del punto al mover el marcador                                                                                                                        | Igual; la dirección viene de la geocodificación inversa de OpenStreetMap en lugar del Geocoder del teléfono           |
| Un evento que ya comenzó no se cancela desde la administración                                                                                                                                    | Igual                                                                                                                 |

## Novedades de Android posteriores a la v6 incorporadas

| Android (`main` hasta `1650605`)                                                                                                                   | Web                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo v1.2 vectorial (del SVG del diseñador) en Login e Inicio; ícono adaptable con fondo azul marino `#002746`                                     | Igual: `src/assets/enzona_logo.svg` y `enzona_pin.svg` con la misma geometría; favicon, ícono para iOS y del manifiesto con el pin sobre `#002746` |
| Pantalla de conexión: el logo se arma por partes sobre azul claro (contorno, disco, boleto con rebote, nombre); ciclo de 2.8 s y al menos un ciclo | Igual (SVG y CSS con los mismos tiempos); con «reducir movimiento» el logo aparece completo                                                        |
| Inicio: título más pequeño, logo de 54 dp y campana con forma de boleto; Notificaciones explica que los avisos llegan por correo                   | Igual                                                                                                                                              |
| Formulario de evento: al tocar el mapa la dirección del punto sustituye lo escrito; chip «Usar la dirección del mapa» si se edita después          | Igual                                                                                                                                              |
| Registro sin teléfono; verificación con espera de 60 s para reenviar, error de reenvío aparte y aviso si la cuenta tiene un teléfono pendiente     | Igual; la espera también sobrevive a recargar la página                                                                                            |
| Textos de correo real: carpeta de no deseados, remitente y asunto en la verificación, el boleto y la ayuda                                         | Igual                                                                                                                                              |
| Editar mis datos conserva el teléfono sin editarlo; Seguridad oculta la fila del teléfono si no hay                                                | Igual                                                                                                                                              |
| Servidor configurable y detección automática (USB, emulador), con diálogo oculto de desarrollo                                                     | No aplica: ver «Servidor de la API» abajo                                                                                                          |

## Diferencias propias de la web

### Arranque

Android muestra la pantalla de conexión cada vez que abre la app, porque busca un servidor disponible y recupera la sesión. La web la muestra solo cuando hay una sesión guardada que comprobar (`GET /api/usuarios/me`); sin sesión no hay nada que esperar y el acceso aparece de inmediato. Un token rechazado lleva al acceso con el motivo, y si la API no responde se ofrece «Reintentar», como `PantallaError` en Android.

### Servidor de la API

La app Android detecta sola la dirección de la API en desarrollo (compilada, USB o emulador) y tiene un diálogo oculto para fijarla. La web no lo necesita: la dirección se fija al compilar con `VITE_API_URL` (`docs/VARIABLES_DE_ENTORNO.md`) y una opción para cambiarla desde la interfaz permitiría apuntar el navegador a un servidor ajeno con la sesión del usuario.

### Activar una cuenta sin código

La rama `feature/activar-cuenta-admin` de la API agrega `POST /api/admin/usuarios/{id}/verificacion` y Android todavía no lo usa. La web lo ofrece en las cuentas pendientes como «Activar sin código», con un diálogo de confirmación, porque sin SMS una cuenta con teléfono registrado no puede terminar la verificación por sí misma.

### Pago

La app Android muestra tarjetas guardadas, OXXO y SPEI de su versión de demostración. La API solo acepta tarjeta mediante el token de la pasarela (`tokenPago`), así que la web ofrece únicamente «Tarjeta de crédito o débito». Mientras no se integre el formulario seguro de la pasarela real, la API funciona en modo sandbox y la pantalla de pago incluye una «Zona de demostración» para elegir la respuesta: `tok_aprobado`, `tok_rechazado`, `tok_pendiente` o `tok_error`. La web nunca pide ni guarda el número de tarjeta.

### Guías

Los textos son los de Android con tres ajustes de exactitud: «tu equipo» en lugar de «tu teléfono»; en el boleto se dice que la pantalla se mantiene encendida (la web no controla el brillo); y en la cancelación se explica el reembolso del 100 % sin comisión, que es lo que aplica la API (la guía de Android menciona una comisión de sus datos de prueba). En el detalle de un evento gratuito no hay paso de cantidad: la web no muestra ese selector porque se aparta un lugar por persona.

### Boleto

Android sube el brillo de la pantalla al mostrar el boleto. El navegador no permite controlar el brillo, así que la web usa la Screen Wake Lock API para mantener la pantalla encendida y, si no está disponible, sugiere subir el brillo. «Enviar con mi app de correo» abre un enlace `mailto:` con los mismos datos que el `Intent` de Android.

### Validación

- Sin conexión (RNF-08, CP-14) la web funciona como Android: al activar «Sin conexión» descarga el manifiesto, compara el QR completo y no admite dos veces el mismo boleto en el equipo. El manifiesto vive solo en la memoria de la página; los escaneos pendientes se guardan para no perderlos al cerrar la pestaña (`docs/SEGURIDAD.md`). Como la web no se instala, la pestaña debe estar abierta antes de perder la red.
- «Escribir código» pide el contenido completo del QR (código y firma). Android pide «el código que aparece debajo del QR», pero la API rechaza con `FORMATO_INVALIDO` un código sin firma; la web lo pide completo para que funcione.
- La API no tiene un endpoint que liste los eventos asignados a un validador. La web ofrece los eventos vigentes de la zona (más los propios del organizador y, para el administrador, todos los publicados); si el usuario elige uno para el que no fue designado, la API responde 403 y la web lo explica.
- La cámara solo funciona en un contexto seguro (HTTPS o `localhost`). Si no hay permiso o cámara, se usa la captura manual.

### Fecha y hora

Android usa selectores de calendario y reloj. La web usa el control nativo `datetime-local`; las horas se interpretan siempre en la zona de Orizaba y se envían a la API con su desfase (`-06:00`). El formato del control depende del idioma del navegador.

### Acceso

Android rotula el campo como «Correo, teléfono o CURP», pero la API solo busca la cuenta por correo o CURP (`SesionService`). La web conserva «Correo o CURP» para no prometer algo que la API rechaza.

### Portada

La web recorta en un `canvas` y sube un JPEG nuevo, sin los metadatos de la foto original. Con una API anterior a la migración V6 (sin `imagenUrl`) las tarjetas muestran el sustituto por categoría y la subida responde con error.

## Fuera del alcance (decidido con la API)

Estas funciones existen en la app Android pero no en los requisitos ni en la API, por lo que la web no las incluye:

| Función de Android                                                   | Situación                                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Métodos de pago guardados                                            | La API responde 422 a `metodoPagoId`                                                                          |
| Pago en OXXO y SPEI                                                  | La API responde 422 `METODO_PAGO_NO_SOPORTADO`                                                                |
| Comisión del 10 % al organizador al cancelar con ventas              | La API reembolsa el 100 % y devuelve `comision: "0.00"`; la web muestra la comisión solo si la API la reporta |
| Centro de notificaciones con filtros (próximos, cancelados, compras) | La API avisa por correo y no tiene rutas de notificaciones; la campana lleva a la pantalla que lo explica     |
| Asignar roles desde la administración                                | No hay endpoint; el rol de validador se concede al designarlo en un evento                                    |
| Activar asientos desde la administración                             | No hay endpoint; el organizador define el plano en el formulario                                              |
| «Marcar como finalizado»                                             | La API pasa los eventos a REALIZADO con una tarea programada                                                  |

## Pendientes de la API detectados desde la web

| Necesidad                                                                 | Propuesta                                                                                                                                       |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Publicar la portada, el correo real y la activación por la administración | Integrar `feature/imagenes-evento`, `feature/correo-resend` y `feature/activar-cuenta-admin` a `develop` y publicarlas en una versión de la API |
| Listar los eventos donde un usuario es validador                          | `GET /api/validador/eventos`                                                                                                                    |
| Nombre del organizador en los eventos de administración                   | Agregar `organizadorNombre` a la respuesta (hoy la web lo resuelve con la lista de usuarios)                                                    |
| Detalle de los boletos emitidos de un evento para el organizador          | `GET /api/eventos/{id}/boletos` con asistente y fecha de uso (hoy la web y Android usan el manifiesto)                                          |
| Saber si un boleto cancelado lo fue por cancelación del evento            | Agregar `eventoCancelado` o el motivo al boleto                                                                                                 |
| Formulario de pago de producción                                          | Integrar los campos seguros de la pasarela elegida para obtener `tokenPago`                                                                     |
