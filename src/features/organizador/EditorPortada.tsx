import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { conZoom, moverEncuadre, PROPORCION, rectanguloRecorte, ZOOM_MAXIMO, type Encuadre } from '@/lib/portada';
import estilos from './EditorPortada.module.css';

interface Props {
  imagen: HTMLCanvasElement;
  encuadre: Encuadre;
  onEncuadre: (encuadre: Encuadre) => void;
  deshabilitado?: boolean;
}

/** Paso de las flechas del teclado, en píxeles de la vista previa. */
const PASO_TECLADO = 24;

/**
 * Vista previa 16:9 de la portada elegida (EncuadrePortada en Android). Dibuja exactamente el rectángulo que
 * `recortar` guardará, así lo que se ve es lo que se sube. Con un dedo o el ratón se arrastra; con dos dedos o la
 * rueda se acerca; con el teclado, las flechas mueven y + / − acercan o alejan.
 */
export function EditorPortada({ imagen, encuadre, onEncuadre, deshabilitado = false }: Props) {
  const marco = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [anchoMarco, setAnchoMarco] = useState(0);
  const idAyuda = useId();

  // Los manejadores leen siempre el encuadre vigente sin volver a registrarse.
  const actual = useRef({ encuadre, onEncuadre, deshabilitado, anchoMarco });
  actual.current = { encuadre, onEncuadre, deshabilitado, anchoMarco };
  const punteros = useRef(new Map<number, { x: number; y: number }>());

  useLayoutEffect(() => {
    const elemento = marco.current;
    if (!elemento) return;
    const medir = () => setAnchoMarco(elemento.clientWidth);
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    const c = lienzo.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || anchoMarco <= 0) return;
    const densidad = window.devicePixelRatio || 1;
    c.width = Math.round(anchoMarco * densidad);
    c.height = Math.round((anchoMarco / PROPORCION) * densidad);
    const r = rectanguloRecorte(imagen.width, imagen.height, encuadre);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imagen, r.x, r.y, r.ancho, r.alto, 0, 0, c.width, c.height);
  }, [imagen, encuadre, anchoMarco]);

  // La rueda acerca solo sobre la vista previa; React registra `wheel` como pasivo, por eso va a mano.
  useEffect(() => {
    const elemento = marco.current;
    if (!elemento) return;
    const alGirarRueda = (e: WheelEvent) => {
      const { encuadre: e0, onEncuadre: cambiar, deshabilitado: bloqueado } = actual.current;
      if (bloqueado) return;
      e.preventDefault();
      cambiar(conZoom(e0, e0.zoom * Math.exp(-e.deltaY * 0.0015)));
    };
    elemento.addEventListener('wheel', alGirarRueda, { passive: false });
    return () => elemento.removeEventListener('wheel', alGirarRueda);
  }, []);

  function mover(dx: number, dy: number) {
    const { encuadre: e0, onEncuadre: cambiar, anchoMarco: ancho } = actual.current;
    cambiar(moverEncuadre(e0, dx, dy, ancho, imagen.width, imagen.height));
  }

  function alPresionar(e: PointerEvent<HTMLDivElement>) {
    if (deshabilitado) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    const anterior = punteros.current.get(e.pointerId);
    if (!anterior || deshabilitado) return;
    const lista = [...punteros.current.entries()];
    if (lista.length === 1) {
      mover(e.clientX - anterior.x, e.clientY - anterior.y);
    } else if (lista.length === 2) {
      // Pellizco: el zoom cambia en la proporción en que cambia la distancia entre los dos dedos.
      const otro = lista.find(([id]) => id !== e.pointerId)![1];
      const antes = Math.hypot(anterior.x - otro.x, anterior.y - otro.y);
      const ahora = Math.hypot(e.clientX - otro.x, e.clientY - otro.y);
      if (antes > 0) {
        const { encuadre: e0, onEncuadre: cambiar } = actual.current;
        cambiar(conZoom(e0, e0.zoom * (ahora / antes)));
      }
    }
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    punteros.current.delete(e.pointerId);
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (deshabilitado) return;
    const acciones: Record<string, () => void> = {
      ArrowLeft: () => mover(PASO_TECLADO, 0),
      ArrowRight: () => mover(-PASO_TECLADO, 0),
      ArrowUp: () => mover(0, PASO_TECLADO),
      ArrowDown: () => mover(0, -PASO_TECLADO),
      '+': () => onEncuadre(conZoom(encuadre, encuadre.zoom + 0.1)),
      '=': () => onEncuadre(conZoom(encuadre, encuadre.zoom + 0.1)),
      '-': () => onEncuadre(conZoom(encuadre, encuadre.zoom - 0.1)),
    };
    const accion = acciones[e.key];
    if (!accion) return;
    e.preventDefault();
    accion();
  }

  return (
    <div className={estilos.editor}>
      {/* Control propio de arrastre y teclado: no hay un elemento nativo equivalente. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={marco}
        className={[estilos.marco, deshabilitado ? estilos.bloqueado : ''].join(' ')}
        // Control propio: se enfoca con Tab y se maneja con flechas y + / − (el lector cede esas teclas).
        tabIndex={deshabilitado ? -1 : 0}
        role="application"
        aria-roledescription="editor de portada"
        aria-label="Vista previa de la portada"
        aria-describedby={idAyuda}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onKeyDown={alTeclear}
      >
        <canvas ref={lienzo} className={estilos.lienzo} aria-hidden="true" />
      </div>
      <p id={idAyuda} className={estilos.ayuda}>
        Arrastra la imagen para moverla y acércala con la rueda, con dos dedos o con el control. Con el teclado: flechas
        para mover y + / − para acercar. Se guarda en 16:9 tal como la ves.
      </p>
      <label className={estilos.zoom}>
        <span>Acercar</span>
        <input
          type="range"
          min={1}
          max={ZOOM_MAXIMO}
          step={0.01}
          value={encuadre.zoom}
          disabled={deshabilitado}
          onChange={(e) => onEncuadre(conZoom(encuadre, Number(e.target.value)))}
          aria-valuetext={`${encuadre.zoom.toFixed(1)} veces`}
        />
      </label>
    </div>
  );
}
