"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ImagePlus, LocateFixed, Plus, Trash2 } from "lucide-react";
import type { CategoriaDto, EventoDto } from "@/lib/api/tipos";
import { CENTRO_ORIZABA } from "@/lib/capacidades";
import { cn } from "@/lib/cn";
import { hoyEnZona } from "@/lib/fecha";
import { RUTAS } from "@/lib/rutas";
import { Boton } from "@/components/ui/Boton";
import { AreaTexto, Campo, Interruptor, Selector } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Estados";
import { Aviso, Tarjeta } from "@/components/ui/Superficies";
import { estiloDeCategoria } from "@/components/eventos/Portada";
import { guardarEvento, publicarEvento, quitarPortada, subirPortada } from "./acciones";
import { prepararPortada, TIPOS_PERMITIDOS } from "./imagen";
import {
  aSolicitud,
  bloqueosDe,
  sumaCantidades,
  totalAsientos,
  validarEvento,
  valoresDesdeEvento,
  valoresVacios,
  type ErroresEvento,
  type ValoresEvento,
} from "./reglas";

const MapaLeaflet = dynamic(() => import("@/components/eventos/MapaLeaflet").then((modulo) => modulo.MapaLeaflet), {
  ssr: false,
  loading: () => <Esqueleto className="h-72 w-full rounded-tarjeta" />,
});

/*
 * Nuevo / Editar evento (EventFormScreen, RF-08, RF-13): nombre y descripción,
 * portada encuadrada en 16:9, fecha y hora (calendario sin pasado, 24 h),
 * sede y dirección, ubicación exacta en el mapa (obligatoria para publicar),
 * categoría, modalidad gratuita o de pago con tipos de boleto, y asientos
 * numerados por secciones (el aforo se calcula solo).
 */

interface Props {
  evento: EventoDto | null;
  categorias: CategoriaDto[];
  portadaActual: string | null;
}

export function FormularioEvento({ evento, categorias, portadaActual }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState<ValoresEvento>(() => (evento ? valoresDesdeEvento(evento) : valoresVacios()));
  const [errores, setErrores] = useState<ErroresEvento>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();
  const [portada, setPortada] = useState<{ blob: Blob; vista: string } | null>(null);
  const [errorPortada, setErrorPortada] = useState<string | null>(null);
  const [quitarActual, setQuitarActual] = useState(false);
  const entradaArchivo = useRef<HTMLInputElement>(null);
  const bloqueos = useMemo(() => bloqueosDe(evento), [evento]);
  const hoy = useMemo(() => hoyEnZona(), []);

  useEffect(() => () => {
    if (portada) URL.revokeObjectURL(portada.vista);
  }, [portada]);

  const cambiar = <K extends keyof ValoresEvento>(campo: K, valor: ValoresEvento[K]) => {
    setValores((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
  };

  const elegirImagen = async (archivo: File | undefined) => {
    setErrorPortada(null);
    if (!archivo) return;
    try {
      const blob = await prepararPortada(archivo);
      if (portada) URL.revokeObjectURL(portada.vista);
      setPortada({ blob, vista: URL.createObjectURL(blob) });
      setQuitarActual(false);
    } catch (error) {
      setErrorPortada(error instanceof Error ? error.message : "No se pudo preparar la imagen.");
    }
  };

  const enviar = (publicar: boolean) => {
    setErrorGeneral(null);
    const validacion = validarEvento(valores, publicar, hoy);
    if (Object.keys(validacion).length > 0) {
      setErrores(validacion);
      setErrorGeneral("Revisa los campos marcados.");
      return;
    }
    iniciar(async () => {
      const enviarSecciones = !evento || (!bloqueos.plano && evento.estado === "BORRADOR");
      const resultado = await guardarEvento(aSolicitud(valores, publicar && !evento, enviarSecciones), evento?.id);
      if (!resultado.ok) {
        setErrorGeneral(resultado.error);
        return;
      }
      const guardado = resultado.datos;
      if (portada) {
        const formulario = new FormData();
        formulario.set("imagen", new File([portada.blob], "portada.jpg", { type: "image/jpeg" }));
        const subida = await subirPortada(guardado.id, formulario);
        if (!subida.ok) {
          setErrorGeneral(`El evento se guardó, pero la portada no: ${subida.error}`);
          router.push(RUTAS.panelEvento(guardado.id));
          return;
        }
      } else if (quitarActual && evento?.imagenUrl) {
        await quitarPortada(guardado.id);
      }
      if (publicar && evento && evento.estado === "BORRADOR") {
        const publicado = await publicarEvento(guardado.id);
        if (!publicado.ok) {
          setErrorGeneral(`Los cambios se guardaron, pero no se publicó: ${publicado.error}`);
          return;
        }
      }
      router.push(RUTAS.panelEvento(guardado.id));
    });
  };

  const aforoCalculado = valores.requiereAsiento ? totalAsientos(valores.secciones) : Number.parseInt(valores.aforo, 10) || 0;
  const categoriaElegida = categorias.find((categoria) => String(categoria.id) === valores.categoriaId);
  const estiloCategoria = estiloDeCategoria(categoriaElegida?.nombre);
  const faltantes = faltanParaPublicar(valores);

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(eventoFormulario) => {
        eventoFormulario.preventDefault();
        enviar(false);
      }}
    >
      {errorGeneral ? <Aviso tono="error">{errorGeneral}</Aviso> : null}

      <Campo etiqueta="Nombre del evento" value={valores.nombre} onChange={(e) => cambiar("nombre", e.target.value)} maxLength={160} required error={errores.nombre} />
      <AreaTexto etiqueta="Descripción" value={valores.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} maxLength={5000} error={errores.descripcion} ayuda="Cuenta de qué trata, para quién es y qué incluye." />

      <Tarjeta className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-tinta">Portada</h2>
        <div className={cn("relative aspect-video w-full overflow-hidden rounded-campo", estiloCategoria.fondo)}>
          {portada ? (
            // La vista previa es un blob local; next/image no aplica.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portada.vista} alt="Vista previa de la portada" className="size-full object-cover" />
          ) : portadaActual && !quitarActual ? (
            <Image src={portadaActual} alt="Portada actual" fill className="object-cover" sizes="(min-width: 768px) 640px, 100vw" unoptimized={portadaActual.startsWith("http://")} />
          ) : (
            <>
              <estiloCategoria.Icono aria-hidden="true" className={cn("absolute -right-4 -bottom-5 size-[42%] opacity-35", estiloCategoria.texto)} strokeWidth={1.4} />
              <span className={cn("absolute bottom-4 left-5 text-base font-medium", estiloCategoria.texto)}>{categoriaElegida?.nombre ?? "Sin categoría"}</span>
            </>
          )}
        </div>
        <input
          ref={entradaArchivo}
          type="file"
          accept={TIPOS_PERMITIDOS.join(",")}
          className="sr-only"
          onChange={(e) => void elegirImagen(e.target.files?.[0])}
          aria-label="Elegir imagen de portada"
        />
        <div className="flex flex-wrap gap-2">
          <Boton variante="contorno" icono={<ImagePlus className="size-5" aria-hidden="true" />} onClick={() => entradaArchivo.current?.click()}>
            {portada || (portadaActual && !quitarActual) ? "Cambiar imagen" : "Elegir imagen"}
          </Boton>
          {portada || (portadaActual && !quitarActual) ? (
            <Boton
              variante="texto"
              onClick={() => {
                if (portada) URL.revokeObjectURL(portada.vista);
                setPortada(null);
                if (portadaActual) setQuitarActual(true);
                if (entradaArchivo.current) entradaArchivo.current.value = "";
              }}
            >
              Quitar portada
            </Boton>
          ) : null}
        </div>
        {errorPortada ? <p className="text-sm text-error">{errorPortada}</p> : null}
        <p className="text-[15px] text-gris-texto">
          Opcional. JPEG, PNG o WebP; se encuadra en 16:9, se reduce en el navegador y la guarda el servidor tras revisarla. Sin imagen se muestra el panel de la categoría.
        </p>
      </Tarjeta>

      <Tarjeta className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-tinta">Fecha y hora</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha de inicio" type="date" min={hoy} value={valores.fechaInicio} onChange={(e) => cambiar("fechaInicio", e.target.value)} required error={errores.fechaInicio} />
          <Campo etiqueta="Hora de inicio" type="time" step={60} value={valores.horaInicio} onChange={(e) => cambiar("horaInicio", e.target.value)} required error={errores.horaInicio} ayuda="Formato de 24 horas." />
        </div>
        {valores.conFin ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Fecha de fin" type="date" min={valores.fechaInicio || hoy} value={valores.fechaFin} onChange={(e) => cambiar("fechaFin", e.target.value)} error={errores.fechaFin} />
            <Campo etiqueta="Hora de fin" type="time" step={60} value={valores.horaFin} onChange={(e) => cambiar("horaFin", e.target.value)} error={errores.horaFin} />
          </div>
        ) : null}
        <Boton
          variante="texto"
          className="self-start"
          onClick={() => {
            const activar = !valores.conFin;
            setValores((actual) => ({
              ...actual,
              conFin: activar,
              fechaFin: activar ? actual.fechaInicio : "",
              horaFin: "",
            }));
          }}
        >
          {valores.conFin ? "Quitar fecha de fin" : "Agregar fecha de fin"}
        </Boton>
        {evento && evento.disponibles < evento.aforo ? (
          <Aviso tono="aviso">Este evento ya tiene boletos. Si cambias la fecha, la hora o el lugar, la API avisará por correo a quienes los tienen.</Aviso>
        ) : null}
      </Tarjeta>

      <Tarjeta className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-tinta">Lugar</h2>
        <Campo etiqueta="Sede" value={valores.lugar} onChange={(e) => cambiar("lugar", e.target.value)} maxLength={160} required error={errores.lugar} placeholder="Foro Cultural Orizaba" />
        <Campo etiqueta="Dirección" value={valores.direccion} onChange={(e) => cambiar("direccion", e.target.value)} maxLength={240} error={errores.direccion} placeholder="Sur 5 120, Centro" />
        <Campo etiqueta="Ciudad" value={valores.ciudad} onChange={(e) => cambiar("ciudad", e.target.value)} maxLength={80} />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-tinta">Ubicación exacta</p>
          <p className="text-[15px] text-gris-texto">Toca el mapa o arrastra el marcador. Publicar exige la ubicación; un borrador no.</p>
          <div className={cn("h-72 w-full overflow-hidden rounded-tarjeta", errores.latitud && "ring-2 ring-error")}>
            <MapaLeaflet
              latitud={valores.latitud ?? CENTRO_ORIZABA.latitud}
              longitud={valores.longitud ?? CENTRO_ORIZABA.longitud}
              nombre={valores.nombre || "Ubicación del evento"}
              zoom={valores.latitud != null ? 16 : 14}
              editable
              onMover={(latitud, longitud) => {
                setValores((actual) => ({ ...actual, latitud, longitud }));
                setErrores((actual) => ({ ...actual, latitud: undefined }));
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Boton
              variante="contorno"
              tamano="compacto"
              icono={<LocateFixed className="size-4" aria-hidden="true" />}
              onClick={() =>
                navigator.geolocation?.getCurrentPosition(
                  (posicion) => {
                    setValores((actual) => ({
                      ...actual,
                      latitud: Math.round(posicion.coords.latitude * 1e5) / 1e5,
                      longitud: Math.round(posicion.coords.longitude * 1e5) / 1e5,
                    }));
                  },
                  () => setErrores((actual) => ({ ...actual, latitud: "No se pudo leer tu ubicación. Toca el mapa para fijarla." })),
                )
              }
            >
              Usar mi ubicación actual
            </Boton>
            <p className="text-sm text-gris-texto tabular-nums">
              {valores.latitud != null && valores.longitud != null ? `Lat ${valores.latitud.toFixed(5)} · Lon ${valores.longitud.toFixed(5)}` : "Sin ubicación todavía"}
            </p>
          </div>
          {errores.latitud ? <p className="text-sm text-error">{errores.latitud}</p> : null}
          <p className="text-xs text-gris-texto">© OpenStreetMap contributors</p>
        </div>
      </Tarjeta>

      <Selector
        etiqueta="Categoría"
        value={valores.categoriaId}
        onChange={(valor) => cambiar("categoriaId", valor)}
        placeholder="Elige una categoría"
        opciones={categorias.map((categoria) => ({ valor: String(categoria.id), texto: categoria.nombre }))}
      />

      <Tarjeta className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-tinta">Boletos</h2>
        <Interruptor
          etiqueta="Evento de pago"
          descripcion={bloqueos.modalidad ? "No se cambia en un evento publicado." : "Desactivado: la entrada es gratuita y hay una confirmación por persona."}
          checked={valores.esDePago}
          onChange={(valor) => cambiar("esDePago", valor)}
          disabled={bloqueos.modalidad}
        />
        {valores.esDePago ? (
          <div className="flex flex-col gap-3">
            {valores.tipos.map((tipo, indice) => (
              <div key={indice} className="grid grid-cols-1 gap-3 rounded-campo bg-superficie-baja p-3 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
                <Campo etiqueta="Tipo" value={tipo.nombre} onChange={(e) => cambiarTipo(indice, "nombre", e.target.value)} placeholder="General" />
                <Campo etiqueta="Precio (MXN)" type="number" inputMode="decimal" min={1} step="0.01" value={tipo.precio} onChange={(e) => cambiarTipo(indice, "precio", e.target.value)} disabled={bloqueos.precios && tipo.id !== null} />
                <Campo etiqueta="Cantidad" type="number" inputMode="numeric" min={1} value={tipo.cantidad} onChange={(e) => cambiarTipo(indice, "cantidad", e.target.value)} />
                <Boton
                  variante="peligro"
                  tamano="compacto"
                  className="border-transparente sm:mb-1"
                  aria-label={`Quitar tipo ${tipo.nombre || indice + 1}`}
                  disabled={valores.tipos.length === 1}
                  onClick={() => cambiar("tipos", valores.tipos.filter((_, i) => i !== indice))}
                  icono={<Trash2 className="size-4" aria-hidden="true" />}
                >
                  Quitar
                </Boton>
              </div>
            ))}
            <Boton variante="texto" className="self-start" icono={<Plus className="size-4" aria-hidden="true" />} onClick={() => cambiar("tipos", [...valores.tipos, { id: null, nombre: "", precio: "", cantidad: "" }])}>
              Agregar tipo de boleto
            </Boton>
            <p className="text-[15px] text-gris-texto">
              Suma de boletos: {sumaCantidades(valores.tipos)} de {aforoCalculado} lugares.
              {bloqueos.precios ? " El precio de un tipo con ventas no se puede cambiar." : ""}
            </p>
            {errores.tipos ? <p className="text-sm text-error">{errores.tipos}</p> : null}
          </div>
        ) : null}
      </Tarjeta>

      <Tarjeta className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-tinta">Aforo y asientos</h2>
        <Interruptor
          etiqueta="¿Este evento requiere asientos?"
          descripcion={bloqueos.plano ? "El plano no se cambia cuando ya hay boletos emitidos." : bloqueos.modalidad ? "No se cambia en un evento publicado." : "Los asistentes eligen su butaca en el plano del recinto."}
          checked={valores.requiereAsiento}
          onChange={(valor) => cambiar("requiereAsiento", valor)}
          disabled={bloqueos.modalidad || bloqueos.plano}
        />
        {valores.requiereAsiento ? (
          <div className="flex flex-col gap-3">
            {valores.secciones.map((seccion, indice) => (
              <div key={indice} className="grid grid-cols-1 gap-3 rounded-campo bg-superficie-baja p-3 sm:grid-cols-[1fr_7rem_9rem_auto] sm:items-end">
                <Campo etiqueta="Sección" value={seccion.nombre} onChange={(e) => cambiarSeccion(indice, "nombre", e.target.value)} placeholder="Platea" disabled={bloqueos.plano} />
                <Campo etiqueta="Filas" type="number" inputMode="numeric" min={1} max={26} value={seccion.filas} onChange={(e) => cambiarSeccion(indice, "filas", e.target.value)} disabled={bloqueos.plano} />
                <Campo etiqueta="Asientos por fila" type="number" inputMode="numeric" min={1} max={200} value={seccion.asientosPorFila} onChange={(e) => cambiarSeccion(indice, "asientosPorFila", e.target.value)} disabled={bloqueos.plano} />
                <Boton
                  variante="peligro"
                  tamano="compacto"
                  className="border-transparente sm:mb-1"
                  aria-label={`Quitar sección ${seccion.nombre || indice + 1}`}
                  disabled={valores.secciones.length === 1 || bloqueos.plano}
                  onClick={() => cambiar("secciones", valores.secciones.filter((_, i) => i !== indice))}
                  icono={<Trash2 className="size-4" aria-hidden="true" />}
                >
                  Quitar
                </Boton>
              </div>
            ))}
            {!bloqueos.plano ? (
              <Boton variante="texto" className="self-start" icono={<Plus className="size-4" aria-hidden="true" />} onClick={() => cambiar("secciones", [...valores.secciones, { nombre: "", filas: "", asientosPorFila: "" }])}>
                Agregar sección
              </Boton>
            ) : null}
            <p className="text-[15px] text-gris-texto">Aforo calculado: {aforoCalculado} asientos (filas × asientos por fila).</p>
            {errores.secciones ? <p className="text-sm text-error">{errores.secciones}</p> : null}
            {errores.aforo ? <p className="text-sm text-error">{errores.aforo}</p> : null}
          </div>
        ) : (
          <Campo etiqueta="Aforo" type="number" inputMode="numeric" min={1} max={100000} value={valores.aforo} onChange={(e) => cambiar("aforo", e.target.value)} required error={errores.aforo} ayuda="Número máximo de personas." />
        )}
      </Tarjeta>

      {faltantes.length > 0 ? <p className="text-[15px] text-gris-texto">Para publicar falta: {faltantes.join(", ")}.</p> : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Boton type="submit" variante="contorno" tamano="grande" cargando={guardando} textoCargando="Guardando…">
          {evento ? "Guardar cambios" : "Guardar como borrador"}
        </Boton>
        {!evento || evento.estado === "BORRADOR" ? (
          <Boton variante="destacado" tamano="grande" onClick={() => enviar(true)} disabled={faltantes.length > 0} cargando={guardando} textoCargando="Publicando…">
            {evento ? "Guardar y publicar" : "Publicar evento"}
          </Boton>
        ) : null}
      </div>
    </form>
  );

  function cambiarTipo(indice: number, campo: "nombre" | "precio" | "cantidad", valor: string) {
    setErrores((actual) => ({ ...actual, tipos: undefined }));
    setValores((actual) => ({
      ...actual,
      tipos: actual.tipos.map((tipo, i) => (i === indice ? { ...tipo, [campo]: valor } : tipo)),
    }));
  }

  function cambiarSeccion(indice: number, campo: "nombre" | "filas" | "asientosPorFila", valor: string) {
    setErrores((actual) => ({ ...actual, secciones: undefined, aforo: undefined }));
    setValores((actual) => ({
      ...actual,
      secciones: actual.secciones.map((seccion, i) => (i === indice ? { ...seccion, [campo]: valor } : seccion)),
    }));
  }
}

function faltanParaPublicar(valores: ValoresEvento): string[] {
  const faltantes: string[] = [];
  if (valores.nombre.trim().length < 3) faltantes.push("el nombre");
  if (!valores.lugar.trim()) faltantes.push("la sede");
  if (!valores.fechaInicio) faltantes.push("la fecha");
  if (valores.latitud == null || valores.longitud == null) faltantes.push("la ubicación en el mapa");
  if (
    valores.esDePago &&
    valores.tipos.some((tipo) => !tipo.nombre.trim() || !(Number.parseFloat(tipo.precio) > 0) || !(Number.parseInt(tipo.cantidad, 10) > 0))
  ) {
    faltantes.push("los tipos de boleto completos");
  }
  return faltantes;
}
