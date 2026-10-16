/** Utilidades geográficas sin dependencias de Leaflet (no cargan el mapa en el paquete principal). */

/** Centro del área de estudio: Orizaba, Veracruz (igual que en la app Android). */
export const ORIZABA = { lat: 18.851, lng: -97.1 };

/** Radio del área de estudio (Orizaba y municipios conurbados), en metros. */
export const RADIO_AREA_M = 12_000;

/** Distancia en metros entre dos puntos (fórmula del haversine). */
export function distanciaM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** ¿Está dentro del área de estudio? Solo informativo: la API no restringe la ubicación. */
export const dentroDelArea = (lat: number, lng: number) =>
  distanciaM(ORIZABA.lat, ORIZABA.lng, lat, lng) <= RADIO_AREA_M;

/** Enlace "Cómo llegar" con indicaciones de OpenStreetMap hacia el evento. */
export const urlComoLlegar = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/directions?route=%3B${lat}%2C${lng}#map=16/${lat}/${lng}`;
