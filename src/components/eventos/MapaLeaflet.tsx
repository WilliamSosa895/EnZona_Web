"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/*
 * Mapa Leaflet puro (sin react-leaflet) para controlar el ciclo de vida y
 * poder reutilizarlo en el detalle (solo lectura) y en el formulario del
 * organizador (marcador arrastrable que fija latitud y longitud).
 */

const ATRIBUCION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TESELAS = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const ICONO_PIN = L.divIcon({
  className: "",
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  html: `<svg viewBox="0 0 360 380" width="34" height="44" aria-hidden="true">
    <path fill="#1B819C" d="M 180 6 C 274 6, 342 76, 342 168 C 342 238, 297 290, 269 322 C 245 348, 226 374, 180 374 C 134 374, 115 348, 91 322 C 63 290, 18 238, 18 168 C 18 76, 86 6, 180 6 Z"/>
    <circle cx="180" cy="168" r="110" fill="#F2643B"/>
    <circle cx="180" cy="168" r="52" fill="#FFFFFF"/>
  </svg>`,
});

interface PropsMapaLeaflet {
  latitud: number;
  longitud: number;
  nombre: string;
  zoom?: number;
  /** Mapa interactivo con marcador arrastrable (formulario). */
  editable?: boolean;
  onMover?: (latitud: number, longitud: number) => void;
}

export function MapaLeaflet({ latitud, longitud, nombre, zoom = 15, editable, onMover }: PropsMapaLeaflet) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const marcador = useRef<L.Marker | null>(null);
  const moverRef = useRef(onMover);
  useEffect(() => {
    moverRef.current = onMover;
  }, [onMover]);

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const instancia = L.map(contenedor.current, {
      center: [latitud, longitud],
      zoom,
      zoomControl: editable,
      dragging: editable,
      scrollWheelZoom: editable,
      doubleClickZoom: editable,
      boxZoom: editable,
      keyboard: editable,
      touchZoom: editable,
      attributionControl: true,
    });
    L.tileLayer(TESELAS, { attribution: ATRIBUCION, maxZoom: 19 }).addTo(instancia);
    const pin = L.marker([latitud, longitud], { icon: ICONO_PIN, draggable: editable, title: nombre }).addTo(instancia);
    if (editable) {
      pin.on("dragend", () => {
        const posicion = pin.getLatLng();
        moverRef.current?.(redondear(posicion.lat), redondear(posicion.lng));
      });
      instancia.on("click", (evento: L.LeafletMouseEvent) => {
        pin.setLatLng(evento.latlng);
        moverRef.current?.(redondear(evento.latlng.lat), redondear(evento.latlng.lng));
      });
    }
    mapa.current = instancia;
    marcador.current = pin;
    return () => {
      instancia.remove();
      mapa.current = null;
      marcador.current = null;
    };
    // El mapa se crea una vez; los cambios de posición se aplican abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    marcador.current?.setLatLng([latitud, longitud]);
    if (!editable) mapa.current?.setView([latitud, longitud], zoom);
  }, [latitud, longitud, zoom, editable]);

  return <div ref={contenedor} className="size-full" role="img" aria-label={`Mapa con la ubicación de ${nombre}`} />;
}

/** Coordenadas con 5 decimales, como guarda la app. */
function redondear(valor: number): number {
  return Math.round(valor * 100000) / 100000;
}
