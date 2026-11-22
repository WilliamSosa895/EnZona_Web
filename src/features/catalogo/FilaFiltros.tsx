"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Check, ChevronDown, LocateFixed, MapPin, Search, X } from "lucide-react";
import type { CategoriaDto } from "@/lib/api/tipos";
import { cn } from "@/lib/cn";
import { CIUDAD_POR_DEFECTO } from "@/lib/capacidades";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { FILTROS_FECHA, contarFiltrosActivos, type ParametrosInicio } from "./filtros";

/*
 * Cabecera de Inicio: zona (ciudad a mano, RNF-11), búsqueda por texto y los
 * chips Cerca de mí · Gratis · De pago · Fecha · Lugar · Tipo, con contador y
 * «Limpiar filtros». «Cerca de mí» pide el permiso de ubicación solo al tocarlo
 * (RF-19); si se niega, se sigue filtrando por ciudad (CP-18).
 */

interface Props {
  parametros: ParametrosInicio;
  categorias: CategoriaDto[];
  lugares: string[];
}

export function FilaFiltros({ parametros, categorias, lugares }: Props) {
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="titulo-vivo text-[2.25rem] leading-[1.05] font-black tracking-tight text-tinta sm:text-[3.25rem]">
            Eventos cerca de ti
          </h1>
          <p className="titulo-vivo text-[17px] text-gris-texto [animation-delay:120ms] sm:text-lg">
            Descubre, compra y entra con tu QR. Sin cargos escondidos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setZonaAbierta(true)}
          className="chip-vivo flex h-11 cursor-pointer items-center gap-2 rounded-pildora px-2 text-[17px] text-tinta hover:bg-tinte-50"
          aria-label={`Zona: ${parametros.zona || CIUDAD_POR_DEFECTO}. Cambiar zona`}
        >
          <MapPin className="size-6 text-profundo" aria-hidden="true" />
          <span>{parametros.zona || `${CIUDAD_POR_DEFECTO}, Veracruz`}</span>
          <ChevronDown className="size-5 text-profundo" aria-hidden="true" />
        </button>
      </div>

      <div className="relative">
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

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sin-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
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
          etiqueta="Lugar"
          valor={parametros.lugar}
          opciones={lugares.map((lugar) => ({ valor: lugar, texto: lugar }))}
          onElegir={(valor) => actualizar({ lugar: valor })}
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
            onClick={() => actualizar({ pago: null, fecha: null, lugar: null, tipo: null, lat: null, lng: null })}
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

function ChipMenu({ etiqueta, valor, opciones, onElegir }: PropsChipMenu) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const textoActual = opciones.find((opcion) => opcion.valor === valor)?.texto;

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (evento: MouseEvent | KeyboardEvent) => {
      if (evento instanceof KeyboardEvent && evento.key !== "Escape") return;
      if (evento instanceof MouseEvent && contenedor.current?.contains(evento.target as Node)) return;
      setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", cerrar);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", cerrar);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className="relative shrink-0">
      <Chip
        activo={Boolean(valor)}
        onClick={() => setAbierto((estado) => !estado)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        icono={valor ? undefined : undefined}
      >
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
      {abierto ? (
        <ul
          role="listbox"
          aria-label={etiqueta}
          className="absolute top-full left-0 z-20 mt-2 max-h-72 min-w-56 overflow-y-auto rounded-tarjeta bg-superficie p-2 shadow-flotante"
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
                      setAbierto(false);
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
        </ul>
      ) : null}
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
  const [zona, setZona] = useState(zonaActual);
  return (
    <Dialogo
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Tu zona"
      acciones={
        <>
          <Boton variante="contorno" onClick={() => onGuardar("")}>
            Usar {CIUDAD_POR_DEFECTO}
          </Boton>
          <Boton onClick={() => onGuardar(zona.trim())}>Guardar</Boton>
        </>
      }
    >
      <p>Los eventos se filtran por la ciudad que elijas. Escribe el nombre tal como aparece en los eventos.</p>
      <Campo
        etiqueta="Ciudad"
        value={zona}
        onChange={(evento) => setZona(evento.target.value)}
        placeholder={CIUDAD_POR_DEFECTO}
        autoFocus
      />
    </Dialogo>
  );
}
