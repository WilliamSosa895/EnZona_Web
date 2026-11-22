import { env } from '@/config/env';

/*
 * Portada de un evento elegida en el navegador. Equivale a util/ImagenPortada.kt de la app Android:
 *
 * 1. `cargarImagen` la lee ya enderezada (el navegador aplica la orientación EXIF de las fotos de la cámara) y
 *    la reduce a un tamaño razonable para la red (lado mayor de 1600 px).
 * 2. La persona la encuadra en la vista previa 16:9: la arrastra, la acerca con la rueda, dos dedos o el
 *    control deslizante, y la gira de 90 en 90 grados (`girar`).
 * 3. `recortar` corta exactamente ese encuadre y lo convierte a JPEG, listo para POST /api/eventos/{id}/imagen.
 *
 * Las funciones de cálculo son puras para poder probarlas; las de lienzo solo corren en el navegador.
 */

/** Misma proporción con la que se muestran las portadas. */
export const PROPORCION = 16 / 9;
/** Acercamiento máximo: el recorte puede ser hasta cuatro veces más pequeño que la imagen. */
export const ZOOM_MAXIMO = 4;
const LADO_MAXIMO = 1600;
const CALIDAD_JPEG = 0.85;
/** Tipos que acepta la API (los valida por su contenido). */
export const TIPOS_PORTADA = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Límite del archivo original; lo que se sube es el recorte reducido, mucho más ligero. */
const PESO_MAXIMO_ORIGINAL = 25 * 1024 * 1024;

/** Zona de la imagen que queda dentro del encuadre, en píxeles. */
export interface Recorte {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * Encuadre elegido. `x` e `y` van de -1 (borde izquierdo o superior) a 1 (borde derecho o inferior);
 * `zoom` es 1 cuando el recorte es el mayor posible y llega hasta ZOOM_MAXIMO.
 */
export interface Encuadre {
  x: number;
  y: number;
  zoom: number;
}

export const ENCUADRE_INICIAL: Encuadre = { x: 0, y: 0, zoom: 1 };

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Rectángulo de `proporcion` que cabe en la imagen (el mayor posible dividido entre `zoom`), desplazado según
 * el encuadre. Es el mismo cálculo que usa la vista previa, así lo que se ve es lo que se sube.
 */
export function rectanguloRecorte(ancho: number, alto: number, encuadre: Encuadre, proporcion = PROPORCION): Recorte {
  const bx = limitar(encuadre.x, -1, 1);
  const by = limitar(encuadre.y, -1, 1);
  const z = limitar(encuadre.zoom, 1, ZOOM_MAXIMO);
  // Más ancha que el encuadre: se recorta a los lados; más alta: arriba y abajo.
  const [anchoBase, altoBase] = ancho / alto > proporcion ? [alto * proporcion, alto] : [ancho, ancho / proporcion];
  const anchoRecorte = limitar(Math.round(anchoBase / z), 1, ancho);
  const altoRecorte = limitar(Math.round(altoBase / z), 1, alto);
  const sobranteX = ancho - anchoRecorte;
  const sobranteY = alto - altoRecorte;
  return {
    x: limitar(Math.round(((bx + 1) / 2) * sobranteX), 0, sobranteX),
    y: limitar(Math.round(((by + 1) / 2) * sobranteY), 0, sobranteY),
    ancho: anchoRecorte,
    alto: altoRecorte,
  };
}

/**
 * Mueve el encuadre al arrastrar `dx`, `dy` píxeles en una vista previa de `anchoMarco` píxeles de ancho.
 * Arrastrar hacia la derecha muestra la parte izquierda: el recorte se mueve al revés del puntero.
 */
export function moverEncuadre(
  encuadre: Encuadre,
  dx: number,
  dy: number,
  anchoMarco: number,
  ancho: number,
  alto: number,
): Encuadre {
  if (anchoMarco <= 0) return encuadre;
  const r = rectanguloRecorte(ancho, alto, encuadre);
  const factor = r.ancho / anchoMarco;
  const sobranteX = ancho - r.ancho;
  const sobranteY = alto - r.alto;
  return {
    zoom: encuadre.zoom,
    x: sobranteX > 0 ? limitar(encuadre.x - (dx * factor * 2) / sobranteX, -1, 1) : 0,
    y: sobranteY > 0 ? limitar(encuadre.y - (dy * factor * 2) / sobranteY, -1, 1) : 0,
  };
}

/** Cambia el acercamiento dentro de los límites, conservando la posición. */
export function conZoom(encuadre: Encuadre, zoom: number): Encuadre {
  return { ...encuadre, zoom: limitar(zoom, 1, ZOOM_MAXIMO) };
}

/** Mensaje de error si el archivo no sirve como portada; null si se puede usar. */
export function validarArchivo(archivo: Pick<File, 'type' | 'size'>): string | null {
  if (!(TIPOS_PORTADA as readonly string[]).includes(archivo.type)) return 'La imagen debe ser JPEG, PNG o WebP.';
  if (archivo.size > PESO_MAXIMO_ORIGINAL) return 'La imagen es demasiado grande (máximo 25 MB).';
  return null;
}

/**
 * URL lista para <img>. La API devuelve una ruta relativa (`/api/imagenes/…`) con su almacén local y una URL
 * absoluta con Cloudinary. Solo se aceptan http(s) y las vistas previas locales (blob:).
 */
export function urlPortada(url: string | null | undefined, base: string = env.apiUrl): string | null {
  const valor = url?.trim();
  if (!valor) return null;
  if (valor.startsWith('blob:')) return valor;
  if (valor.startsWith('/') && !valor.startsWith('//')) return `${base}${valor}`;
  try {
    const absoluta = new URL(valor);
    return absoluta.protocol === 'https:' || absoluta.protocol === 'http:' ? absoluta.toString() : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- lienzo (solo navegador)

function lienzo(ancho: number, alto: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  return c;
}

function contexto(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo preparar la imagen.');
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

/**
 * Lee la imagen elegida ya enderezada y reducida. Se decodifica con un <img>, que aplica la orientación EXIF en
 * todos los navegadores actuales (las fotos verticales de la cámara llegan derechas).
 */
export async function cargarImagen(archivo: File): Promise<HTMLCanvasElement> {
  const error = validarArchivo(archivo);
  if (error) throw new Error(error);
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new Error('El archivo elegido no es una imagen que se pueda leer.');
    }
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const c = lienzo(
      Math.max(1, Math.round(img.naturalWidth * escala)),
      Math.max(1, Math.round(img.naturalHeight * escala)),
    );
    contexto(c).drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Gira la imagen 90° en el sentido de las manecillas del reloj (botón «Girar»). */
export function girar(imagen: HTMLCanvasElement): HTMLCanvasElement {
  const c = lienzo(imagen.height, imagen.width);
  const ctx = contexto(c);
  ctx.translate(c.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(imagen, 0, 0);
  return c;
}

/** Recorta el encuadre elegido y lo convierte a JPEG: lo que se ve en la vista previa es lo que se guarda. */
export function recortar(imagen: HTMLCanvasElement, encuadre: Encuadre): Promise<Blob> {
  const r = rectanguloRecorte(imagen.width, imagen.height, encuadre);
  const c = lienzo(r.ancho, r.alto);
  contexto(c).drawImage(imagen, r.x, r.y, r.ancho, r.alto, 0, 0, r.ancho, r.alto);
  return new Promise((resolver, rechazar) =>
    c.toBlob(
      (blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo preparar la imagen.'))),
      'image/jpeg',
      CALIDAD_JPEG,
    ),
  );
}
