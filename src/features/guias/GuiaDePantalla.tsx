"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import {
  abajo,
  guiaVista,
  inflar,
  marcarGuiaVista,
  posicionTarjeta,
  trazarFlecha,
  trazoFlecha,
  trazoSombra,
  type Caja,
  type PasoGuia,
  type Tamano,
} from "./guias";
import { almacenGuias, buscarObjetivo, usuarioActual } from "./navegador";

/*
 * Guía interactiva de una pantalla (GuiaInteractiva.kt). Se abre sola la
 * primera vez que la cuenta entra a la pantalla; cada paso oscurece la página,
 * recorta un foco alrededor del objetivo (`data-guia`), lo trae a la vista y
 * dibuja una flecha desde el texto. Tocar en cualquier parte pasa al siguiente
 * paso; «Omitir» o «Entendido» la marcan como vista.
 */

const ESPERA_ANTES_DE_ABRIR_MS = 450;
const MARGEN_FOCO = 8;
const SEPARACION_TEXTO = 84;
const MARGEN_PANTALLA = 24;
const GROSOR_FLECHA = 5;
const PUNTA_FLECHA = 22;
const ANCHO_MAXIMO_TEXTO = 448;
const PROPORCION_MAXIMA_FOCO = 0.45;
/** Alto de la barra de botones (py-3 + h-11); el texto nunca se coloca debajo de ella. */
const ALTO_BARRA = 68;
const ATRIBUTO_ACTIVA = "data-guia-activa";

interface Props {
  clave: string;
  pasos: PasoGuia[];
  /** `false` la pospone (por ejemplo, hasta que terminen de cargar los datos). */
  activa?: boolean;
}

export function GuiaDePantalla({ clave, pasos, activa = true }: Props) {
  const [visibles, setVisibles] = useState<PasoGuia[] | null>(null);
  const usuarioRef = useRef<string | null>(null);
  const pasosRef = useRef(pasos);
  const firma = JSON.stringify(pasos);

  useEffect(() => {
    pasosRef.current = pasos;
  });

  useEffect(() => {
    if (!activa || pasos.length === 0) return;
    const temporizador = setTimeout(() => {
      const usuario = usuarioActual();
      if (!usuario || guiaVista(almacenGuias(), usuario, clave)) return;
      if (document.querySelector(`[${ATRIBUTO_ACTIVA}]`)) return;
      // Pasos cuyo objetivo no está en pantalla (por tamaño o por estado) se saltan
      const posibles = pasosRef.current.filter((paso) => !paso.objetivo || buscarObjetivo(paso.objetivo));
      if (posibles.length === 0) return;
      usuarioRef.current = usuario;
      setVisibles(posibles);
    }, ESPERA_ANTES_DE_ABRIR_MS);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa, clave, firma]);

  if (!visibles) return null;

  const terminar = () => {
    if (usuarioRef.current) marcarGuiaVista(almacenGuias(), usuarioRef.current, clave);
    setVisibles(null);
  };

  return createPortal(<Superposicion pasos={visibles} onTerminar={terminar} />, document.body);
}

function Superposicion({ pasos, onTerminar }: { pasos: PasoGuia[]; onTerminar: () => void }) {
  const [indice, setIndice] = useState(0);
  const [pantalla, setPantalla] = useState<Tamano>(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [foco, setFoco] = useState<Caja | null>(null);
  const textoRef = useRef<HTMLDivElement>(null);
  const curvaRef = useRef<SVGPathElement>(null);
  const alasRef = useRef<SVGPathElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  const paso = pasos[indice];
  const ultimo = indice === pasos.length - 1;
  const siguiente = () => {
    if (ultimo) onTerminar();
    else setIndice((actual) => actual + 1);
  };

  // Mide el objetivo del paso; si está fuera de la zona visible, lo trae a la vista primero.
  useEffect(() => {
    const medir = () => {
      setPantalla({ width: window.innerWidth, height: window.innerHeight });
      const elemento = paso.objetivo ? buscarObjetivo(paso.objetivo) : null;
      if (!elemento) {
        setFoco(null);
        return;
      }
      const caja = elemento.getBoundingClientRect();
      // Un objetivo más alto que media pantalla (una tarjeta larga) se recorta por arriba para que el texto quepa debajo
      const altoMaximo = window.innerHeight * PROPORCION_MAXIMA_FOCO;
      setFoco({ left: caja.left, top: caja.top, width: caja.width, height: Math.min(caja.height, altoMaximo) });
    };
    const elemento = paso.objetivo ? buscarObjetivo(paso.objetivo) : null;
    if (elemento) {
      const caja = elemento.getBoundingClientRect();
      const alto = caja.height > window.innerHeight * PROPORCION_MAXIMA_FOCO;
      if (alto || caja.top < MARGEN_PANTALLA || caja.bottom > window.innerHeight - MARGEN_PANTALLA) {
        const reducida = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        elemento.scrollIntoView({ block: alto ? "start" : "center", behavior: reducida ? "auto" : "smooth" });
      }
    }
    const marco = requestAnimationFrame(medir);
    const temporizadores = [120, 320, 600, 900].map((ms) => setTimeout(medir, ms));
    window.addEventListener("scroll", medir, { passive: true, capture: true });
    window.addEventListener("resize", medir);
    return () => {
      cancelAnimationFrame(marco);
      temporizadores.forEach(clearTimeout);
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [paso]);

  useEffect(() => {
    botonRef.current?.focus({ preventScroll: true });
  }, [indice]);

  const recorte = foco ? inflar(foco, MARGEN_FOCO) : null;
  // La barra de botones va abajo, salvo que el foco esté ahí (barra de navegación): entonces arriba
  const barraArriba = recorte !== null && abajo(recorte) > pantalla.height * 0.8;
  const reserva = barraArriba ? { arriba: ALTO_BARRA, abajo: 0 } : { arriba: 0, abajo: ALTO_BARRA };

  // Coloca el texto y traza la flecha sin pasar por el estado (medidas del propio texto).
  useLayoutEffect(() => {
    const texto = textoRef.current;
    if (!texto) return;
    const tamano = { width: texto.offsetWidth, height: texto.offsetHeight };
    const base = posicionTarjeta(recorte, pantalla, tamano, SEPARACION_TEXTO, MARGEN_PANTALLA, reserva);
    // Sin foco el texto va centrado; con foco, alineado al margen izquierdo como en un apunte a mano
    const posicion = recorte ? { x: MARGEN_PANTALLA, y: base.y } : base;
    texto.style.transform = `translate(${posicion.x}px, ${posicion.y}px)`;
    if (recorte) {
      const flecha = trazarFlecha({ left: posicion.x, top: posicion.y, ...tamano }, recorte, pantalla);
      const trazo = trazoFlecha(flecha, PUNTA_FLECHA);
      curvaRef.current?.setAttribute("d", trazo.curva);
      alasRef.current?.setAttribute("d", trazo.alas);
    } else {
      curvaRef.current?.setAttribute("d", "");
      alasRef.current?.setAttribute("d", "");
    }
  });

  // Con un foco angosto el texto deja sitio a la derecha para la flecha; con uno ancho (fila de chips) usa casi todo el ancho
  const focoAngosto = recorte !== null && recorte.width < pantalla.width * 0.6;
  const anchoTexto = Math.min(focoAngosto ? pantalla.width * 0.66 : pantalla.width - MARGEN_PANTALLA * 2, ANCHO_MAXIMO_TEXTO);

  const teclado = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === "Escape") {
      evento.preventDefault();
      onTerminar();
      return;
    }
    if (evento.key !== "Tab" || !dialogoRef.current) return;
    const botones = [...dialogoRef.current.querySelectorAll<HTMLButtonElement>("button")];
    if (botones.length === 0) return;
    const primero = botones[0];
    const ultimoBoton = botones[botones.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimoBoton.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimoBoton) {
      evento.preventDefault();
      primero.focus();
    }
  };

  return (
    <div
      ref={dialogoRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Guía, paso ${indice + 1} de ${pasos.length}: ${paso.titulo}. Toca para continuar`}
      {...{ [ATRIBUTO_ACTIVA]: "" }}
      className="fixed inset-0 z-50 cursor-pointer select-none"
      onClick={siguiente}
      onKeyDown={teclado}
    >
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${pantalla.width} ${pantalla.height}`} aria-hidden="true">
        <path d={trazoSombra(pantalla, recorte, MARGEN_FOCO * 2)} fill="#1b2432" fillOpacity="0.95" fillRule="evenodd" />
        <path ref={curvaRef} fill="none" stroke="#ffffff" strokeWidth={GROSOR_FLECHA} strokeLinecap="round" strokeLinejoin="round" />
        <path ref={alasRef} fill="none" stroke="#ffffff" strokeWidth={GROSOR_FLECHA} strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div ref={textoRef} className="pointer-events-none absolute top-0 left-0 flex flex-col gap-2 text-blanco" style={{ width: anchoTexto }}>
        <h2 className="text-xl leading-tight font-bold sm:text-2xl">{paso.titulo}</h2>
        <p className="text-[15px] leading-relaxed text-blanco/85 sm:text-[17px]">{paso.texto}</p>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 flex items-center gap-1 px-3 py-3",
          barraArriba ? "top-0 pt-[max(0.75rem,env(safe-area-inset-top))]" : "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
        onClick={(evento) => evento.stopPropagation()}
      >
        {pasos.length > 1 ? <BotonGuia onClick={onTerminar}>Omitir</BotonGuia> : null}
        <span className="flex-1" />
        <span className="px-2 text-[15px] text-blanco/85">
          {indice + 1} de {pasos.length}
        </span>
        {indice > 0 ? <BotonGuia onClick={() => setIndice((actual) => actual - 1)}>Atrás</BotonGuia> : null}
        <BotonGuia ref={botonRef} destacado onClick={siguiente}>
          {ultimo ? "Entendido" : "Siguiente →"}
        </BotonGuia>
      </div>
    </div>
  );
}

function BotonGuia({
  ref,
  destacado,
  onClick,
  children,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  destacado?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 cursor-pointer rounded-pildora px-4 text-[15px] text-blanco hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-blanco",
        destacado ? "font-bold" : "font-medium",
      )}
    >
      {children}
    </button>
  );
}
