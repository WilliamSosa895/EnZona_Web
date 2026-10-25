/*
 * Dirección aproximada de un punto del mapa (Geocoder en Android). Se usa el servicio público de geocodificación
 * inversa de OpenStreetMap (Nominatim), el mismo proyecto de los mapas, con su política de uso: pocas consultas
 * (solo al fijar el marcador, con espera) y sin datos personales. Si no responde, la dirección se escribe a mano.
 */
export const URL_NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';

interface DireccionNominatim {
  road?: string;
  pedestrian?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
}

/** «Calle 3 Poniente 120, Centro, Orizaba» a partir de las partes de la dirección. */
export function textoDireccion(d: DireccionNominatim | undefined): string | null {
  if (!d) return null;
  const calle = d.road ?? d.pedestrian;
  const partes = [
    calle && (d.house_number ? `${calle} ${d.house_number}` : calle),
    d.neighbourhood ?? d.suburb ?? d.quarter,
    d.city ?? d.town ?? d.village,
  ].filter(Boolean);
  return partes.length ? partes.join(', ') : null;
}

export async function direccionAproximada(lat: number, lng: number, senal?: AbortSignal): Promise<string | null> {
  const url = new URL(URL_NOMINATIM);
  url.search = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'es',
  }).toString();
  const respuesta = await fetch(url, { signal: senal, headers: { Accept: 'application/json' }, credentials: 'omit' });
  if (!respuesta.ok) return null;
  const datos = (await respuesta.json()) as { address?: DireccionNominatim };
  return textoDireccion(datos.address);
}
