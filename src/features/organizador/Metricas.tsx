import estilos from './Organizador.module.css';

/** Cifra destacada (Metrica en Android): valor en coral y etiqueta debajo. */
export function Metrica({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className={estilos.metrica}>
      <strong>{valor}</strong>
      <span>{etiqueta}</span>
    </div>
  );
}

/** Barra de progreso con título y detalle (ocupación, asistencia). */
export function BarraProgreso({
  titulo,
  detalle,
  valor,
  tono = 'coral',
}: {
  titulo: string;
  detalle: string;
  /** Entre 0 y 1. */
  valor: number;
  tono?: 'coral' | 'exito';
}) {
  const porcentaje = Math.round(Math.min(Math.max(valor, 0), 1) * 100);
  return (
    <div className={estilos.barraProgreso}>
      <div className={estilos.barraProgresoTexto}>
        <span>{titulo}</span>
        <span>{detalle}</span>
      </div>
      <div
        className={estilos.pistaProgreso}
        role="progressbar"
        aria-label={titulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        aria-valuetext={`${detalle} (${porcentaje} %)`}
      >
        <span
          className={tono === 'exito' ? estilos.rellenoExito : estilos.relleno}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
