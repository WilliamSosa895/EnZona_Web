# EnZona Web

Aplicación web de **EnZona**, la plataforma de descubrimiento de eventos locales con boletos QR y control de acceso para Orizaba, Veracruz. Es el cliente web del mismo servicio que usa la app Android: consume la [API de EnZona](https://github.com/WilliamSosa895/EnZona_Api) (REST + JWT) y comparte su base de datos (RNF-10).

La interfaz replica la app Android (mismos colores, componentes, textos y flujos) y se adapta a cualquier ancho de pantalla: barra de navegación inferior en el teléfono y riel lateral en escritorio (RNF-06).

|            |                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Versión    | 0.1.0                                                                                                                |
| Stack      | React 18 · TypeScript 5 (estricto) · Vite 6 · React Router 7 · TanStack Query 5                                      |
| Pruebas    | Vitest + Testing Library + MSW (unitarias e integración) · Playwright + axe-core (extremo a extremo y accesibilidad) |
| Calidad    | ESLint 9 (TypeScript, hooks, accesibilidad) · Prettier · cobertura mínima en la CI                                   |
| Despliegue | Contenedor nginx sin privilegios o Cloudflare Pages                                                                  |

## Qué hace

| Rol           | Funciones                                                                                                                                                                             | Requisitos                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Visitante     | Registro con CURP y aviso de privacidad, verificación con código, inicio de sesión con correo o CURP                                                                                  | RF-01, RF-02, RF-03                 |
| Asistente     | Eventos de su zona o cercanos, búsqueda y filtros, detalle con mapa, confirmación de eventos gratuitos, compra de hasta 10 boletos con elección de asientos, pago, Mis boletos con QR | RF-05 a RF-07, RF-09 a RF-12, RF-19 |
| Organizador   | Mis eventos con métricas, alta y edición (fecha, ubicación en el mapa, tipos de boleto, secciones de asientos), publicación, reportes, personal de acceso y cancelación               | RF-08, RF-13, RF-14, RF-17          |
| Validador     | Escáner QR con la cámara o captura manual, resultado con motivo de rechazo y bitácora reciente                                                                                        | RF-15                               |
| Administrador | Usuarios (buscar, bloquear y desbloquear) y eventos (cancelación administrativa con motivo)                                                                                           | RF-18                               |
| Todos         | Mi cuenta: datos, contraseña, ajustes de ubicación, ayuda, privacidad y legal                                                                                                         | RF-04                               |

## Empezar

Requisitos: Node.js 20.11 o superior y npm.

```bash
git clone https://github.com/WilliamSosa895/EnZona_Web.git
cd EnZona_Web
npm ci
```

### Modo demostración (sin API)

```bash
npm run dev:demo
```

Abre <http://localhost:5173>. La API se simula en el navegador con [Mock Service Worker](https://mswjs.io) y datos de Orizaba. Los datos sobreviven a una recarga de la pestaña y se reinician al cerrarla. Este modo solo existe en desarrollo: la compilación de producción no incluye el simulador.

| Cuenta              | Contraseña  | Entra por                             |
| ------------------- | ----------- | ------------------------------------- |
| `asistente@uv.mx`   | `enzona123` | Acceso normal                         |
| `organizador@uv.mx` | `enzona123` | Acceso normal o «Acceso del personal» |
| `validador@uv.mx`   | `enzona123` | Acceso normal o «Acceso del personal» |
| `admin@uv.mx`       | `enzona123` | «Acceso del personal»                 |

El código de verificación de las cuentas nuevas es `123456`. En la pantalla de pago, la «Zona de demostración» elige qué responde la pasarela: aprobado, rechazado, pendiente o sin respuesta.

### Con la API real

1. Levanta la API según su README (`docker compose --env-file .env up --build` o `mvn spring-boot:run`); queda en `http://localhost:8080`.
2. Copia `.env.example` como `.env.local` y deja `VITE_API_URL=http://localhost:8080` y `VITE_API_MOCK=false`.
3. `npm run dev` y abre <http://localhost:5173>, que es el origen que la API permite por defecto (`CORS_ORIGINS`).

## Scripts

| Comando                           | Qué hace                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Servidor de desarrollo contra la API configurada                                               |
| `npm run dev:demo`                | Servidor de desarrollo con la API simulada                                                     |
| `npm run build`                   | Comprueba los tipos y compila a `dist/`                                                        |
| `npm run preview`                 | Sirve la compilación de `dist/`                                                                |
| `npm run lint`                    | ESLint (TypeScript, React Hooks, accesibilidad jsx-a11y)                                       |
| `npm run format` / `format:check` | Prettier                                                                                       |
| `npm run typecheck`               | TypeScript sin emitir archivos                                                                 |
| `npm test`                        | Pruebas unitarias y de integración (Vitest)                                                    |
| `npm run test:coverage`           | Lo anterior con reporte de cobertura en `coverage/`                                            |
| `npm run e2e`                     | Pruebas de extremo a extremo y de accesibilidad (axe) con Playwright, en teléfono y escritorio |

## Estructura

```text
src/
├── api/          Cliente HTTP y un módulo por recurso de la API (tipos, identidad, eventos, boletaje…)
├── app/          Rutas, guardas por rol, marco con navegación y caché de consultas
├── auth/         Sesión (token en sessionStorage), roles y contexto
├── config/       Variables de entorno tipadas
├── features/     Una carpeta por módulo funcional: páginas, componentes, estilos y pruebas
│   ├── acceso/        registro, verificación e inicio de sesión
│   ├── eventos/       inicio, filtros y detalle del evento
│   ├── compra/        plano de asientos, pago y resultado de la orden
│   ├── boletos/       Mis boletos y boleto QR
│   ├── perfil/        Mi cuenta, datos y seguridad
│   ├── organizador/   Mis eventos, formulario, panel y cancelación
│   ├── validador/     escáner de QR
│   ├── admin/         usuarios y eventos
│   ├── mapa/          mapas de OpenStreetMap (carga diferida)
│   └── informacion/   ayuda, privacidad y legal
├── lib/          Utilidades puras: fechas en la zona del evento, formato, validaciones, errores
├── mocks/        API simulada (pruebas y modo demostración)
├── styles/       Tokens de diseño y estilos globales
├── test/         Configuración y utilidades de prueba
└── ui/           Componentes de la marca (equivalentes a los de Android)
e2e/              Pruebas de extremo a extremo
deploy/           nginx y cabeceras de Cloudflare Pages
docs/             Documentación técnica
```

## Documentación

| Documento                                                       | Contenido                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Arquitectura](docs/ARQUITECTURA.md)                            | Capas, flujo de datos, sesión, rutas, decisiones y diagramas        |
| [Coherencia con la app Android](docs/COHERENCIA_APP_ANDROID.md) | Paridad pantalla por pantalla, alcance y pendientes de la API       |
| [Guía de estilo](docs/GUIA_DE_ESTILO.md)                        | Tokens, componentes, diseño responsivo y accesibilidad              |
| [Seguridad](docs/SEGURIDAD.md)                                  | Sesión, cabeceras, CSP, idempotencia y datos personales             |
| [Pruebas](docs/PRUEBAS.md)                                      | Estrategia, trazabilidad con los casos de prueba y cómo ejecutarlas |
| [Despliegue](docs/DESPLIEGUE.md)                                | Docker, Cloudflare Pages y configuración de la API                  |
| [Variables de entorno](docs/VARIABLES_DE_ENTORNO.md)            | `VITE_API_URL`, `VITE_API_MOCK` y `API_ORIGIN`                      |
| [Contribuir](docs/CONTRIBUIR.md)                                | Git flow, Conventional Commits, revisión y versiones                |
| [Cambios](CHANGELOG.md)                                         | Historial de versiones                                              |

## Equipo

Proyecto de las experiencias educativas _Taller de Pruebas de Software_ y _Desarrollo de Empresas Tecnológicas_, Facultad de Negocios y Tecnologías, Universidad Veracruzana.

- Morales Bautista Esteban Domingo
- Pacheco Luna Alejandro
- Rodríguez Castillo Luis Ángel
- Tehuatle Sosa William José

Los datos de mapas son de los colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).
