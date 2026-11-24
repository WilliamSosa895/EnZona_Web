import { Suspense } from "react";
import { CalendarX2 } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { TarjetaEvento } from "@/components/eventos/TarjetaEvento";
import { Esqueleto, EstadoVacio } from "@/components/ui/Estados";
import { Aviso } from "@/components/ui/Superficies";
import { BotonEnlace } from "@/components/ui/Boton";
import { Revelar } from "@/components/ui/Revelar";
import { ErrorEnZona } from "@/lib/api/errores";
import { RUTAS } from "@/lib/rutas";
import { categorias, eventosPublicados } from "@/features/eventos/api";
import { FilaFiltros } from "@/features/catalogo/FilaFiltros";
import { GuiaDePantalla } from "@/features/guias/GuiaDePantalla";
import { PASOS_INICIO } from "@/features/guias/pasos";
import { aFiltrosApi, filtrarEnCliente, lugaresDe, tieneUbicacion, type ParametrosInicio } from "@/features/catalogo/filtros";

/*
 * Inicio (RF-05 a RF-07, RF-19): catálogo de eventos publicados con zona,
 * búsqueda y filtros. En escritorio, rejilla de 2 o 3 tarjetas; en móvil, una
 * columna como en la app.
 */

export default async function PaginaInicio({ searchParams }: { searchParams: Promise<ParametrosInicio> }) {
  const parametros = await searchParams;
  return (
    <Cascaron>
      <Suspense fallback={<EsqueletoInicio />}>
        <Catalogo parametros={parametros} />
      </Suspense>
    </Cascaron>
  );
}

async function Catalogo({ parametros }: { parametros: ParametrosInicio }) {
  const [listaCategorias, resultado] = await Promise.all([
    categorias().catch(() => []),
    eventosPublicados(aFiltrosApi(parametros)).then(
      (lista) => ({ ok: true as const, eventos: lista.elementos }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
  ]);

  const todos = resultado.ok ? resultado.eventos : [];
  const eventos = filtrarEnCliente(todos, parametros);
  const lugares = lugaresDe(todos);

  return (
    <div className="flex flex-col gap-6">
      <GuiaDePantalla clave="inicio" pasos={PASOS_INICIO} />
      <FilaFiltros parametros={parametros} categorias={listaCategorias} lugares={lugares} />

      {!resultado.ok ? (
        <Aviso
          tono="error"
          titulo="No pudimos cargar los eventos"
          accion={
            <BotonEnlace href={RUTAS.inicio} variante="contorno" tamano="compacto">
              Reintentar
            </BotonEnlace>
          }
        >
          {resultado.error instanceof ErrorEnZona ? resultado.error.message : "Inténtalo de nuevo en un momento."}
        </Aviso>
      ) : eventos.length === 0 ? (
        <EstadoVacio
          icono={<CalendarX2 />}
          titulo={
            todos.length === 0
              ? "Aún no hay eventos publicados"
              : parametros.zona
                ? `No hay eventos publicados en ${parametros.zona}`
                : "Ningún evento coincide con los filtros"
          }
          descripcion={
            tieneUbicacion(parametros)
              ? "Prueba a quitar «Cerca de mí» o explora los eventos de Orizaba."
              : "Prueba con otra zona, otra fecha o quita algún filtro."
          }
          accion={
            <BotonEnlace href={RUTAS.inicio} variante="contorno">
              Explorar Orizaba
            </BotonEnlace>
          }
        />
      ) : (
        <>
          <p className="text-[17px] text-gris-texto" aria-live="polite">
            {eventos.length === 1 ? "1 evento publicado" : `${eventos.length} eventos publicados`}
            {tieneUbicacion(parametros) ? " · ordenados por cercanía" : ""}
          </p>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {eventos.map((evento, indice) => (
              <Revelar as="li" key={evento.id} orden={indice % 6} className="flex">
                <div className="flex w-full" data-guia={indice === 0 ? "inicio_evento" : undefined}>
                  <TarjetaEvento evento={evento} prioridad={indice < 3} />
                </div>
              </Revelar>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function EsqueletoInicio() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando eventos">
      <Esqueleto className="h-10 w-72" />
      <Esqueleto className="h-14 w-full rounded-pildora" />
      <div className="flex gap-2">
        <Esqueleto className="h-11 w-32 rounded-pildora" />
        <Esqueleto className="h-11 w-24 rounded-pildora" />
        <Esqueleto className="h-11 w-28 rounded-pildora" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, indice) => (
          <div key={indice} className="overflow-hidden rounded-tarjeta bg-superficie">
            <Esqueleto className="aspect-video w-full rounded-none" />
            <div className="flex flex-col gap-3 p-5">
              <Esqueleto className="h-6 w-3/4" />
              <Esqueleto className="h-4 w-1/2" />
              <Esqueleto className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
