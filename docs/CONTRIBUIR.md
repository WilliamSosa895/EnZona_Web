# Contribuir

## Ramas (Git Flow)

| Rama                | Propósito                                                  | Se crea desde | Se integra en      |
| ------------------- | ---------------------------------------------------------- | ------------- | ------------------ |
| `main`              | Versiones publicadas; cada una con su etiqueta `vX.Y.Z`    | —             | —                  |
| `develop`           | Integración de lo terminado para la siguiente versión      | `main`        | —                  |
| `feature/<tema>`    | Una función o módulo (`feature/compra-y-boletos`)          | `develop`     | `develop`          |
| `release/<versión>` | Preparar una versión: ajustes finales, versión y CHANGELOG | `develop`     | `main` y `develop` |
| `hotfix/<tema>`     | Corrección urgente de producción                           | `main`        | `main` y `develop` |

Las integraciones se hacen con `--no-ff` para conservar en el historial qué commits formaron cada función. `main` y `develop` no reciben commits directos: todo entra por pull request con la CI en verde.

```bash
git switch develop && git pull
git switch -c feature/mi-cambio
# … commits …
git push -u origin feature/mi-cambio   # y abre el pull request hacia develop
```

## Mensajes de commit (Conventional Commits)

```text
tipo(alcance): resumen en español, en imperativo y sin punto final

Cuerpo opcional: qué cambia y por qué. Referencias a requisitos (Refs: RF-11, CP-10).
```

| Tipo           | Cuándo                                           |
| -------------- | ------------------------------------------------ |
| `feat`         | Nueva función para el usuario                    |
| `fix`          | Corrección de un error                           |
| `refactor`     | Cambio interno sin efecto visible                |
| `style`        | Apariencia o formato, sin cambiar la lógica      |
| `test`         | Pruebas nuevas o corregidas                      |
| `docs`         | Documentación                                    |
| `build` / `ci` | Dependencias, compilación o integración continua |
| `chore`        | Mantenimiento                                    |

Alcances habituales: `acceso`, `eventos`, `compra`, `boletos`, `perfil`, `organizador`, `validador`, `admin`, `ui`, `api`, `auth`, `mocks`, `e2e`.

Un cambio incompatible se marca con `!` (`feat(api)!: …`) y una nota `BREAKING CHANGE:` en el cuerpo.

## Antes de abrir un pull request

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run e2e      # si cambiaste un flujo
```

Lista de revisión:

- [ ] La pantalla se ve bien a 360 px, 768 px y 1366 px de ancho.
- [ ] Se usa con el teclado y cada control tiene un nombre accesible.
- [ ] Los textos están en español y coinciden con la app Android.
- [ ] Los errores de la API se muestran con `mensajeDeError` y los campos con `errorDeCampo`.
- [ ] Hay prueba para el comportamiento nuevo (por rol y nombre accesible).
- [ ] Si cambia el contrato con la API, se actualizaron `src/api/tipos.ts` y la API simulada.
- [ ] No hay secretos ni datos personales reales.

## Versiones

Se sigue [Versionado Semántico](https://semver.org/lang/es/). Para publicar:

```bash
git switch -c release/0.2.0 develop
# actualizar "version" en package.json (la app la toma de ahí) y CHANGELOG.md
git commit -am "chore(release): prepara la versión 0.2.0"
git switch main && git merge --no-ff release/0.2.0
git tag -a v0.2.0 -m "EnZona Web 0.2.0"
git switch develop && git merge --no-ff release/0.2.0
git branch -d release/0.2.0
git push origin main develop --tags
```
