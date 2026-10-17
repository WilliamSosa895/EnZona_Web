import { memo, useMemo } from 'react';
import { MdCheck, MdClose } from 'react-icons/md';
import type { Asiento } from '@/api/tipos';
import { compararNumero, etiquetaLarga } from './pedido';
import estilos from './Compra.module.css';

interface PlanoProps {
  asientos: Asiento[];
  seleccionados: number[];
  tamano: number;
  onAlternar: (id: number) => void;
}

/** Secciones en el orden en que fueron creadas (id del primer asiento) y filas ordenadas. */
function agrupar(asientos: Asiento[]) {
  const secciones = new Map<string, Map<string, Asiento[]>>();
  for (const a of [...asientos].sort((x, y) => x.id - y.id)) {
    const filas = secciones.get(a.seccion) ?? new Map<string, Asiento[]>();
    filas.set(a.fila, [...(filas.get(a.fila) ?? []), a]);
    secciones.set(a.seccion, filas);
  }
  return [...secciones].map(([seccion, filas]) => ({
    seccion,
    filas: [...filas]
      .sort(([a], [b]) => compararNumero(a, b))
      .map(([fila, lista]) => ({ fila, asientos: lista.sort((a, b) => compararNumero(a.numero, b.numero)) })),
  }));
}

/**
 * Plano del recinto (SeatMapScreen en Android): escenario, secciones, curvatura de la platea y pasillo central.
 * Cada sección se desplaza horizontalmente como un bloque para que sus filas sigan alineadas.
 */
export function PlanoAsientos({ asientos, seleccionados, tamano, onAlternar }: PlanoProps) {
  const secciones = useMemo(() => agrupar(asientos), [asientos]);
  const elegidos = useMemo(() => new Set(seleccionados), [seleccionados]);

  return (
    <div className={estilos.plano} style={{ ['--butaca' as string]: `${tamano}px` }}>
      <div className={estilos.escenario} aria-hidden="true">
        Escenario
      </div>
      {secciones.map(({ seccion, filas }) => (
        <section key={seccion} className={estilos.seccion} aria-label={`Sección ${seccion}`}>
          <h3 className={estilos.nombreSeccion}>{seccion}</h3>
          <div className={estilos.desplazable}>
            <div className={estilos.filas} role="group" aria-label={`Asientos de ${seccion}`}>
              {filas.map(({ fila, asientos: deLaFila }) => {
                const centro = (deLaFila.length - 1) / 2;
                return (
                  <div key={fila} className={estilos.fila}>
                    <span className={estilos.letraFila} aria-hidden="true">
                      {fila}
                    </span>
                    {deLaFila.map((asiento, indice) => {
                      // Curvatura: las butacas de los extremos bajan un poco, como en la platea curva de un teatro.
                      const distancia = Math.abs(indice - centro) / Math.max(centro, 1);
                      return (
                        <span key={asiento.id} className={estilos.celda}>
                          <Butaca
                            asiento={asiento}
                            seleccionado={elegidos.has(asiento.id)}
                            desplazamiento={distancia * distancia * 7}
                            onAlternar={onAlternar}
                          />
                          {indice === Math.floor(deLaFila.length / 2) - 1 && (
                            <span className={estilos.pasillo} aria-hidden="true" />
                          )}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

interface ButacaProps {
  asiento: Asiento;
  seleccionado: boolean;
  desplazamiento?: number;
  onAlternar?: (id: number) => void;
}

const ESTADO_TEXTO = { DISPONIBLE: 'disponible', OCUPADO: 'ocupado', RESERVADO: 'reservado' } as const;

/**
 * Una butaca con tres señales, no solo color: libre muestra su número con borde; ocupada va rellena, atenuada
 * y con una «×»; la elegida va en coral con una palomita.
 */
export const Butaca = memo(function Butaca({ asiento, seleccionado, desplazamiento = 0, onAlternar }: ButacaProps) {
  const libre = asiento.estado === 'DISPONIBLE';
  const clase = [
    estilos.butaca,
    seleccionado ? estilos.elegida : '',
    asiento.estado === 'OCUPADO' ? estilos.ocupada : '',
    asiento.estado === 'RESERVADO' ? estilos.reservada : '',
  ].join(' ');
  const contenido = seleccionado ? (
    <MdCheck aria-hidden="true" />
  ) : !libre ? (
    <MdClose aria-hidden="true" />
  ) : (
    <span aria-hidden="true">{asiento.numero}</span>
  );

  if (!onAlternar)
    return (
      <span className={clase} aria-hidden="true">
        {contenido}
      </span>
    );

  const estado = seleccionado ? 'seleccionado' : ESTADO_TEXTO[asiento.estado];
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={seleccionado}
      aria-label={`${etiquetaLarga(asiento)}, ${estado}`}
      // Un asiento elegido que se ocupó mientras tanto debe poder quitarse.
      disabled={!libre && !seleccionado}
      className={clase}
      style={desplazamiento ? { transform: `translateY(${desplazamiento.toFixed(1)}px)` } : undefined}
      onClick={() => onAlternar(asiento.id)}
    >
      {contenido}
    </button>
  );
});

/** Leyenda: libre, ocupado y elegido. */
export function Leyenda() {
  const muestra: Asiento = { id: 0, seccion: '', fila: 'C', numero: '7', estado: 'DISPONIBLE', etiqueta: '' };
  return (
    <ul className={estilos.leyenda} aria-label="Leyenda del plano">
      <li>
        <Butaca asiento={muestra} seleccionado={false} />
        Libre
      </li>
      <li>
        <Butaca asiento={{ ...muestra, estado: 'OCUPADO' }} seleccionado={false} />
        Ocupado
      </li>
      <li>
        <Butaca asiento={muestra} seleccionado />
        Elegido
      </li>
    </ul>
  );
}
