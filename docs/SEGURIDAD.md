# Seguridad

La web es un cliente: la autorización, las reglas de negocio y la integridad de los boletos se aplican en la API. Aun así, el cliente evita exponer datos, reduce la superficie de ataque y no confía en lo que llega por la URL.

## Sesión

| Medida                    | Detalle                                                                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token en `sessionStorage` | Se borra al cerrar la pestaña y no se comparte entre pestañas. No se usan cookies, así que no hay riesgo de CSRF; las peticiones salen con `credentials: 'omit'` |
| Cierre por vencimiento    | Se programa con la fecha `expiraEn` que devuelve la API                                                                                                          |
| Cierre por 401            | Solo un `401 NO_AUTENTICADO` cierra la sesión y avisa en la pantalla de acceso                                                                                   |
| Caché limpia              | Al iniciar o cerrar sesión se vacía la caché de consultas: los datos de una cuenta no quedan para la siguiente                                                   |
| Dos accesos               | El acceso normal rechaza a los administradores y el del personal rechaza cuentas sin rol de personal                                                             |
| Rutas por rol             | `RequiereRol` oculta pantallas; la API vuelve a comprobar cada permiso (el cliente no es una frontera de seguridad)                                              |

El riesgo principal de guardar el token en el navegador es un ataque XSS. Se mitiga con React (escapa todo el texto), sin `dangerouslySetInnerHTML`, sin `eval` y con una política de seguridad de contenido estricta.

## Cabeceras del servidor estático

Se definen en `deploy/nginx.conf.template` (Docker) y `deploy/_headers` (Cloudflare Pages).

| Cabecera                                           | Valor y motivo                                                                                                                                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`                          | `default-src 'self'`; scripts solo propios; conexiones solo a la propia web y al origen de la API; imágenes propias, `data:`, `blob:` y teselas de OpenStreetMap; `frame-ancestors 'none'`; `object-src 'none'` |
| `Strict-Transport-Security`                        | Un año, con subdominios: el navegador solo usa HTTPS                                                                                                                                                            |
| `X-Content-Type-Options: nosniff`                  | El navegador respeta el tipo declarado                                                                                                                                                                          |
| `X-Frame-Options: DENY`                            | Evita que la web se cargue dentro de otro sitio (clickjacking)                                                                                                                                                  |
| `Referrer-Policy: strict-origin-when-cross-origin` | No envía rutas internas a otros sitios                                                                                                                                                                          |
| `Permissions-Policy`                               | Cámara y ubicación solo para la propia web; micrófono y pagos del navegador desactivados                                                                                                                        |
| `Cross-Origin-Opener-Policy: same-origin`          | Aísla la ventana de otros orígenes                                                                                                                                                                              |

`style-src` permite `'unsafe-inline'` porque Leaflet y algunos valores dinámicos (zoom del plano, barras de progreso) usan estilos en línea; no se permiten scripts en línea.

## Datos y reglas

- **Pagos.** La web nunca pide, muestra ni guarda números de tarjeta: la API solo recibe el token de la pasarela (`tokenPago`).
- **Idempotencia.** Cada intento de compra lleva una `Idempotency-Key` aleatoria (`crypto.randomUUID`). Se conserva al reintentar tras una falla de red y se renueva tras un resultado definitivo: un doble clic o una reconexión no cobran dos veces. El botón se bloquea mientras se procesa.
- **URL no confiable.** Los parámetros de compra (`evento`, `tipo`, `cantidad`, `asientos`) se validan y se acotan (máximo 10 boletos, ids numéricos, sin duplicados). La API vuelve a validar todo.
- **Validaciones del cliente.** CURP, contraseña (8 a 72 caracteres con letras y números), teléfono y reglas de eventos son las mismas que en la API; avisan antes de enviar, pero no sustituyen la validación del servidor.
- **QR.** Se genera en el navegador a partir de `codigo.firma`; el contenido firmado no se envía a servicios externos. La firma HMAC solo la conoce la API.
- **Ubicación.** Se pide solo cuando el usuario lo elige (RNF-11), se redondea a 4 decimales (unos 11 m) y no se guarda: se envía únicamente en la consulta de eventos.
- **CURP.** La API lo guarda cifrado y no lo devuelve; la web no lo muestra después del registro.
- **Mensajes de error.** El inicio de sesión no distingue entre «la cuenta no existe» y «la contraseña es incorrecta».
- **Modo demostración.** El simulador de la API solo existe en desarrollo (`import.meta.env.DEV`); la compilación borra `mockServiceWorker.js` y el servidor responde 404 a esa ruta.

## Dependencias y secretos

- Versiones fijas en `package.json` y `package-lock.json`; `npm ci` en la CI y en Docker.
- La CI ejecuta `npm audit --omit=dev --audit-level=high`.
- Solo las variables con prefijo `VITE_` llegan al navegador y ninguna es secreta. Los archivos `.env*` están en `.gitignore`, salvo `.env.example` y `.env.demo`, que no contienen secretos.
- La imagen de Docker usa `nginx-unprivileged` (sin root) y no incluye el código fuente ni `node_modules`.

## Reportar un problema

Escribe a soporte@enzona.mx con los pasos para reproducirlo. No abras un issue público con detalles de una vulnerabilidad.
