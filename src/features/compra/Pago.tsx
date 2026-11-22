"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Armchair, ArrowRight, CalendarDays, CreditCard, Lock, MapPin, Ticket } from "lucide-react";
import type { AsientoDto, EventoDto, TipoBoletoDto } from "@/lib/api/tipos";
import { ErrorEnZona, mensajeDeError } from "@/lib/api/errores";
import { CAPACIDADES } from "@/lib/capacidades";
import { corto } from "@/lib/fecha";
import { importe, importeMxn, totalDe } from "@/lib/formato";
import { RUTAS } from "@/lib/rutas";
import { Boton, BotonEnlace } from "@/components/ui/Boton";
import { Selector } from "@/components/ui/Campo";
import { Aviso, FilaDato, FilaImporte, Tarjeta, ZonaDemostracion } from "@/components/ui/Superficies";
import { BarraCompra } from "@/components/compra/BarraCompra";
import { asientosActuales, crearOrden, pagoPendiente, pagoRechazado } from "./api";
import { etiquetaCorta, nuevaClaveIdempotencia } from "./reglas";

/*
 * Pago (RF-11, CP-09, CP-10). Resumen de la orden, desglose y total final sin
 * cargos añadidos (RNF-09), método de pago y la zona de demostración con los
 * escenarios de la pasarela sandbox de la API. Una compra aprobada crea la
 * orden, el pago y N boletos; un rechazo no emite nada ni descuenta inventario.
 *
 * Idempotencia: la `Idempotency-Key` se crea por intento y se CONSERVA si el
 * fallo fue de red o del servidor (el cobro pudo llegar a la pasarela: repetir
 * con la misma clave devuelve la misma orden sin cobrar dos veces). Solo se
 * renueva tras un resultado definitivo (rechazo) o un conflicto de inventario.
 */

/** Escenarios de la pasarela sandbox (`PAYMENT_PROVIDER=sandbox` en EnZona_Api). */
const ESCENARIOS = [
  { valor: "tok_aprobado", texto: "Pago aprobado" },
  { valor: "tok_rechazado", texto: "Pago rechazado (CP-10)" },
  { valor: "tok_pendiente", texto: "Pago pendiente de confirmación" },
  { valor: "tok_error", texto: "La pasarela no responde" },
] as const;
type Escenario = (typeof ESCENARIOS)[number]["valor"];

interface Props {
  evento: EventoDto;
  tipo: TipoBoletoDto | null;
  cantidad: number;
  asientos: AsientoDto[];
}

export function Pago({ evento, tipo, cantidad, asientos }: Props) {
  const router = useRouter();
  const [escenario, setEscenario] = useState<Escenario>("tok_aprobado");
  const [error, setError] = useState<{ texto: string; volverAsientos?: boolean; reintentable?: boolean } | null>(null);
  const [clave, setClave] = useState(() => nuevaClaveIdempotencia());
  const [pagando, iniciar] = useTransition();

  const unitario = tipo?.precio ?? "0";
  const total = totalDe(unitario, cantidad);

  const pagar = () => {
    setError(null);
    iniciar(async () => {
      try {
        if (evento.requiereAsiento && asientos.length > 0) {
          // Comprobación previa: si alguien tomó un asiento, se avisa antes de cobrar (el servidor lo vuelve a comprobar).
          const actuales = await asientosActuales(evento.id);
          const ocupados = asientos.filter((asiento) => actuales.find((item) => item.id === asiento.id)?.estado !== "DISPONIBLE");
          if (ocupados.length > 0) {
            setError({
              texto: `${ocupados.map(etiquetaCorta).join(", ")} ya no ${ocupados.length === 1 ? "está disponible" : "están disponibles"}. Elige otro asiento.`,
              volverAsientos: true,
            });
            return;
          }
        }
        const orden = await crearOrden(
          {
            eventoId: evento.id,
            tipoBoletoId: tipo?.id ?? null,
            cantidad,
            asientosIds: asientos.map((asiento) => asiento.id),
            metodo: "TARJETA",
            tokenPago: escenario,
          },
          clave,
        );
        if (pagoRechazado(orden)) {
          // Resultado definitivo: la API devolvería la misma orden cancelada con esta clave; se renueva para reintentar.
          setClave(nuevaClaveIdempotencia());
          setError({
            texto: "El banco rechazó el pago. No se emitió ningún boleto ni se hizo ningún cargo. Puedes intentarlo de nuevo.",
          });
          return;
        }
        try {
          sessionStorage.removeItem(`enzona:asientos:${evento.id}:${tipo?.id ?? 0}:${cantidad}`);
        } catch {
          // ignorar
        }
        // Pagada o pendiente: la pantalla de la orden muestra el estado (y se actualiza sola si está pendiente).
        void pagoPendiente(orden);
        router.push(RUTAS.orden(orden.ordenId));
      } catch (causa) {
        if (causa instanceof ErrorEnZona && (causa.codigo === "ASIENTO_NO_DISPONIBLE" || causa.codigo === "AFORO_AGOTADO")) {
          setClave(nuevaClaveIdempotencia());
          setError({ texto: causa.message, volverAsientos: evento.requiereAsiento });
          return;
        }
        const transitorio = causa instanceof ErrorEnZona && (causa.sinConexion || causa.estado >= 500 || causa.estado === 503);
        if (transitorio) {
          // El cobro pudo haber llegado: se conserva la clave para que el reintento no cobre dos veces.
          setError({ texto: `${mensajeDeError(causa)} Si reintentas, no se te cobrará dos veces.`, reintentable: true });
          return;
        }
        setClave(nuevaClaveIdempotencia());
        setError({ texto: mensajeDeError(causa) });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="flex flex-col gap-5">
        <Tarjeta className="flex flex-col gap-4">
          <p className="text-[15px] text-gris-texto">Tu orden</p>
          <p className="text-2xl font-semibold text-tinta">{evento.nombre}</p>
          <FilaDato icono={<CalendarDays className="size-6" />} titulo={corto(evento.fechaHoraInicio)} />
          <FilaDato icono={<MapPin className="size-6" />} titulo={evento.lugar} />
          <FilaDato
            icono={<Ticket className="size-6" />}
            titulo={tipo?.nombre ?? "Entrada general"}
            detalle={`${cantidad === 1 ? "1 boleto" : `${cantidad} boletos`} · un código QR por boleto`}
          />
          {asientos.length > 0 ? (
            <FilaDato
              icono={<Armchair className="size-6" />}
              titulo={asientos.map(etiquetaCorta).join(", ")}
              detalle={asientos.length === 1 ? "1 asiento" : `${asientos.length} asientos`}
            />
          ) : null}
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-3">
          <p className="text-[15px] font-semibold text-gris-texto">Desglose</p>
          <FilaImporte concepto={`Boleto × ${cantidad} (${importe(unitario)} c/u)`} importe={importe(total)} />
          <FilaImporte concepto="Cargo por servicio" importe={importe(0)} />
          <div className="my-1 border-t border-linea" />
          <FilaImporte concepto="Total a pagar" importe={importeMxn(total)} destacada />
          <p className="text-[15px] text-gris-texto">
            Este es el importe final. No hay cargos adicionales ni tarifas que cambien según la demanda.
          </p>
        </Tarjeta>

        <section aria-labelledby="metodo" className="flex flex-col gap-3">
          <h2 id="metodo" className="text-xl font-semibold text-tinta">
            Método de pago
          </h2>
          <div className="flex items-start gap-4 rounded-tarjeta border-2 border-marino bg-tinte-50 p-4">
            <span className="mt-0.5 flex size-5 items-center justify-center rounded-full border-2 border-marino" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-marino" />
            </span>
            <CreditCard className="mt-0.5 size-6 shrink-0 text-marino" aria-hidden="true" />
            <div>
              <p className="text-[17px] font-medium text-tinta">Tarjeta de crédito o débito</p>
              <p className="text-[15px] text-gris-texto">La pasarela genera un token de un solo uso; EnZona no recibe el número.</p>
            </div>
          </div>
          {!CAPACIDADES.pagosDiferidos ? (
            <p className="text-[15px] text-gris-texto">OXXO y SPEI estarán disponibles cuando la pasarela los admita.</p>
          ) : null}
        </section>

        <ZonaDemostracion>
          <p>La pasarela está simulada: no se realiza ningún cargo real. Elige qué responde la pasarela.</p>
          <Selector
            etiqueta="Respuesta de la pasarela"
            value={escenario}
            onChange={(valor) => setEscenario(valor as Escenario)}
            opciones={ESCENARIOS.map((item) => ({ valor: item.valor, texto: item.texto }))}
            disabled={pagando}
          />
        </ZonaDemostracion>

        <p className="flex items-start gap-2 text-[15px] text-gris-texto">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          El cobro lo procesa una pasarela externa. EnZona no almacena el número de tu tarjeta ni el CVV.
        </p>

        {error ? (
          <Aviso
            tono="error"
            accion={
              error.volverAsientos ? (
                <BotonEnlace href={RUTAS.asientos(evento.id, tipo?.id ?? null, cantidad)} variante="contorno" tamano="compacto">
                  Elegir otros asientos
                </BotonEnlace>
              ) : error.reintentable ? (
                <Boton variante="contorno" tamano="compacto" onClick={pagar}>
                  Reintentar con la misma operación
                </Boton>
              ) : undefined
            }
          >
            {error.texto}
          </Aviso>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-24">
        <BarraCompra
          resumen={
            <>
              Total final: {importeMxn(total)} · {cantidad === 1 ? "1 boleto" : `${cantidad} boletos`}
            </>
          }
          accion={
            <Boton
              variante="destacado"
              tamano="grande"
              ancho
              onClick={pagar}
              cargando={pagando}
              textoCargando="Procesando pago…"
              icono={<ArrowRight className="flecha size-5" aria-hidden="true" />}
            >
              Pagar {importeMxn(total)}
            </Boton>
          }
        />
      </aside>
    </div>
  );
}
