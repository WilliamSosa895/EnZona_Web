/**
 * Ubicación del dispositivo para ordenar los eventos por cercanía (RF-19). Requiere el consentimiento del
 * navegador (RNF-11); si no se concede, la app sigue funcionando con la ciudad elegida a mano.
 * La ubicación no se guarda: solo se envía en la consulta de eventos.
 */
export interface Coordenadas {
  lat: number;
  lng: number;
}

/** Redondeo a 4 decimales (≈ 11 m): suficiente para ordenar y evita enviar más precisión de la necesaria. */
const redondear = (v: number) => Math.round(v * 10_000) / 10_000;

export function obtenerUbicacion(): Promise<Coordenadas> {
  return new Promise((resolver, rechazar) => {
    if (!('geolocation' in navigator)) {
      rechazar(new Error('Tu navegador no permite obtener la ubicación.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: redondear(p.coords.latitude), lng: redondear(p.coords.longitude) }),
      (e) =>
        rechazar(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? 'No diste permiso para usar tu ubicación. Puedes elegir tu ciudad a mano.'
              : 'No se pudo obtener tu ubicación ahora. Elige tu ciudad a mano.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}
