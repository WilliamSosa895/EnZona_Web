import { MdCalendarMonth, MdLocationOn, MdNearMe } from 'react-icons/md';
import type { Evento } from '@/api/tipos';
import { corto } from '@/lib/fechas';
import { etiquetaPrecio, lugares } from '@/lib/formato';
import { Etiqueta, EtiquetaAgotado, Portada, Tarjeta } from '@/ui';
import estilos from './Eventos.module.css';

/** Tarjeta de evento: portada, nombre, fecha, lugar y precio (o "Gratis"), como TarjetaEvento en Android. */
export function TarjetaEvento({ evento }: { evento: Evento }) {
  const agotado = evento.disponibles <= 0;
  return (
    <Tarjeta sinRelleno a={`/eventos/${evento.id}`} className={estilos.tarjeta}>
      <Portada nombre={evento.nombre} categoria={evento.categoria} fecha={evento.fechaHoraInicio} soloArriba />
      <div className={estilos.tarjetaCuerpo}>
        <h2 className={estilos.tarjetaNombre}>{evento.nombre}</h2>
        <span className={estilos.compacta}>
          <MdCalendarMonth aria-hidden="true" />
          <span>{corto(evento.fechaHoraInicio)}</span>
        </span>
        <span className={estilos.compacta}>
          <MdLocationOn aria-hidden="true" />
          <span>{evento.lugar}</span>
        </span>
        {evento.distanciaKm !== null && (
          <span className={estilos.compacta}>
            <MdNearMe aria-hidden="true" />
            <span>A {evento.distanciaKm.toLocaleString('es-MX', { maximumFractionDigits: 1 })} km de ti</span>
          </span>
        )}
        <div className={estilos.tarjetaPie}>
          {evento.esDePago ? (
            <span className={estilos.precio}>{etiquetaPrecio(true, evento.precioDesde)}</span>
          ) : (
            <Etiqueta texto="Gratis" tono="destacado" />
          )}
          {agotado ? <EtiquetaAgotado /> : <span className={estilos.lugares}>{lugares(evento.disponibles)}</span>}
        </div>
      </div>
    </Tarjeta>
  );
}
