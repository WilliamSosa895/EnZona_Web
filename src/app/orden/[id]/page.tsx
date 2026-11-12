import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, MapPin, QrCode } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { BotonEnlace } from "@/components/ui/Boton";
import { EtiquetaEstadoBoleto } from "@/components/ui/Etiquetas";
import { Aviso, FilaDato, Tarjeta } from "@/components/ui/Superficies";
import { ErrorEnZona } from "@/lib/api/errores";
import { corto } from "@/lib/fecha";
import { boletoKDeN, importeMxn } from "@/lib/formato";
import { RUTAS } from "@/lib/rutas";
import { exigirSesion } from "@/lib/sesion/servidor";
import { eventoDeBoleto, orden as obtenerOrden } from "@/features/boletos/api";
import { RefrescoPendiente } from "@/features/compra/RefrescoPendiente";

export const metadata: Metadata = { title: "Compra confirmada" };

/*
 * Resumen de la orden (OrderSummaryScreen): «Tus N boletos están listos», datos
 * del evento, total pagado y los boletos en carrusel, cada uno con su QR propio.
 */
export default async function PaginaOrden({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirSesion(RUTAS.orden(id));

  const orden = await obtenerOrden(id).catch((error: unknown) => {
    if (error instanceof ErrorEnZona && error.estado === 404) notFound();
    throw error;
  });
  const evento = await eventoDeBoleto(orden.eventoId);
  const boletos = orden.boletos ?? [];
  const gratuita = (orden.total == null || Number.parseFloat(orden.total) === 0) && orden.estadoPago == null;
  const pendiente = orden.estadoOrden === "PENDIENTE";
  const cancelada = orden.estadoOrden === "CANCELADA";
  const nombreEvento = evento?.nombre ?? boletos[0]?.eventoNombre ?? "Evento";

  return (
    <Cascaron ancho="normal">
      <RefrescoPendiente activo={pendiente} />
      <h1 className="titulo-vivo text-[2rem] font-black tracking-tight text-tinta">
        {cancelada ? "Compra no completada" : pendiente ? "Pago pendiente" : gratuita ? "Asistencia confirmada" : "Compra confirmada"}
      </h1>

      <div className="mt-5 flex items-center gap-4">
        {pendiente ? (
          <Clock className="size-14 shrink-0 text-aviso" aria-hidden="true" />
        ) : (
          <CheckCircle2 className={`size-14 shrink-0 ${cancelada ? "text-error" : "text-exito"}`} aria-hidden="true" />
        )}
        <p className="text-2xl font-bold text-tinta sm:text-3xl">
          {cancelada
            ? "No se emitió ningún boleto"
            : pendiente
              ? "Esperando la confirmación del pago"
              : boletos.length === 1
                ? "Tu boleto está listo"
                : `Tus ${boletos.length} boletos están listos`}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex flex-col gap-5">
          <Tarjeta className="flex flex-col gap-4">
            <p className="text-2xl font-semibold text-tinta">{nombreEvento}</p>
            <FilaDato icono={<CalendarDays className="size-6" />} titulo={corto(evento?.fechaHoraInicio ?? boletos[0]?.fechaHoraInicio)} />
            <FilaDato icono={<MapPin className="size-6" />} titulo={evento?.lugar ?? boletos[0]?.lugar ?? ""} />
            <p className="text-[17px] font-semibold text-tinta">
              {gratuita ? "Sin cobro" : `Total pagado: ${importeMxn(orden.total)}`} · orden #{orden.ordenId}
            </p>
          </Tarjeta>

          {pendiente ? (
            <Aviso tono="aviso" titulo="Tu pago está pendiente">
              {orden.mensaje ?? "La pasarela todavía no confirma el cobro. Los boletos se emitirán en cuanto se apruebe."}
              {orden.referenciaPago ? ` Referencia: ${orden.referenciaPago}.` : ""}
            </Aviso>
          ) : cancelada ? (
            <Aviso tono="error">
              {orden.mensaje ?? "El pago fue rechazado. No se hizo ningún cargo ni se descontó cupo."}
            </Aviso>
          ) : (
            <Aviso tono="info">
              Cada boleto tiene su propio código QR y se valida por separado en el acceso. Muéstralos desde tu cuenta a tus acompañantes.
            </Aviso>
          )}

          {boletos.length > 0 ? (
            <section aria-labelledby="tus-boletos" className="flex flex-col gap-3">
              <h2 id="tus-boletos" className="text-xl font-semibold text-tinta">
                {boletos.length === 1 ? "Tu boleto" : "Tus boletos · desliza para verlos"}
              </h2>
              <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sin-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-2">
                {boletos.map((boleto, indice) => (
                  <li key={boleto.id} className="w-64 shrink-0 sm:w-auto">
                    <Link
                      href={RUTAS.boleto(boleto.id)}
                      className="flex h-full flex-col gap-3 rounded-tarjeta bg-superficie p-5 transition-shadow hover:shadow-tarjeta"
                    >
                      <span className="flex items-center gap-3 text-lg font-semibold text-tinta">
                        <QrCode className="size-9 text-profundo" aria-hidden="true" />
                        {boletoKDeN(indice + 1, boletos.length)}
                      </span>
                      <span className="text-[15px] text-gris-texto">
                        {boleto.tipoNombre ?? "Entrada general"}
                        {boleto.asientoEtiqueta ? ` · ${boleto.asientoEtiqueta}` : ""}
                      </span>
                      <span className="font-mono text-[15px] font-semibold text-gris-texto">{boleto.codigo}</span>
                      <EtiquetaEstadoBoleto estado={boleto.estado} className="self-start" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
          <BotonEnlace href={RUTAS.misBoletos} tamano="grande" ancho>
            Ver mis boletos
          </BotonEnlace>
          <BotonEnlace href={RUTAS.inicio} variante="contorno" tamano="grande" ancho>
            Volver a Inicio
          </BotonEnlace>
          {cancelada && evento ? (
            <BotonEnlace href={RUTAS.evento(evento.id)} variante="texto" ancho>
              Intentar de nuevo
            </BotonEnlace>
          ) : null}
        </aside>
      </div>
    </Cascaron>
  );
}
