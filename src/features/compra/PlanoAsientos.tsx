"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Armchair, Check, Minus, Plus, Scan, X } from "lucide-react";
import type { AsientoDto, EventoDto, TipoBoletoDto } from "@/lib/api/tipos";
import { cn } from "@/lib/cn";
import { importeMxn, totalDe } from "@/lib/formato";
import { RUTAS } from "@/lib/rutas";
import { Boton, BotonEnlace } from "@/components/ui/Boton";
import { Aviso } from "@/components/ui/Superficies";
import { BarraCompra } from "@/components/compra/BarraCompra";
import { etiquetaCorta, etiquetaLarga, faltanAsientos } from "./reglas";

/*
 * Plano del recinto (RF-09, CP-MULTI-*): escenario, secciones, filas con
 * pasillo central, butacas libres con borde azul y número, ocupadas en gris con
 * ×, elegidas en coral con palomita. Se eligen exactamente N asientos
 * («Seleccionados X de N»), con chips removibles, leyenda, zoom y selección
 * por número. Elegir no reserva: se reserva al confirmar la compra.
 */

interface Props {
  evento: EventoDto;
  tipo: TipoBoletoDto | null;
  cantidad: number;
  asientos: AsientoDto[];
}

const CLAVE_ALMACEN = (eventoId: number, tipoId: number | null, cantidad: number) =>
  `enzona:asientos:${eventoId}:${tipoId ?? 0}:${cantidad}`;

export function PlanoAsientos({ evento, tipo, cantidad, asientos }: Props) {
  const router = useRouter();
  const clave = CLAVE_ALMACEN(evento.id, tipo?.id ?? null, cantidad);
  const porId = useMemo(() => new Map(asientos.map((asiento) => [asiento.id, asiento])), [asientos]);
  // La selección sobrevive al ir al pago y volver (como rememberSaveable). Este componente
  // solo se renderiza en el navegador, así que puede leer sessionStorage al iniciar.
  const [inicial] = useState(() => cargarSeleccion(clave, porId, cantidad));
  const [seleccion, setSeleccion] = useState<number[]>(inicial.ids);
  const [aviso, setAviso] = useState<string | null>(inicial.aviso);
  const [zoom, setZoom] = useState(1);
  const [porNumero, setPorNumero] = useState("");

  useEffect(() => {
    try {
      sessionStorage.setItem(clave, JSON.stringify(seleccion));
    } catch {
      // sin almacenamiento: la selección vive solo en memoria
    }
  }, [seleccion, clave]);

  const secciones = useMemo(() => agruparPlano(asientos), [asientos]);
  const libres = asientos.filter((asiento) => asiento.estado === "DISPONIBLE").length;
  const faltan = faltanAsientos(seleccion.length, cantidad);
  const total = totalDe(tipo?.precio, cantidad);

  const alternar = (asiento: AsientoDto) => {
    setAviso(null);
    if (asiento.estado !== "DISPONIBLE") return;
    setSeleccion((actual) => {
      if (actual.includes(asiento.id)) return actual.filter((id) => id !== asiento.id);
      if (actual.length >= cantidad) {
        setAviso(
          cantidad === 1
            ? "Solo puedes elegir un asiento. Quita el actual para cambiarlo."
            : `Ya elegiste ${cantidad} asientos. Quita uno para cambiarlo.`,
        );
        return actual;
      }
      return [...actual, asiento.id];
    });
  };

  const elegirPorNumero = () => {
    const texto = porNumero.trim().toLowerCase().replace(/\s+/g, " ");
    if (!texto) return;
    const encontrado = asientos.find((asiento) => {
      const corta = etiquetaCorta(asiento).toLowerCase();
      const soloFila = `${asiento.fila ?? ""}${asiento.numero ?? ""}`.toLowerCase();
      return corta === texto || soloFila === texto || etiquetaLarga(asiento).toLowerCase() === texto;
    });
    if (!encontrado) {
      setAviso(`No hay ningún asiento «${porNumero.trim()}». Escribe fila y número, por ejemplo A5.`);
      return;
    }
    if (encontrado.estado !== "DISPONIBLE") {
      setAviso(`El asiento ${etiquetaCorta(encontrado)} ya está ocupado.`);
      return;
    }
    alternar(encontrado);
    setPorNumero("");
  };

  const continuar = () => {
    router.push(RUTAS.pago(evento.id, tipo?.id ?? null, cantidad, seleccion));
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xl font-semibold text-tinta">{evento.nombre}</p>
        <p className="text-[15px] text-gris-texto">
          {libres} asientos libres de {asientos.length}
          {tipo ? ` · ${tipo.nombre}` : ""}
        </p>
      </div>

      <section aria-live="polite" className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-tinta">
          Seleccionados {seleccion.length} de {cantidad}
        </h2>
        {seleccion.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {seleccion.map((id) => {
              const asiento = porId.get(id);
              if (!asiento) return null;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => alternar(asiento)}
                    aria-label={`Quitar ${etiquetaLarga(asiento)}`}
                    className="flex h-10 cursor-pointer items-center gap-2 rounded-pildora bg-coral-suave px-4 text-[15px] font-medium text-tinta hover:bg-[#fbd9cc]"
                  >
                    {etiquetaLarga(asiento)}
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[15px] text-gris-texto">Toca las butacas libres del plano o escribe su número.</p>
        )}
      </section>

      {aviso ? <Aviso tono="aviso">{aviso}</Aviso> : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-tinta" aria-label="Leyenda">
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md border-2 border-profundo bg-superficie text-xs font-semibold" aria-hidden="true">7</span>
          Libre
        </span>
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-tinte-100 text-gris-texto" aria-hidden="true"><X className="size-3.5" /></span>
          Ocupado
        </span>
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-coral text-tinta" aria-hidden="true"><Check className="size-4" /></span>
          Elegido
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            elegirPorNumero();
          }}
        >
          <label className="relative flex min-w-0 flex-1 items-center">
            <Armchair className="pointer-events-none absolute left-4 size-5 text-gris-texto" aria-hidden="true" />
            <span className="sr-only">Elegir asiento por número</span>
            <input
              value={porNumero}
              onChange={(evento) => setPorNumero(evento.target.value)}
              placeholder="Elegir por número"
              className="h-12 w-full rounded-pildora border border-gris-suave bg-superficie pr-4 pl-12 text-[15px] outline-none placeholder:text-gris-texto focus:border-profundo focus:ring-2 focus:ring-profundo/30"
            />
          </label>
          <Boton type="submit" variante="contorno" tamano="compacto">
            Elegir
          </Boton>
        </form>
        <div className="flex items-center gap-2" role="group" aria-label="Zoom del plano">
          <BotonZoom etiqueta="Alejar" onClick={() => setZoom((valor) => Math.max(0.7, +(valor - 0.15).toFixed(2)))}>
            <Minus className="size-5" aria-hidden="true" />
          </BotonZoom>
          <BotonZoom etiqueta="Restablecer zoom" onClick={() => setZoom(1)}>
            <Scan className="size-5" aria-hidden="true" />
          </BotonZoom>
          <BotonZoom etiqueta="Acercar" onClick={() => setZoom((valor) => Math.min(1.6, +(valor + 0.15).toFixed(2)))}>
            <Plus className="size-5" aria-hidden="true" />
          </BotonZoom>
        </div>
      </div>

      <div className="overflow-x-auto rounded-tarjeta bg-superficie-baja p-4" style={{ fontSize: `${zoom}rem` }}>
        <div className="mx-auto flex min-w-max flex-col items-center gap-[1.5em]">
          <div className="w-[min(100%,36em)] rounded-b-[3em] bg-marino py-[0.9em] text-center text-[1.05em] font-semibold text-blanco">
            Escenario
          </div>
          {secciones.map((seccion) => (
            <section key={seccion.nombre} aria-label={`Sección ${seccion.nombre}`} className="flex flex-col gap-[0.5em] self-stretch">
              <h3 className="text-[1.1em] font-semibold text-tinta">{seccion.nombre}</h3>
              <div className="flex flex-col gap-[0.35em]">
                {seccion.filas.map((fila, indiceFila) => {
                  const mitad = Math.ceil(fila.asientos.length / 2);
                  const curva = Math.abs(indiceFila - (seccion.filas.length - 1) / 2) * 0.12;
                  return (
                    <div key={fila.letra} className="flex items-center gap-[0.35em]" style={{ paddingTop: `${curva}em` }}>
                      <span className="w-[1.4em] text-[0.95em] font-medium text-gris-texto" aria-hidden="true">
                        {fila.letra}
                      </span>
                      {fila.asientos.map((asiento, indice) => (
                        <span key={asiento.id} className="flex items-center">
                          {indice === mitad && fila.asientos.length > 6 ? <span className="w-[1.2em]" aria-hidden="true" /> : null}
                          <Butaca
                            asiento={asiento}
                            elegido={seleccion.includes(asiento.id)}
                            onClick={() => alternar(asiento)}
                            desplazamiento={Math.abs(indice - (fila.asientos.length - 1) / 2) * 0.03}
                          />
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <p className="text-[15px] text-gris-texto">
        Elegir asientos no los aparta todavía: se reservan al confirmar. Si alguien toma uno antes, te avisaremos para que elijas otro.
      </p>

      <BarraCompra
        resumen={
          <>
            {seleccion.length} de {cantidad} · {importeMxn(total)} · total final
          </>
        }
        accion={
          faltan > 0 ? (
            <Boton variante="destacado" tamano="grande" ancho disabled>
              {faltan === cantidad ? `Elige ${cantidad === 1 ? "tu asiento" : `${cantidad} asientos`}` : `Faltan ${faltan} de ${cantidad}`}
            </Boton>
          ) : (
            <Boton variante="destacado" tamano="grande" ancho onClick={continuar}>
              Continuar al pago · {cantidad === 1 ? "1 boleto" : `${cantidad} boletos`}
            </Boton>
          )
        }
      />
      <BotonEnlace href={RUTAS.evento(evento.id)} variante="texto" className="self-start">
        Cambiar cantidad o tipo
      </BotonEnlace>
    </div>
  );
}

function Butaca({
  asiento,
  elegido,
  onClick,
  desplazamiento,
}: {
  asiento: AsientoDto;
  elegido: boolean;
  onClick: () => void;
  desplazamiento: number;
}) {
  const libre = asiento.estado === "DISPONIBLE";
  const etiqueta = etiquetaLarga(asiento);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!libre}
      aria-pressed={elegido}
      aria-label={`${etiqueta}, ${elegido ? "elegido" : libre ? "libre" : "ocupado"}`}
      style={{ marginTop: `${desplazamiento}em` }}
      className={cn(
        "butaca-viva flex size-[2.6em] cursor-pointer items-center justify-center rounded-[0.5em] text-[0.95em] font-semibold",
        elegido
          ? "bg-coral text-tinta"
          : libre
            ? "border-2 border-profundo bg-superficie text-tinta hover:bg-tinte-50"
            : "cursor-not-allowed bg-tinte-100 text-gris-texto",
      )}
    >
      {elegido ? <Check className="size-[1.2em]" aria-hidden="true" /> : libre ? asiento.numero : <X className="size-[1em]" aria-hidden="true" />}
    </button>
  );
}

function BotonZoom({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-tinte-50 text-marino hover:bg-tinte-100"
    >
      {children}
    </button>
  );
}

/** Lee la selección guardada y descarta los asientos que ya no están libres. */
function cargarSeleccion(clave: string, porId: Map<number, AsientoDto>, cantidad: number): { ids: number[]; aviso: string | null } {
  try {
    const guardado = sessionStorage.getItem(clave);
    if (!guardado) return { ids: [], aviso: null };
    const previos = JSON.parse(guardado) as number[];
    const ids = previos.filter((id) => porId.get(id)?.estado === "DISPONIBLE").slice(0, cantidad);
    const aviso = ids.length < previos.length && previos.length > 0 ? "Alguien tomó uno de los asientos que habías elegido. Elige otro." : null;
    return { ids, aviso };
  } catch {
    return { ids: [], aviso: null };
  }
}

interface Fila {
  letra: string;
  asientos: AsientoDto[];
}
interface Seccion {
  nombre: string;
  filas: Fila[];
}

/** Agrupa los asientos planos de la API en secciones y filas ordenadas. */
export function agruparPlano(asientos: AsientoDto[]): Seccion[] {
  const secciones = new Map<string, Map<string, AsientoDto[]>>();
  for (const asiento of asientos) {
    const nombre = asiento.seccion ?? "General";
    const letra = asiento.fila ?? "";
    let filas = secciones.get(nombre);
    if (!filas) {
      filas = new Map();
      secciones.set(nombre, filas);
    }
    const fila = filas.get(letra);
    if (fila) fila.push(asiento);
    else filas.set(letra, [asiento]);
  }
  const numero = (asiento: AsientoDto) => Number.parseInt(asiento.numero ?? "0", 10) || 0;
  return [...secciones.entries()].map(([nombre, filas]) => ({
    nombre,
    filas: [...filas.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }))
      .map(([letra, lista]) => ({ letra, asientos: [...lista].sort((a, b) => numero(a) - numero(b)) })),
  }));
}
