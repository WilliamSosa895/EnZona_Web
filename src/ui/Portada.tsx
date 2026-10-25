import { useState } from 'react';
import type { IconType } from 'react-icons';
import { MdCelebration, MdMemory, MdMusicNote, MdSchool, MdSportsSoccer, MdTheaterComedy } from 'react-icons/md';
import { dia, mesCorto } from '@/lib/fechas';
import { urlPortada } from '@/lib/portada';
import estilos from './Portada.module.css';

/*
 * Portada del evento (ui/components/Portada.kt en Android). El evento puede traer `imagenUrl` (la sube el
 * organizador y la guarda la API en su almacén). Mientras carga, o si falla, se ve el sustituto: un panel plano
 * por categoría con la fecha como pieza tipográfica, información real del evento y no decoración.
 */
interface TonoPortada {
  fondo: string;
  tinta: string;
  icono: IconType;
}

const TONOS: Record<string, TonoPortada> = {
  música: { fondo: '#D7E1EE', tinta: '#1F3A5F', icono: MdMusicNote },
  teatro: { fondo: '#FDE9E2', tinta: '#8E2A1F', icono: MdTheaterComedy },
  deportes: { fondo: '#E3F0F6', tinta: '#1B4F63', icono: MdSportsSoccer },
  deportivo: { fondo: '#E3F0F6', tinta: '#1B4F63', icono: MdSportsSoccer },
  tecnología: { fondo: '#E6EBF3', tinta: '#24708F', icono: MdMemory },
  académico: { fondo: '#E5F3EC', tinta: '#1E7A45', icono: MdSchool },
  cultural: { fondo: '#FBF0D5', tinta: '#1F3A5F', icono: MdCelebration },
  cultura: { fondo: '#FBF0D5', tinta: '#1F3A5F', icono: MdCelebration },
  taller: { fondo: '#E6EBF3', tinta: '#24708F', icono: MdSchool },
  talleres: { fondo: '#E6EBF3', tinta: '#24708F', icono: MdSchool },
  gastronómico: { fondo: '#FDE9E2', tinta: '#8E2A1F', icono: MdCelebration },
  gastronomía: { fondo: '#FDE9E2', tinta: '#8E2A1F', icono: MdCelebration },
};
const GENERICO: TonoPortada = { fondo: '#D7E1EE', tinta: '#1F3A5F', icono: MdCelebration };

const tonoDe = (categoria: string | null) => TONOS[(categoria ?? '').trim().toLocaleLowerCase('es-MX')] ?? GENERICO;

interface PortadaProps {
  nombre: string;
  categoria: string | null;
  fecha: string;
  mostrarFecha?: boolean;
  /** Esquinas redondeadas solo arriba (dentro de una tarjeta). */
  soloArriba?: boolean;
  /** En pantallas anchas usa una proporción más baja (cabecera del detalle). */
  ancha?: boolean;
  /** Portada que entrega la API (relativa o absoluta) o una vista previa local (blob:). */
  imagenUrl?: string | null;
  /** Prioridad de descarga: la del detalle se pide de inmediato; las del catálogo, al acercarse. */
  prioritaria?: boolean;
}

/** Portada 16:9 con el sustituto por categoría. */
export function Portada({
  nombre,
  categoria,
  fecha,
  mostrarFecha = true,
  soloArriba = false,
  ancha = false,
  imagenUrl = null,
  prioritaria = false,
}: PortadaProps) {
  const tono = tonoDe(categoria);
  const Icono = tono.icono;
  const fuente = urlPortada(imagenUrl);
  // Se recuerda qué URL falló (y no un booleano) para volver a intentar si el evento cambia de portada.
  const [fallida, setFallida] = useState<string | null>(null);
  const [cargada, setCargada] = useState<string | null>(null);
  const conImagen = fuente !== null && fallida !== fuente;
  return (
    <div
      // Con foto se respeta el 16:9 en que la encuadró el organizador; el sustituto puede ser más bajo.
      className={[estilos.portada, soloArriba ? estilos.soloArriba : '', ancha && !conImagen ? estilos.ancha : ''].join(
        ' ',
      )}
      style={{ background: tono.fondo }}
      role="img"
      aria-label={`Portada de ${nombre}${categoria ? `, categoría ${categoria}` : ''}`}
    >
      <Icono className={estilos.marcaAgua} color={tono.tinta} aria-hidden="true" />
      {categoria && (
        <span className={estilos.categoria} style={{ color: tono.tinta }} aria-hidden="true">
          {categoria}
        </span>
      )}
      {conImagen && (
        <img
          src={fuente}
          alt=""
          className={[estilos.imagen, cargada === fuente ? estilos.imagenLista : ''].join(' ')}
          loading={prioritaria ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setCargada(fuente)}
          onError={() => setFallida(fuente)}
        />
      )}
      {mostrarFecha && (
        <span className={estilos.bloqueFecha}>
          <BloqueFecha fecha={fecha} />
        </span>
      )}
    </div>
  );
}

/** Bloque "25 / sep" tipo calendario. */
export function BloqueFecha({ fecha }: { fecha: string }) {
  return (
    <span className={estilos.fecha} aria-hidden="true">
      <span className={estilos.fechaDia}>{dia(fecha)}</span>
      <span className={estilos.fechaMes}>{mesCorto(fecha)}</span>
    </span>
  );
}
