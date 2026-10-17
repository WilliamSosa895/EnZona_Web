# Coherencia con la app Android

La web replica la app Android del equipo (Kotlin + Jetpack Compose) en apariencia, textos y reglas, y usa la misma API. Esta guía registra qué se tomó de Android, qué cambia en la web y qué quedó fuera del alcance.

## Fuentes revisadas

- App Android: `ui/theme` (`Color.kt`, `Theme.kt`, `Type.kt`, `Dimensiones.kt`), `ui/components` y las pantallas de `ui/screens`.
- API: `docs/COHERENCIA_APP_MOVIL.md`, `docs/ENDPOINTS.md`, `docs/CODIGOS_DE_ERROR.md` y las reglas de `ReglasEvento`, `GestionEventosService`, `PerfilService`, `OrdenService` y `PasarelaSandbox`.
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

| Android                               | Web                                        | Notas                                                                  |
| ------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `LoginScreen` (normal y personal)     | `AccesoPage`                               | Mismas reglas: el administrador entra por el acceso del personal       |
| `RegisterScreen`                      | `RegistroPage`                             | Agrega la casilla del aviso de privacidad que exige la API (LFPDPPP)   |
| `OtpScreen`                           | `VerificacionPage`                         | Correo y teléfono, reenvío a los 60 s                                  |
| `HomeScreen`                          | `InicioPage`                               | Zona, «Cerca de mí», búsqueda y filtros en la URL; paginación infinita |
| `EventDetailScreen`                   | `DetalleEventoPage`                        | Tipos de boleto, cantidad hasta 10, mapa y «Cómo llegar»               |
| `SeatMapScreen`                       | `AsientosPage`                             | Escenario, secciones, curvatura, pasillo, zoom y «Elegir por número»   |
| `CheckoutScreen`                      | `PagoPage`                                 | Desglose y total final; ver «Pago» abajo                               |
| `OrderSummaryScreen`                  | `OrdenPage`                                | Agrega el estado «pago en proceso», que la API sí tiene                |
| `TicketsScreen`                       | `MisBoletosPage`                           | Vigentes y anteriores, «Boleto k de N»                                 |
| `TicketDetailScreen`                  | `BoletoPage`                               | Talón con muescas y QR sobre blanco; ver «Boleto» abajo                |
| `ProfileScreen`                       | `PerfilPage`                               | Alta y baja del rol de organizador con los mismos diálogos             |
| `EditProfileScreen`, `SecurityScreen` | `EditarDatosPage`, `SeguridadPage`         | El CURP no se muestra: la API no lo devuelve                           |
| `HelpScreen`, `PrivacyScreen`, legal  | `AyudaPage`, `PrivacidadPage`, `LegalPage` | Mismo contenido                                                        |
| `OrganizerHomeScreen`                 | `MisEventosPage`                           | Métricas, ocupación y botón «Nuevo evento»                             |
| `EventFormScreen`                     | `FormularioEventoPage`                     | Admite varios tipos de boleto y varias secciones, como permite la API  |
| `EventStatsScreen`                    | `PanelEventoPage`                          | Reportes, publicación, personal de acceso y cancelación                |
| `ScannerScreen`                       | `EscanerPage`                              | Cámara y captura manual; ver «Validación» abajo                        |
| `AdminScreen`                         | `AdminPage`                                | Usuarios y eventos; ver «Fuera del alcance»                            |

## Diferencias propias de la web

### Pago

La app Android muestra tarjetas guardadas, OXXO y SPEI de su versión de demostración. La API solo acepta tarjeta mediante el token de la pasarela (`tokenPago`), así que la web ofrece únicamente «Tarjeta de crédito o débito». Mientras no se integre el formulario seguro de la pasarela real, la API funciona en modo sandbox y la pantalla de pago incluye una «Zona de demostración» para elegir la respuesta: `tok_aprobado`, `tok_rechazado`, `tok_pendiente` o `tok_error`. La web nunca pide ni guarda el número de tarjeta.

### Boleto

Android sube el brillo de la pantalla al mostrar el boleto. El navegador no permite controlar el brillo, así que la web usa la Screen Wake Lock API para mantener la pantalla encendida y, si no está disponible, sugiere subir el brillo. «Enviar con mi app de correo» abre un enlace `mailto:` con los mismos datos que el `Intent` de Android.

### Validación

- La validación sin conexión con la lista del evento (RNF-08, CP-14) es exclusiva de la app Android. La web valida en línea y lo indica en la pantalla.
- La API no tiene un endpoint que liste los eventos asignados a un validador. La web ofrece los eventos vigentes de la zona (más los propios del organizador y, para el administrador, todos los publicados); si el usuario elige uno para el que no fue designado, la API responde 403 y la web lo explica.
- La cámara solo funciona en un contexto seguro (HTTPS o `localhost`). Si no hay permiso o cámara, se usa la captura manual.

### Fecha y hora

Android usa selectores de calendario y reloj. La web usa el control nativo `datetime-local`; las horas se interpretan siempre en la zona de Orizaba y se envían a la API con su desfase (`-06:00`). El formato del control depende del idioma del navegador.

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

| Necesidad                                                        | Propuesta                                                                                    |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Listar los eventos donde un usuario es validador                 | `GET /api/validador/eventos`                                                                 |
| Nombre del organizador en los eventos de administración          | Agregar `organizadorNombre` a la respuesta (hoy la web lo resuelve con la lista de usuarios) |
| Detalle de los boletos emitidos de un evento para el organizador | `GET /api/eventos/{id}/boletos` (Android lo muestra; la web muestra el reporte por tipo)     |
| Saber si un boleto cancelado lo fue por cancelación del evento   | Agregar `eventoCancelado` o el motivo al boleto                                              |
| Formulario de pago de producción                                 | Integrar los campos seguros de la pasarela elegida para obtener `tokenPago`                  |
