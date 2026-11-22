/*
 * Portada del evento en el navegador: igual que `util/ImagenPortada.kt`, la
 * imagen elegida se encuadra en 16:9 (recorte centrado), se reduce a 1600 px
 * de ancho y se comprime a JPEG antes de subirla. El servidor la valida por
 * contenido, la modera y la guarda; el navegador nunca conoce el almacén.
 */

export const ANCHO_PORTADA = 1600;
export const ALTO_PORTADA = 900;
export const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
export const MAX_MB_PORTADA = 5;

export interface Encuadre {
  /** Desplazamiento del recorte, de 0 (inicio) a 1 (fin), en el eje sobrante. */
  posicion: number;
  /** Acercamiento, 1 = ajustada al marco. */
  zoom: number;
}

export async function prepararPortada(archivo: File, encuadre: Encuadre = { posicion: 0.5, zoom: 1 }): Promise<Blob> {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) throw new Error("Elige una imagen JPEG, PNG o WebP.");
  if (archivo.size > MAX_MB_PORTADA * 1024 * 1024) throw new Error(`La imagen pesa más de ${MAX_MB_PORTADA} MB.`);

  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO_PORTADA;
  lienzo.height = ALTO_PORTADA;
  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("No se pudo procesar la imagen en este navegador.");

  const proporcionMarco = ANCHO_PORTADA / ALTO_PORTADA;
  const proporcionImagen = imagen.width / imagen.height;
  const zoom = Math.max(1, encuadre.zoom);
  let anchoRecorte: number;
  let altoRecorte: number;
  if (proporcionImagen > proporcionMarco) {
    altoRecorte = imagen.height / zoom;
    anchoRecorte = altoRecorte * proporcionMarco;
  } else {
    anchoRecorte = imagen.width / zoom;
    altoRecorte = anchoRecorte / proporcionMarco;
  }
  const sobranteX = imagen.width - anchoRecorte;
  const sobranteY = imagen.height - altoRecorte;
  const posicion = Math.min(1, Math.max(0, encuadre.posicion));
  const origenX = proporcionImagen > proporcionMarco ? sobranteX * posicion : sobranteX / 2;
  const origenY = proporcionImagen > proporcionMarco ? sobranteY / 2 : sobranteY * posicion;

  contexto.drawImage(imagen, origenX, origenY, anchoRecorte, altoRecorte, 0, 0, ANCHO_PORTADA, ALTO_PORTADA);
  imagen.close();

  return new Promise((resolver, rechazar) => {
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo generar la portada."))), "image/jpeg", 0.86);
  });
}
