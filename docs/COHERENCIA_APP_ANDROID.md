# Coherencia con la app Android

La web replica la app Android del equipo (Kotlin + Jetpack Compose) en apariencia, textos y reglas, y usa la misma API. Esta guía registra qué se tomó de Android, qué cambia en la web y qué quedó fuera del alcance.

## Fuentes revisadas

- App Android v6 (`main`, commit `4b9b86b`, «API del equipo, portada con encuadre, guías interactivas y validador para la puerta»): `ui/theme`, `ui/components` (incluidos `GuiaInteractiva.kt` y `Portada.kt`), las pantallas de `ui/screens`, `data/Guias.kt`, `data/model/Estadisticas.kt`, `util/ImagenPortada.kt`, `data/remote/RepositorioRemoto.kt` y `docs/notas_api_enzona.md`.
- API: rama `feature/imagenes-evento` (portada de eventos y moderación, migración V6) sobre la versión 0.1.0: `docs/ENDPOINTS.md`, `docs/CODIGOS_DE_ERROR.md`, `docs/VARIABLES_DE_ENTORNO.md` y las reglas de `ReglasEvento`, `GestionEventosService`, `ImagenEventoService`, `PerfilService`, `OrdenService`, `ValidacionService` y `PasarelaSandbox`.
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
| `RegisterScreen`                         | `RegistroPage`                             | Agrega la casilla del aviso de privacidad que exige la API (LFPDPPP)                                                                                  |
| `OtpScreen`                              | `VerificacionPage`                         | Correo y teléfono, reenvío a los 60 s                                                                                                                 |
| `HomeScreen`                             | `InicioPage`                               | Zona, filtro «Cerca de mí», búsqueda y filtros en la URL, distancia en la tarjeta; paginación infinita                                                |
| `EventDetailScreen`                      | `DetalleEventoPage`                        | Portada, tipos de boleto, cantidad hasta 10, mapa y «Cómo llegar»                                                                                     |
| `SeatMapScreen`                          | `AsientosPage`                             | Escenario, secciones, curvatura, pasillo, zoom y «Elegir por número»                                                                                  |
| `CheckoutScreen`                         | `PagoPage`                                 | Desglose y total final; ver «Pago» abajo                                                                                                              |
| `OrderSummaryScreen`                     | `OrdenPage`                                | Agrega el estado «pago en proceso», que la API sí tiene                                                                                               |
| `TicketsScreen`                          | `MisBoletosPage`                           | Vigentes y anteriores, «Boleto k de N»                                                                                                                |
| `TicketDetailScreen`                     | `BoletoPage`                               | Talón con muescas y QR sobre blanco; ver «Boleto» abajo                                                                                               |
| `ProfileScreen`                          | `PerfilPage`                               | Alta y baja del rol de organizador con los mismos diálogos; «Volver a ver las guías»                                                                  |
| `EditProfileScreen`, `SecurityScreen`    | `EditarDatosPage`, `SeguridadPage`         | El CURP no se muestra: la API no lo devuelve                                                                                                          |
| `HelpScreen`, `PrivacyScreen`, legal     | `AyudaPage`, `PrivacidadPage`, `LegalPage` | Mismo contenido                                                                                                                                       |
| `OrganizerHomeScreen`                    | `MisEventosPage`                           | Métricas, ocupación y botón «Nuevo evento»                                                                                                            |
| `EventFormScreen`                        | `FormularioEventoPage`                     | Portada con encuadre, datos faltantes junto a los botones y dirección sugerida; admite varios tipos de boleto y varias secciones, como permite la API |
| `EventStatsScreen`                       | `PanelEventoPage`                          | Reportes, boletos emitidos, publicación, personal de acceso y cancelación                                                                             |
| `ScannerScreen`                          | `EscanerPage`                              | Pantalla para la puerta, en línea y sin conexión; ver «Validación» abajo                                                                              |
| `AdminScreen`, `EstadisticasAdminScreen` | `AdminPage`, `ResumenAdmin`                | Resumen, usuarios y eventos (con «Quitar portada»); ver «Fuera del alcance»                                                                           |
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
| «Para crear el evento falta: …» y dirección sugerida al mover el marcador                                                                                                                         | Igual; la dirección viene de la geocodificación inversa de OpenStreetMap en lugar del Geocoder del teléfono           |
| Teléfono: solo dígitos al editar los datos                                                                                                                                                        | Igual (también admite el `+` de la lada, que la API acepta)                                                           |
| Un evento que ya comenzó no se cancela desde la administración                                                                                                                                    | Igual                                                                                                                 |

## Diferencias propias de la web

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

| Función de Android                                      | Situación                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Métodos de pago guardados                               | La API responde 422 a `metodoPagoId`                                                                          |
| Pago en OXXO y SPEI                                     | La API responde 422 `METODO_PAGO_NO_SOPORTADO`                                                                |
| Comisión del 10 % al organizador al cancelar con ventas | La API reembolsa el 100 % y devuelve `comision: "0.00"`; la web muestra la comisión solo si la API la reporta |
| Centro de notificaciones y campana                      | La API avisa por correo; no hay rutas de notificaciones                                                       |
| Asignar roles desde la administración                   | No hay endpoint; el rol de validador se concede al designarlo en un evento                                    |
| Activar asientos desde la administración                | No hay endpoint; el organizador define el plano en el formulario                                              |
| «Marcar como finalizado»                                | La API pasa los eventos a REALIZADO con una tarea programada                                                  |

## Pendientes de la API detectados desde la web

| Necesidad                                                        | Propuesta                                                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Publicar la portada de eventos                                   | Integrar `feature/imagenes-evento` a `develop` y publicarla en una versión de la API                   |
| Listar los eventos donde un usuario es validador                 | `GET /api/validador/eventos`                                                                           |
| Nombre del organizador en los eventos de administración          | Agregar `organizadorNombre` a la respuesta (hoy la web lo resuelve con la lista de usuarios)           |
| Detalle de los boletos emitidos de un evento para el organizador | `GET /api/eventos/{id}/boletos` con asistente y fecha de uso (hoy la web y Android usan el manifiesto) |
| Saber si un boleto cancelado lo fue por cancelación del evento   | Agregar `eventoCancelado` o el motivo al boleto                                                        |
| Formulario de pago de producción                                 | Integrar los campos seguros de la pasarela elegida para obtener `tokenPago`                            |
