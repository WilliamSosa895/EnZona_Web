"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, LocateFixed, MapPin, Search, X } from "lucide-react";
import type { CategoriaDto } from "@/lib/api/tipos";
import { cn } from "@/lib/cn";
import { CIUDAD_POR_DEFECTO } from "@/lib/capacidades";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { LogoEnZona } from "@/components/marca/LogoEnZona";
import { CampanaBoleto } from "@/components/marca/CampanaBoleto";
import Link from "next/link";
import { RUTAS } from "@/lib/rutas";
import { FILTROS_FECHA, ZONAS_DE_MUESTRA, contarFiltrosActivos, type ParametrosInicio } from "./filtros";

/*
 * Cabecera de Inicio: zona (ciudad a mano, RNF-11), búsqueda por texto y los
 * chips Cerca de mí · Gratis · De pago · Fecha · Tipo, con contador y
 * «Limpiar filtros». «Cerca de mí» pide el permiso de ubicación solo al tocarlo
 * (RF-19); si se niega, se sigue filtrando por ciudad (CP-18).
 */

interface Props {
  parametros: ParametrosInicio;
  categorias: CategoriaDto[];
}

export function FilaFiltros({ parametros, categorias }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const actuales = useSearchParams();
  const [pendiente, iniciarTransicion] = useTransition();
  const [zonaAbierta, setZonaAbierta] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState(parametros.q ?? "");
  const primeraVez = useRef(true);

  const actualizar = (cambios: Partial<Record<keyof ParametrosInicio, string | null>>) => {
    const siguientes = new URLSearchParams(actuales.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null || valor === undefined || valor === "") siguientes.delete(clave);
      else siguientes.set(clave, valor);
    }
    const consulta = siguientes.toString();
    iniciarTransicion(() => router.replace(consulta ? `${ruta}?${consulta}` : ruta, { scroll: false }));
  };

  // La búsqueda por texto se aplica con una pequeña espera para no pedir en cada tecla.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    const temporizador = setTimeout(() => {
      if ((parametros.q ?? "") !== textoBusqueda.trim()) actualizar({ q: textoBusqueda.trim() || null });
    }, 350);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoBusqueda]);

  const conUbicacion = Boolean(parametros.lat && parametros.lng);
  const activos = contarFiltrosActivos(parametros);

  const pedirUbicacion = () => {
    setErrorUbicacion(null);
    if (conUbicacion) {
      actualizar({ lat: null, lng: null });
      return;
    }
    if (!("geolocation" in navigator)) {
      setErrorUbicacion("Tu navegador no permite usar la ubicación. Seguimos mostrando eventos por ciudad.");
      return;
    }
    setBuscandoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setBuscandoUbicacion(false);
        actualizar({
          lat: posicion.coords.latitude.toFixed(5),
          lng: posicion.coords.longitude.toFixed(5),
        });
      },
      () => {
        setBuscandoUbicacion(false);
        setErrorUbicacion("Sin permiso de ubicación. Seguimos mostrando los eventos de tu ciudad.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between md:hidden">
        <LogoEnZona alto={40} />
        <Link
          href={RUTAS.notificaciones}
          aria-label="Notificaciones"
          className="chip-vivo flex size-11 items-center justify-center rounded-pildora hover:bg-tinte-50"
        >
          <CampanaBoleto />
        </Link>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="titulo-vivo text-[2rem] leading-[1.05] font-black tracking-tight text-tinta sm:text-[3.25rem]">
            Eventos cerca de ti
          </h1>
          <p className="titulo-vivo hidden text-[17px] text-gris-texto [animation-delay:120ms] sm:text-lg md:block">
            Descubre, compra y entra con tu QR. Sin cargos escondidos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setZonaAbierta(true)}
          data-guia="inicio_zona"
          className="chip-vivo flex h-11 cursor-pointer items-center gap-2 rounded-pildora px-2 text-[17px] text-tinta hover:bg-tinte-50"
          aria-label={`Zona: ${parametros.zona || CIUDAD_POR_DEFECTO}. Cambiar zona`}
        >
          <MapPin className="size-6 text-profundo" aria-hidden="true" />
          <span>{parametros.zona || `${CIUDAD_POR_DEFECTO}, Veracruz`}</span>
          <ChevronDown className="size-5 text-profundo" aria-hidden="true" />
        </button>
      </div>

      <div className="relative" data-guia="inicio_busqueda">
        <Search className="pointer-events-none absolute inset-y-0 left-5 my-auto size-6 text-gris-texto" aria-hidden="true" />
        <input
          type="search"
          value={textoBusqueda}
          onChange={(evento) => setTextoBusqueda(evento.target.value)}
          placeholder="Buscar evento o lugar"
          aria-label="Buscar evento o lugar"
          className="h-14 w-full rounded-pildora border border-gris-suave bg-superficie pr-5 pl-14 text-[17px] text-tinta outline-none placeholder:text-gris-texto focus:border-profundo focus:ring-2 focus:ring-profundo/30"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sin-scrollbar sm:mx-0 sm:flex-wrap sm:px-0" data-guia="inicio_filtros">
        <Chip
          activo={conUbicacion}
          onClick={pedirUbicacion}
          icono={<LocateFixed className={cn("size-[18px]", buscandoUbicacion && "animate-pulse")} aria-hidden="true" />}
          aria-pressed={conUbicacion}
        >
          Cerca de mí
        </Chip>
        <Chip
          activo={parametros.pago === "gratis"}
          onClick={() => actualizar({ pago: parametros.pago === "gratis" ? null : "gratis" })}
          aria-pressed={parametros.pago === "gratis"}
        >
          Gratis
        </Chip>
        <Chip
          activo={parametros.pago === "de-pago"}
          onClick={() => actualizar({ pago: parametros.pago === "de-pago" ? null : "de-pago" })}
          aria-pressed={parametros.pago === "de-pago"}
        >
          De pago
        </Chip>
        <ChipMenu
          etiqueta="Fecha"
          valor={parametros.fecha}
          opciones={FILTROS_FECHA.map((opcion) => ({ valor: opcion.valor, texto: opcion.texto }))}
          onElegir={(valor) => actualizar({ fecha: valor })}
        />
        <ChipMenu
          etiqueta="Tipo"
          valor={parametros.tipo}
          opciones={categorias.map((categoria) => ({ valor: String(categoria.id), texto: categoria.nombre }))}
          onElegir={(valor) => actualizar({ tipo: valor })}
        />
      </div>

      {activos > 0 ? (
        <div className="flex items-center gap-3 text-[15px] text-gris-texto">
          <span>
            {activos} {activos === 1 ? "filtro activo" : "filtros activos"}
          </span>
          <button
            type="button"
            onClick={() => actualizar({ pago: null, fecha: null, tipo: null, lat: null, lng: null })}
            className="cursor-pointer font-medium text-profundo hover:underline"
          >
            Limpiar filtros
          </button>
          {pendiente ? <span className="sr-only">Actualizando resultados</span> : null}
        </div>
      ) : null}

      {errorUbicacion ? (
        <p role="status" className="text-[15px] text-gris-texto">
          {errorUbicacion}
        </p>
      ) : null}

      <DialogoZona
        key={`${zonaAbierta ? "abierto" : "cerrado"}:${parametros.zona ?? ""}`}
        abierto={zonaAbierta}
        onCerrar={() => setZonaAbierta(false)}
        zonaActual={parametros.zona ?? ""}
        onGuardar={(zona) => {
          setZonaAbierta(false);
          actualizar({ zona: zona || null, lat: null, lng: null });
        }}
      />
    </div>
  );
}

interface PropsChip {
  activo?: boolean;
  onClick?: () => void;
  icono?: ReactNode;
  children: ReactNode;
  "aria-pressed"?: boolean;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: "menu" | "listbox";
}

function Chip({ activo, onClick, icono, children, ...aria }: PropsChip) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...aria}
      className={cn(
        "chip-vivo flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-pildora border px-4 text-[15px] font-medium",
        activo
          ? "border-marino bg-marino text-blanco"
          : "border-gris-suave bg-superficie text-tinta hover:bg-superficie-alta",
      )}
    >
      {icono}
      {children}
    </button>
  );
}

interface PropsChipMenu {
  etiqueta: string;
  valor: string | undefined;
  opciones: { valor: string; texto: string }[];
  onElegir: (valor: string | null) => void;
}

const ANCHO_MENU = 224;
const ALTO_MAXIMO_MENU = 288;
const SEPARACION_MENU = 8;

/**
 * Chip con menú desplegable (ChipDesplegable de la app). El menú se pinta en
 * `document.body` con posición fija: la fila de chips se desplaza en horizontal
 * y recortaría cualquier cosa que colgara de ella.
 */
function ChipMenu({ etiqueta, valor, opciones, onElegir }: PropsChipMenu) {
  const [posicion, setPosicion] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const abierto = posicion !== null;
  const textoActual = opciones.find((opcion) => opcion.valor === valor)?.texto;

  // Debajo del chip, alineado a su izquierda y dentro de la pantalla; encima si abajo no cabe
  const colocar = () => {
    const caja = chipRef.current?.getBoundingClientRect();
    if (!caja) return;
    const left = Math.max(16, Math.min(caja.left, window.innerWidth - ANCHO_MENU - 16));
    const cabeDebajo = caja.bottom + SEPARACION_MENU + ALTO_MAXIMO_MENU <= window.innerHeight;
    setPosicion(cabeDebajo ? { left, top: caja.bottom + SEPARACION_MENU } : { left, bottom: window.innerHeight - caja.top + SEPARACION_MENU });
  };
  const cerrar = () => setPosicion(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: PointerEvent) => {
      const objetivo = evento.target as Node;
      if (chipRef.current?.contains(objetivo) || listaRef.current?.contains(objetivo)) return;
      cerrar();
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrar();
    };
    // Al desplazar la página o la fila de chips (al enfocar el chip el navegador la mueve), el menú sigue al chip
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", colocar, { capture: true, passive: true });
    window.addEventListener("resize", colocar);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", colocar, true);
      window.removeEventListener("resize", colocar);
    };
  }, [abierto]);

  return (
    <div ref={chipRef} className="shrink-0">
      <Chip activo={Boolean(valor)} onClick={abierto ? cerrar : colocar} aria-expanded={abierto} aria-haspopup="listbox">
        {textoActual ?? etiqueta}
        {valor ? (
          <X
            className="size-4"
            aria-hidden="true"
            onClick={(evento) => {
              evento.stopPropagation();
              onElegir(null);
            }}
          />
        ) : (
          <ChevronDown className="size-4" aria-hidden="true" />
        )}
      </Chip>
      {abierto
        ? createPortal(
            <ul
              ref={listaRef}
              role="listbox"
              aria-label={etiqueta}
              style={posicion}
              className="fixed z-40 max-h-72 w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-tarjeta bg-superficie p-2 shadow-flotante animate-[aparecer_150ms_ease-out]"
            >
              {opciones.length === 0 ? (
                <li className="px-3 py-2 text-[15px] text-gris-texto">Sin opciones</li>
              ) : (
                opciones.map((opcion) => {
                  const elegido = opcion.valor === valor;
                  return (
                    <li key={opcion.valor} role="option" aria-selected={elegido}>
                      <button
                        type="button"
                        onClick={() => {
                          onElegir(elegido ? null : opcion.valor);
                          cerrar();
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between gap-3 rounded-campo px-3 py-2.5 text-left text-[15px] hover:bg-tinte-50",
                          elegido ? "font-medium text-marino" : "text-tinta",
                        )}
                      >
                        <span>{opcion.texto}</span>
                        {elegido ? <Check className="size-4" aria-hidden="true" /> : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

function DialogoZona({
  abierto,
  onCerrar,
  zonaActual,
  onGuardar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  zonaActual: string;
  onGuardar: (zona: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const actual = zonaActual || ZONAS_DE_MUESTRA[0];
  // La zona por defecto se guarda vacía (Orizaba); las demás, con su texto completo
  const elegir = (zona: string) => onGuardar(zona === ZONAS_DE_MUESTRA[0] ? "" : zona);
  return (
    <Dialogo
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="¿En qué zona buscas?"
      acciones={
        <>
          <Boton variante="texto" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="texto" disabled={texto.trim() === ""} onClick={() => elegir(texto.trim())}>
            Usar esta zona
          </Boton>
        </>
      }
    >
      <p>Elige una zona o escribe la tuya. No hace falta activar la ubicación del teléfono.</p>
      <ul className="-mx-2 flex flex-col">
        {ZONAS_DE_MUESTRA.map((zona) => {
          const elegida = zona === actual;
          return (
            <li key={zona}>
              <button
                type="button"
                onClick={() => elegir(zona)}
                aria-current={elegida ? "true" : undefined}
                className="flex h-control w-full cursor-pointer items-center justify-between gap-3 rounded-campo px-2 text-left text-[17px] text-tinta hover:bg-superficie-alta"
              >
                <span>{zona}</span>
                {elegida ? <Check className="size-5 text-marino" aria-label="Zona actual" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <Campo
        etiqueta="Otra ciudad o colonia"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === "Enter" && texto.trim() !== "") {
            evento.preventDefault();
            elegir(texto.trim());
          }
        }}
      />
      <p className="text-sm">
        El área de estudio es {CIUDAD_POR_DEFECTO}. Si eliges otra ciudad y no hay eventos, podrás volver a {CIUDAD_POR_DEFECTO} desde aquí.
      </p>
    </Dialogo>
  );
}
