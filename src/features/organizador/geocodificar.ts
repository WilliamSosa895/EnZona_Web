/*
 * Dirección aproximada de un punto del mapa (geocodificación inversa) con
 * Nominatim de OpenStreetMap, sin clave y con uso moderado (una consulta por
 * movimiento del marcador). Es el equivalente web del `Geocoder` de Android:
 * al tocar o arrastrar el marcador, la dirección del punto sustituye lo
 * escrito en «Dirección» y «Ciudad».
 */

export interface DireccionAproximada {
  direccion: string;
  ciudad: string;
}

interface RespuestaNominatim {
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
  };
}

const URL_NOMINATIM = "https://nominatim.openstreetmap.org/reverse";

export async function direccionDesdeCoordenadas(latitud: number, longitud: number, signal?: AbortSignal): Promise<DireccionAproximada | null> {
  const parametros = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitud),
    lon: String(longitud),
    zoom: "18",
    "accept-language": "es",
  });
  try {
    const respuesta = await fetch(`${URL_NOMINATIM}?${parametros}`, { signal, headers: { Accept: "application/json" } });
    if (!respuesta.ok) return null;
    const datos = (await respuesta.json()) as RespuestaNominatim;
    return armarDireccion(datos);
  } catch {
    return null;
  }
}

/** "Sur 5 120, Centro" y la ciudad, a partir de las partes que entrega Nominatim. */
export function armarDireccion(datos: RespuestaNominatim): DireccionAproximada | null {
  const partes = datos.address;
  if (!partes) return null;
  const calle = partes.road ?? partes.pedestrian ?? partes.footway ?? "";
  const numero = partes.house_number ?? "";
  const colonia = partes.neighbourhood ?? partes.suburb ?? partes.quarter ?? "";
  const ciudad = partes.city ?? partes.town ?? partes.village ?? partes.municipality ?? partes.county ?? "";
  const calleConNumero = [calle, numero].filter(Boolean).join(" ");
  const direccion = [calleConNumero, colonia].filter(Boolean).join(", ");
  if (!direccion && !ciudad) return null;
  return { direccion, ciudad };
}
