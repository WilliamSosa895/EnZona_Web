import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { guiaVista, marcarGuiaVista, type ClaveGuia } from './almacen';
import { GuiasContext, type PasoGuia, type ValorGuias } from './contexto';
import { alasDeFlecha, inflar, posicionTarjeta, trazarFlecha, type Flecha, type Punto, type Rect } from './geometria';
import estilos from './Guias.module.css';

interface GuiaActiva {
  clave: ClaveGuia;
  pasos: PasoGuia[];
}

/**
 * Envuelve las pantallas con sesión y dibuja la guía activa por encima de todo (AnfitrionDeGuias en Android).
 * Cada pantalla declara su recorrido con `useGuia` y marca sus zonas difíciles con `data-guia="clave"`.
 */
export function AnfitrionGuias({ children }: { children: ReactNode }) {
  const [activa, setActiva] = useState<GuiaActiva | null>(null);
  const actual = useRef<GuiaActiva | null>(null);

  const cambiar = useCallback((guia: GuiaActiva | null) => {
    actual.current = guia;
    setActiva(guia);
  }, []);

  const valor = useMemo<ValorGuias>(
    () => ({
      pedir: (clave, pasos) => {
        if (pasos.length === 0 || actual.current || guiaVista(clave)) return false;
        cambiar({ clave, pasos });
        return true;
      },
      cancelar: (clave) => {
        if (actual.current?.clave === clave) cambiar(null);
      },
    }),
    [cambiar],
  );

  const terminar = useCallback(() => {
    if (actual.current) marcarGuiaVista(actual.current.clave);
    cambiar(null);
  }, [cambiar]);

  return (
    <GuiasContext.Provider value={valor}>
      {children}
      {activa && createPortal(<Superposicion key={activa.clave} guia={activa} onTerminar={terminar} />, document.body)}
    </GuiasContext.Provider>
  );
}

// ---------------------------------------------------------------- dibujo (fondo oscuro, texto blanco y flecha)

const MARGEN_FOCO = 8;
const SEPARACION_TEXTO = 84; // deja sitio para la flecha entre el texto y el foco
const MARGEN_PANTALLA = 24;
const GROSOR_FLECHA = 5;
const PUNTA_FLECHA = 22;
const ANCHO_MAXIMO_TEXTO = 460;

interface Medidas {
  pantalla: { ancho: number; alto: number };
  foco: Rect | null;
}

function buscarObjetivo(objetivo: string | undefined): HTMLElement | null {
  if (!objetivo) return null;
  const candidatos = document.querySelectorAll<HTMLElement>(`[data-guia="${CSS.escape(objetivo)}"]`);
  // El primero visible: un mismo objetivo puede existir oculto en otra disposición de la pantalla.
  return [...candidatos].find((e) => e.getClientRects().length > 0) ?? null;
}

function medir(elemento: HTMLElement | null): Medidas {
  const pantalla = { ancho: window.innerWidth, alto: window.innerHeight };
  const r = elemento?.getBoundingClientRect();
  const foco = r && r.width > 0 && r.height > 0 ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null;
  return { pantalla, foco };
}

function Superposicion({ guia, onTerminar }: { guia: GuiaActiva; onTerminar: () => void }) {
  const [indice, setIndice] = useState(0);
  const paso = guia.pasos[indice];
  const total = guia.pasos.length;
  const ultimo = indice === total - 1;
  const [elemento, setElemento] = useState<HTMLElement | null>(null);
  const [medidas, setMedidas] = useState<Medidas>(() => medir(null));
  const [posicion, setPosicion] = useState<{ texto: Punto; flecha: Flecha | null } | null>(null);
  const texto = useRef<HTMLDivElement>(null);
  const siguienteBoton = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const idTexto = useId();
  const idMascara = useId().replace(/:/g, '');

  const siguiente = useCallback(() => (ultimo ? onTerminar() : setIndice((i) => i + 1)), [ultimo, onTerminar]);
  const atras = () => setIndice((i) => Math.max(0, i - 1));

  // Mientras la guía está abierta la pantalla de abajo no responde ni recibe el foco.
  useEffect(() => {
    const raiz = document.getElementById('root');
    const anterior = document.activeElement as HTMLElement | null;
    raiz?.setAttribute('inert', '');
    return () => {
      raiz?.removeAttribute('inert');
      anterior?.focus?.();
    };
  }, []);

  // Cada paso busca su objetivo y, si está fuera de la vista (formulario largo), lo trae a ella.
  useLayoutEffect(() => {
    const objetivo = buscarObjetivo(paso.objetivo);
    objetivo?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    setElemento(objetivo);
    setMedidas(medir(objetivo));
    siguienteBoton.current?.focus();
  }, [paso]);

  // El foco sigue al objetivo si la ventana cambia de tamaño o algo se desplaza.
  useEffect(() => {
    let cuadro = 0;
    const actualizar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => setMedidas(medir(elemento)));
    };
    window.addEventListener('resize', actualizar);
    window.addEventListener('scroll', actualizar, true);
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(actualizar);
    if (elemento) observador?.observe(elemento);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener('resize', actualizar);
      window.removeEventListener('scroll', actualizar, true);
      observador?.disconnect();
    };
  }, [elemento]);

  // El texto se mide ya dibujado y después se coloca; la flecha se traza entre su borde y el del foco.
  const recorte = medidas.foco ? inflar(medidas.foco, MARGEN_FOCO) : null;
  const anchoTexto = Math.min(
    ANCHO_MAXIMO_TEXTO,
    Math.round(medidas.pantalla.ancho * (recorte ? 0.66 : 0.8)),
    medidas.pantalla.ancho - MARGEN_PANTALLA * 2,
  );
  useLayoutEffect(() => {
    const caja = texto.current;
    if (!caja) return;
    const tarjeta = { ancho: caja.offsetWidth, alto: caja.offsetHeight };
    const punto = posicionTarjeta(recorte, medidas.pantalla, tarjeta, SEPARACION_TEXTO, MARGEN_PANTALLA);
    const limites: Rect = {
      left: punto.x,
      top: punto.y,
      right: punto.x + tarjeta.ancho,
      bottom: punto.y + tarjeta.alto,
    };
    setPosicion({ texto: punto, flecha: recorte ? trazarFlecha(limites, recorte, medidas.pantalla) : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `recorte` se deriva de `medidas`
  }, [medidas, paso, anchoTexto]);

  // La barra de botones va abajo, salvo que el foco esté ahí (barra de navegación o de compra): entonces arriba.
  const barraArriba = recorte !== null && recorte.bottom > medidas.pantalla.alto * 0.8;
  const flecha = posicion?.flecha ?? null;
  const alas = flecha ? alasDeFlecha(flecha, PUNTA_FLECHA) : null;

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onTerminar();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      siguiente();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      atras();
    } else if (e.key === 'Tab') {
      // El foco no sale de la guía: recorre solo sus botones.
      const botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
      const posicionFoco = botones.indexOf(document.activeElement as HTMLButtonElement);
      const destino = (posicionFoco + (e.shiftKey ? -1 : 1) + botones.length) % botones.length;
      e.preventDefault();
      botones[destino]?.focus();
    }
  }

  // Tocar en cualquier parte que no sea un botón pasa al siguiente paso.
  function alTocar(e: MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return;
    siguiente();
  }

  return (
    // El fondo es un atajo de ratón o táctil; con teclado se usan los botones y las flechas.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      className={estilos.superposicion}
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
      aria-describedby={idTexto}
      onKeyDown={alTeclear}
      onClick={alTocar}
      data-testid="guia"
    >
      <svg className={estilos.lienzo} width="100%" height="100%" aria-hidden="true">
        <defs>
          <mask id={idMascara}>
            <rect width="100%" height="100%" fill="white" />
            {recorte && (
              <rect
                x={recorte.left}
                y={recorte.top}
                width={recorte.right - recorte.left}
                height={recorte.bottom - recorte.top}
                rx={MARGEN_FOCO * 2}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" className={estilos.sombra} mask={`url(#${idMascara})`} />
        {flecha && (
          <g className={estilos.flecha} strokeWidth={GROSOR_FLECHA}>
            <path
              d={`M ${flecha.inicio.x} ${flecha.inicio.y} Q ${flecha.control.x} ${flecha.control.y} ${flecha.fin.x} ${flecha.fin.y}`}
            />
            {alas && (
              <path d={`M ${alas[0].x} ${alas[0].y} L ${flecha.fin.x} ${flecha.fin.y} L ${alas[1].x} ${alas[1].y}`} />
            )}
          </g>
        )}
      </svg>

      <div
        ref={texto}
        className={estilos.texto}
        style={{
          width: anchoTexto,
          left: posicion?.texto.x ?? 0,
          top: posicion?.texto.y ?? 0,
          visibility: posicion ? 'visible' : 'hidden',
        }}
        aria-live="polite"
      >
        <h2 id={idTitulo} className={estilos.titulo}>
          {paso.titulo}
        </h2>
        <p id={idTexto} className={estilos.cuerpo}>
          {paso.texto}
        </p>
      </div>

      <div className={[estilos.barra, barraArriba ? estilos.barraArriba : ''].join(' ')}>
        {total > 1 && (
          <button type="button" className={estilos.boton} onClick={onTerminar}>
            Omitir
          </button>
        )}
        <span className={estilos.contador}>
          {indice + 1} de {total}
        </span>
        {indice > 0 && (
          <button type="button" className={estilos.boton} onClick={atras}>
            Atrás
          </button>
        )}
        <button
          ref={siguienteBoton}
          type="button"
          className={[estilos.boton, estilos.principal].join(' ')}
          onClick={siguiente}
        >
          {ultimo ? 'Entendido' : 'Siguiente →'}
        </button>
      </div>
    </div>
  );
}
