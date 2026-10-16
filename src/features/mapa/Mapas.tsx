import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { ORIZABA } from './geo';
import './mapa.css';

const marcador = L.divIcon({ className: 'enzona-marcador', iconSize: [26, 26] });
const TESELAS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION = '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Miniatura no interactiva con el marcador del evento (detalle del evento). */
export function MiniMapa({ lat, lng, nombre }: { lat: number; lng: number; nombre: string }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      style={{ width: '100%', height: '100%' }}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={TESELAS} attribution={ATRIBUCION} />
      <Marker position={[lat, lng]} icon={marcador} title={nombre} keyboard={false} />
    </MapContainer>
  );
}

function AlTocar({ onTocar }: { onTocar: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onTocar(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Seguir({ lat, lng }: { lat: number | null; lng: number | null }) {
  const mapa = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) mapa.setView([lat, lng], Math.max(mapa.getZoom(), 16));
  }, [lat, lng, mapa]);
  return null;
}

interface SelectorProps {
  lat: number | null;
  lng: number | null;
  onCambio: (lat: number, lng: number) => void;
}

/** Mapa interactivo para fijar la ubicación exacta del evento: tocar el mapa o arrastrar el marcador. */
export function MapaSelector({ lat, lng, onCambio }: SelectorProps) {
  const redondear = (v: number) => Math.round(v * 100_000) / 100_000; // 5 decimales (≈ 1 m), como en Android
  const cambiar = (a: number, b: number) => onCambio(redondear(a), redondear(b));
  return (
    <MapContainer
      center={lat !== null && lng !== null ? [lat, lng] : [ORIZABA.lat, ORIZABA.lng]}
      zoom={lat !== null ? 16 : 14}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer url={TESELAS} attribution={ATRIBUCION} />
      <AlTocar onTocar={cambiar} />
      <Seguir lat={lat} lng={lng} />
      {lat !== null && lng !== null && (
        <Marker
          position={[lat, lng]}
          icon={marcador}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              cambiar(p.lat, p.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
