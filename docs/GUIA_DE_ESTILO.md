# Guía de estilo

La interfaz web usa el mismo sistema de diseño que la app Android. Los valores viven en `src/styles/tokens.css`; los componentes, en `src/ui`. Una pantalla nueva no define colores, tamaños de letra ni radios propios: usa los tokens.

## Color

| Token                                              | Valor                 | Uso                                                                      |
| -------------------------------------------------- | --------------------- | ------------------------------------------------------------------------ |
| `--azul-marino` (`--primary`)                      | `#1f3a5f`             | Botón principal, barra de navegación activa, talón del boleto, escenario |
| `--azul-profundo` (`--secondary`)                  | `#24708f`             | Enlaces, bordes de butacas libres, texto azul pequeño                    |
| `--azul-enzona`                                    | `#2e86ab`             | Íconos y superficies; no se usa como texto pequeño (4.1:1)               |
| `--coral` (`--tertiary`)                           | `#f2643b`             | Acción destacada (comprar, publicar) con texto `--tinta`, butaca elegida |
| `--tinta`                                          | `#1b2432`             | Texto principal                                                          |
| `--gris-texto`                                     | `#5d6d7e`             | Texto secundario (5.3:1 sobre blanco)                                    |
| `--fondo` / `--superficie`                         | `#eef1f6` / `#ffffff` | Fondo de la página / tarjetas                                            |
| `--exito`, `--aviso`, `--error` y sus contenedores |                       | Estados semánticos: avisos, etiquetas y resultados de validación         |

Reglas de contraste (WCAG 2.1 AA): nunca texto blanco sobre coral (3.15:1); el coral oscuro solo se usa en cifras grandes y en negrita. Los estados no dependen solo del color: las butacas usan número, «×» o palomita; los avisos llevan ícono y texto.

## Tipografía

Roboto, servida desde la propia web (sin Google Fonts). Escala de Material 3 ajustada a Android:

| Token                                                | Uso                                               |
| ---------------------------------------------------- | ------------------------------------------------- |
| `--headline-medium` (26 px, 700)                     | Título de pantalla principal («Mis boletos»)      |
| `--headline-small` (22 px, 600)                      | Títulos de resultado, día en el bloque de fecha   |
| `--title-large` / `--title-medium` / `--title-small` | Nombres de evento, subtítulos de sección, botones |
| `--body-large` / `--body-medium` / `--body-small`    | Texto de lectura, apoyos y notas                  |
| `--label-large` / `--label-medium` / `--label-small` | Etiquetas, chips y leyendas (mínimo 11.5 px)      |

## Espacio y forma

- Espaciado en múltiplos de 4: `--esp-xs` (4) a `--esp-xxl` (32); margen lateral `--margen` (16 px).
- Radios: `--radio-m` (12) en campos y chips, `--radio-l` (20) en tarjetas, `--radio-xl` (28) en diálogos.
- Área táctil mínima de 48 px (`--control`); botón principal de 52 px (`--boton-principal`).

## Componentes (`src/ui`)

| Componente                                                              | Equivalente Android                           | Notas                                                                                           |
| ----------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Boton` (`normal`, `destacado`, `peligro`)                              | `BotonEnZona`                                 | Estado `cargando` que bloquea el doble envío                                                    |
| `BotonSecundario`, `EnlaceSecundario`, `BotonTexto`, `BotonIcono`       | `BotonSecundario`, `TextButton`, `IconButton` | `BotonIcono` exige `etiqueta` (nombre accesible)                                                |
| `Campo`                                                                 | `CampoEnZona`                                 | Etiqueta flotante, error y ayuda enlazados con `aria-describedby`, mostrar u ocultar contraseña |
| `Tarjeta`, `Aviso`, `FilaDato`, `FilaImporte`, `Etiqueta`               | `TarjetaEnZona`, `Aviso`, `FilaDato`…         | `Aviso` con `anunciar` usa una región viva para lectores de pantalla                            |
| `BarraAccion`                                                           | `BarraAccion`                                 | Fija abajo en el teléfono; en escritorio se integra a la columna lateral                        |
| `BarraSuperior`, `EstadoVacio`, `IndicadorCarga`                        | `BarraSuperiorEnZona`, `EstadoVacio`          |                                                                                                 |
| `Dialogo`                                                               | `AlertDialog`                                 | Foco atrapado, Escape, bloqueo del desplazamiento; hoja inferior en pantallas estrechas         |
| `Selector`, `Interruptor`, `ChipFiltro`, `ChipMenu`, `SelectorCantidad` | `SelectorDesplegable`, `Switch`, `FilterChip` | Controles nativos o con roles ARIA (`switch`, `menu`)                                           |
| `Portada`, `BloqueFecha`                                                | Portada por categoría                         | Color e ícono por categoría cuando no hay imagen                                                |
| `Pagina`, `DosColumnas`, `Pila`                                         | —                                             | Contenedores de diseño responsivo                                                               |

## Diseño responsivo

| Ancho           | Navegación                                  | Diseño                                                                            |
| --------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| Menos de 640 px | Barra inferior en las pantallas principales | Una columna; carruseles horizontales                                              |
| 640 a 839 px    | Barra inferior                              | Rejillas de dos columnas                                                          |
| 840 a 1023 px   | Riel lateral                                | Listas en dos columnas                                                            |
| 1024 px o más   | Riel lateral                                | Contenido con columna lateral pegajosa (precio y acción), listas en tres columnas |

Se prueba como mínimo a 360, 768 y 1366 px. No se usan anchos fijos que obliguen a desplazarse en horizontal; las tablas y el plano de asientos se desplazan dentro de su propio contenedor.

## Accesibilidad

- HTML semántico: `header`, `nav`, `main`, `section` con `aria-labelledby`, listas para colecciones, tablas con encabezados.
- Enlace «Saltar al contenido» y foco visible (`:focus-visible`) en todos los controles.
- Cada control tiene un nombre accesible; los íconos decorativos llevan `aria-hidden`.
- Los cambios importantes se anuncian con regiones vivas (resultado del pago, de la validación, avisos).
- Los diálogos atrapan el foco y lo devuelven al cerrarse.
- Las animaciones se desactivan con `prefers-reduced-motion`.
- ESLint con `jsx-a11y` revisa estas reglas en cada cambio, y las pruebas buscan los elementos por rol y nombre.

## Textos

- Español de México, en segunda persona («Elige tu asiento», «Tus boletos»), igual que Android.
- Los botones dicen la acción y su resultado («Pagar $360.00 MXN», «Confirmar asistencia»).
- Importes con `$` y dos decimales en cobros (`$360.00 MXN`); sin decimales en precios redondos de listado (`$180`).
- Fechas con `src/lib/fechas.ts`: «Sáb 24 Oct · 20:00» en la zona de Orizaba.
- Los errores dicen qué pasó y qué hacer («Otra persona tomó uno de tus asientos. Elige otro.»).
