# Pruebas

## Estrategia

| Nivel                    | Herramientas                   | Qué cubre                                                                                                                                           | Dónde                                         |
| ------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Unitarias                | Vitest                         | Funciones puras: fechas en la zona del evento, formato de importes, validaciones idénticas a la API, filtros, pedido de compra, etiquetas de boleto | `src/lib/*.test.ts`, funciones de cada módulo |
| Cliente HTTP             | Vitest + MSW                   | Token, endpoints públicos, Problem Details, paginación por cabeceras, cierre de sesión solo ante `NO_AUTENTICADO`                                   | `src/api/http.test.ts`                        |
| Integración de pantallas | Vitest + Testing Library + MSW | La aplicación completa (rutas, guardas, sesión, caché) contra la API simulada; se interactúa como un usuario, por rol y nombre accesible            | `src/features/*/*.test.tsx`                   |
| Extremo a extremo        | Playwright                     | Flujos completos en un navegador real, en un teléfono (Pixel 7) y en escritorio, sobre el modo demostración                                         | `e2e/flujos.spec.ts`                          |
| Accesibilidad            | Playwright + axe-core          | Reglas WCAG 2.1 A y AA en las pantallas principales de cada rol, en los dos tamaños                                                                 | `e2e/accesibilidad.spec.ts`                   |

La API simulada (`src/mocks`) reproduce el contrato de la API: rutas, códigos de estado, `codigo` de error, cabeceras de paginación, `Idempotency-Key`, pagos pendientes y las reglas de negocio que la interfaz necesita ver. Cada prueba parte de datos limpios (`reiniciarBase`).

Las consultas usan roles y nombres accesibles (`getByRole('button', { name: 'Pagar $360.00 MXN' })`): si una prueba no encuentra un control, tampoco lo encontraría un lector de pantalla.

## Ejecutar

```bash
npm test                 # unitarias e integración
npm run test:coverage    # con cobertura (coverage/index.html)
npm run e2e              # extremo a extremo; levanta el modo demostración si no está corriendo
```

Si el contenedor ya tiene un Chromium instalado y no puede descargar navegadores, indica su ruta con `PW_CHROMIUM=/ruta/a/chrome npm run e2e`.

La CI ejecuta formato, ESLint, tipos, pruebas con cobertura, auditoría de dependencias, compilación y, en un trabajo aparte, las pruebas de extremo a extremo. La cobertura mínima es de 80 % de líneas y sentencias, 70 % de ramas y 65 % de funciones; hoy está en torno al 83 % de líneas.

## Trazabilidad con los casos de prueba

Casos del documento _Requisitos y pruebas v2_ que la web verifica de forma automática:

| Caso  | Requisito     | Prueba automatizada                                                                                                      |
| ----- | ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| CP-01 | RF-01, RF-02  | `acceso.test.tsx` · registro, código incorrecto y luego correcto activan la cuenta                                       |
| CP-02 | RF-01         | `acceso.test.tsx` · un CURP duplicado se marca en su campo                                                               |
| CP-03 | RF-01         | `acceso.test.tsx` · un CURP con formato inválido no se envía                                                             |
| CP-04 | RF-02         | `acceso.test.tsx` · el código incorrecto no activa la cuenta                                                             |
| CP-05 | RF-03         | `acceso.test.tsx` · inicio de sesión con correo y contraseña                                                             |
| CP-06 | RF-03         | `acceso.test.tsx` · credenciales inválidas, sin revelar la causa                                                         |
| CP-07 | RF-07         | `eventos.test.tsx` · búsqueda y filtro de gratuitos guardados en la URL                                                  |
| CP-08 | RF-08, RF-10  | `eventos.test.tsx` · confirmación de asistencia a un evento gratuito; `organizador.test.tsx` · alta de un evento         |
| CP-09 | RF-11, RF-12  | `compra.test.tsx` · pago aprobado emite N boletos y ocupa los asientos; `e2e/flujos.spec.ts`                             |
| CP-10 | RF-11         | `compra.test.tsx` · pago rechazado sin cargo ni boletos; el reintento usa otra `Idempotency-Key`                         |
| CP-12 | RF-15         | `validador.test.tsx` · un boleto válido permite el acceso                                                                |
| CP-13 | RF-15         | `validador.test.tsx` · el segundo escaneo del mismo QR se rechaza                                                        |
| CP-15 | RF-13         | `organizador.test.tsx` · no se reduce el aforo por debajo de lo vendido                                                  |
| CP-16 | RF-14         | `organizador.test.tsx` · cancelación con la política de la API; `admin.test.tsx` · cancelación administrativa con motivo |
| CP-18 | RF-19, RNF-11 | `eventos.test.tsx` · cambio de zona sin usar la ubicación                                                                |

Otros comportamientos con prueba: N asientos distintos sin superar la cantidad (RF-09), pago pendiente que aparta los asientos, bloqueo del pago si un asiento se ocupó, «Boleto k de N» y navegación entre boletos de una orden, QR alterado (firma inválida), validador no designado (403), alta y baja del rol de organizador, edición de datos con validación del teléfono, cambio de contraseña sin cerrar la sesión, bloqueo de usuarios sin poder bloquearse a sí mismo y rutas protegidas por rol.

### Casos que se verifican en otro componente

| Caso                                              | Dónde                                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| CP-11 Compras concurrentes del último lugar       | API: prueba de concurrencia con PostgreSQL (Testcontainers). En la web, el error `AFORO_AGOTADO` se muestra y refresca la disponibilidad |
| CP-14 Validación sin conexión                     | App Android (RNF-08)                                                                                                                     |
| CP-17 Eventos cercanos con la ubicación concedida | Manual en un navegador con ubicación; la consulta envía `lat` y `lng` redondeadas                                                        |
| CP-19 Operación en Android                        | App Android                                                                                                                              |
| CP-20 Paridad web y móvil                         | Manual: comprar en la web y validar con la app Android contra la misma API                                                               |

## Pruebas manuales recomendadas antes de una versión

1. Recorrer los flujos de cada rol en un teléfono real (Chrome en Android) y en Safari en iOS.
2. Escanear un boleto con la cámara (requiere HTTPS) y comprobar la vibración y el resultado.
3. Navegar solo con el teclado (axe no lo cubre): orden del foco, diálogos (Escape y foco atrapado) y enlace «Saltar al contenido».
4. Revisar con un lector de pantalla (TalkBack o VoiceOver) el plano de asientos y el resultado de la validación.
5. Comprobar el contraste y el diseño con zoom del navegador al 200 %.
