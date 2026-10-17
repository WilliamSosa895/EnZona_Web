# Variables de entorno

## Compilación (Vite)

Vite lee los archivos `.env`, `.env.local`, `.env.[modo]` y `.env.[modo].local`. Solo las variables con prefijo `VITE_` llegan al navegador y quedan **incrustadas en el código compilado**: nunca pongas secretos en ellas.

| Variable        | Valor por defecto       | Descripción                                                                                                                                                                 |
| --------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`  | `http://localhost:8080` | URL base de la API, sin barra final. Se le agregan las rutas `/api/...`                                                                                                     |
| `VITE_API_MOCK` | `false`                 | `true` activa la API simulada en el navegador. Solo tiene efecto con el servidor de desarrollo (`npm run dev` o `npm run dev:demo`); la compilación de producción la ignora |

Archivos del repositorio:

| Archivo        | Uso                                                          |
| -------------- | ------------------------------------------------------------ |
| `.env.example` | Plantilla. Cópiala como `.env.local` para tu configuración   |
| `.env.demo`    | Modo demostración (`npm run dev:demo`): `VITE_API_MOCK=true` |

`.env`, `.env.local` y cualquier otro `.env.*` están en `.gitignore`.

## Ejecución (contenedor nginx)

| Variable     | Valor por defecto       | Descripción                                                                                                                          |
| ------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `API_ORIGIN` | `http://localhost:8080` | Origen de la API permitido en `connect-src` de la política de seguridad de contenido. Debe coincidir con el origen de `VITE_API_URL` |

## Argumento de compilación de Docker

| Argumento      | Descripción                                                        |
| -------------- | ------------------------------------------------------------------ |
| `VITE_API_URL` | Se pasa con `--build-arg` y se usa al compilar dentro de la imagen |

## Pruebas de extremo a extremo

| Variable      | Descripción                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `PW_CHROMIUM` | Ruta a un Chromium ya instalado, para entornos que no pueden descargar navegadores                  |
| `CI`          | En la CI, Playwright no reutiliza un servidor existente, reintenta una vez y genera el reporte HTML |
