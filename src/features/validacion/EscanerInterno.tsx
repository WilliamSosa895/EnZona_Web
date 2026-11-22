"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { CheckCircle2, ChevronDown, Cloud, CloudOff, Download, Keyboard, RefreshCw, XCircle } from "lucide-react";
import type { EventoDto } from "@/lib/api/tipos";
import { mensajeDeError } from "@/lib/api/errores";
import { cn } from "@/lib/cn";
import { corto, hora } from "@/lib/fecha";
import { Boton } from "@/components/ui/Boton";
import { Campo, Selector } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { Aviso } from "@/components/ui/Superficies";
import { EstadoVacio } from "@/components/ui/Estados";
import {
  agregarABitacora,
  aplicarVeredictos,
  borrarManifiesto,
  contarVigentes,
  encolarPendiente,
  guardarManifiesto,
  leerBitacora,
  leerManifiesto,
  leerPendientes,
  limpiarPendientes,
  tituloMotivo,
  validarContraManifiesto,
  type RegistroBitacora,
} from "./almacen";
import { descargarManifiesto, sincronizar, validarQr } from "./api";
import { LectorQr } from "./LectorQr";

/*
 * Validador pensado para la puerta (ScannerScreen v6): arriba el evento, el
 * chip «Con internet / Sin conexión», «Enviar N» pendientes y los contadores
 * de la jornada; la cámara ocupa la pantalla; el resultado la llena en verde
 * «PUEDE PASAR» (se cierra solo a los 3 s y vibra) o rojo «NO PUEDE PASAR»
 * con el asiento en grande. «Escribir código» abre un diálogo y «Últimos
 * accesos» se despliega.
 */

interface Resultado {
  permitido: boolean;
  titulo: string;
  detalle: string;
  asiento: string | null;
  codigo: string | null;
  offline: boolean;
}

function suscribirRed(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function EscanerInterno({ eventos }: { eventos: EventoDto[] }) {
  const [eventoId, setEventoId] = useState<number | null>(() => {
    try {
      const guardado = Number(sessionStorage.getItem("enzona:validador:evento"));
      if (eventos.some((item) => item.id === guardado)) return guardado;
    } catch {
      // sin almacenamiento
    }
    return eventos[0]?.id ?? null;
  });
  const enLinea = useSyncExternalStore(suscribirRed, () => navigator.onLine, () => true);

  if (eventos.length === 0) {
    return (
      <EstadoVacio
        titulo="No tienes eventos para validar"
        descripcion="Un organizador debe designarte como personal de acceso de su evento. Si organizas eventos, aparecen aquí los publicados."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Selector
        etiqueta="Evento"
        value={eventoId ? String(eventoId) : ""}
        onChange={(valor) => {
          setEventoId(Number(valor));
          try {
            sessionStorage.setItem("enzona:validador:evento", valor);
          } catch {
            // sin almacenamiento
          }
        }}
        opciones={eventos.map((item) => ({ valor: String(item.id), texto: `${item.nombre} · ${corto(item.fechaHoraInicio)}` }))}
      />
      {eventoId != null ? <PuertaDeEvento key={eventoId} eventoId={eventoId} enLinea={enLinea} /> : null}
    </div>
  );
}

/** Todo el estado de la jornada de un evento; se reinicia al cambiar de evento gracias a `key`. */
function PuertaDeEvento({ eventoId, enLinea }: { eventoId: number; enLinea: boolean }) {
  const [manifiestoVigentes, setManifiestoVigentes] = useState<number | null>(() => {
    const manifiesto = leerManifiesto(eventoId);
    return manifiesto ? contarVigentes(manifiesto) : null;
  });
  const [modoSinConexion, setModoSinConexion] = useState(() => leerManifiesto(eventoId) !== null);
  const [pendientes, setPendientes] = useState(() => leerPendientes(eventoId).length);
  const [bitacora, setBitacora] = useState<RegistroBitacora[]>(() => leerBitacora(eventoId));
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [validando, setValidando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: "info" | "exito" | "error" | "aviso"; texto: string } | null>(null);
  const [dialogoCodigo, setDialogoCodigo] = useState(false);
  const [codigoManual, setCodigoManual] = useState("");
  const [verAccesos, setVerAccesos] = useState(false);
  const [sincronizando, iniciarSincronizacion] = useTransition();

  // El resultado positivo se cierra solo a los 3 segundos; el negativo espera a «Siguiente».
  useEffect(() => {
    if (!resultado?.permitido) return;
    const temporizador = setTimeout(() => setResultado(null), 3000);
    return () => clearTimeout(temporizador);
  }, [resultado]);

  const registrar = useCallback(
    (nuevo: Resultado, qr: string) => {
      const registro: RegistroBitacora = {
        qr,
        codigo: nuevo.codigo ?? qr.split(".")[0] ?? "",
        fechaHora: new Date().toISOString(),
        permitido: nuevo.permitido,
        titulo: nuevo.titulo,
        detalle: nuevo.detalle,
        asiento: nuevo.asiento,
        offline: nuevo.offline,
        sincronizado: !nuevo.offline,
      };
      setBitacora(agregarABitacora(eventoId, registro));
      setResultado(nuevo);
      if ("vibrate" in navigator) navigator.vibrate(nuevo.permitido ? 120 : [80, 60, 80]);
    },
    [eventoId],
  );

  const validarOffline = useCallback(
    (texto: string) => {
      const veredicto = validarContraManifiesto(eventoId, texto);
      if (veredicto.permitido) {
        encolarPendiente(eventoId, { qr: texto, fechaHora: new Date().toISOString() });
        setPendientes(leerPendientes(eventoId).length);
      }
      registrar({ ...veredicto, offline: true }, texto);
    },
    [eventoId, registrar],
  );

  const validar = useCallback(
    async (qr: string) => {
      if (validando) return;
      const texto = qr.trim();
      if (!texto) return;
      setValidando(true);
      setMensaje(null);
      try {
        if (modoSinConexion && !navigator.onLine) {
          validarOffline(texto);
          return;
        }
        const respuesta = await validarQr(eventoId, texto);
        const permitido = respuesta.resultado === "PERMITIDO";
        registrar(
          {
            permitido,
            titulo: permitido ? "Acceso permitido" : tituloMotivo(respuesta.motivo),
            detalle: permitido ? [respuesta.mensaje, respuesta.tipoBoleto, respuesta.asiento].filter(Boolean).join(" · ") : (respuesta.mensaje ?? ""),
            asiento: respuesta.asiento ?? null,
            codigo: respuesta.codigo ?? null,
            offline: false,
          },
          texto,
        );
      } catch (error) {
        // La red se cayó a mitad: con manifiesto se valida contra él; sin manifiesto se explica.
        if (modoSinConexion) validarOffline(texto);
        else setMensaje({ tono: "error", texto: mensajeDeError(error) });
      } finally {
        setValidando(false);
      }
    },
    [eventoId, validando, modoSinConexion, registrar, validarOffline],
  );

  const prepararOffline = () => {
    setMensaje(null);
    iniciarSincronizacion(async () => {
      try {
        const manifiesto = await descargarManifiesto(eventoId);
        const guardado = guardarManifiesto(manifiesto);
        setManifiestoVigentes(contarVigentes(guardado));
        setModoSinConexion(true);
        setMensaje({ tono: "exito", texto: `Manifiesto descargado: ${contarVigentes(guardado)} boletos vigentes. Ya puedes validar sin conexión.` });
      } catch (error) {
        setMensaje({ tono: "error", texto: mensajeDeError(error) });
      }
    });
  };

  const desactivarOffline = () => {
    if (pendientes > 0) {
      setMensaje({ tono: "aviso", texto: "Sincroniza las validaciones pendientes antes de desactivar el modo sin conexión." });
      return;
    }
    borrarManifiesto(eventoId);
    setManifiestoVigentes(null);
    setModoSinConexion(false);
  };

  const enviarPendientes = () => {
    setMensaje(null);
    iniciarSincronizacion(async () => {
      const registros = leerPendientes(eventoId);
      if (registros.length === 0) return;
      try {
        const respuesta = await sincronizar({ eventoId, registros });
        setBitacora(aplicarVeredictos(eventoId, respuesta.resultados ?? []));
        limpiarPendientes(eventoId);
        setPendientes(0);
        const duplicadas = (respuesta.conflictos ?? 0) + (respuesta.resultados ?? []).filter((item) => item.duplicado).length;
        setMensaje({
          tono: "exito",
          texto: `Sincronizadas ${respuesta.procesados ?? registros.length}: ${respuesta.permitidos ?? 0} permitidas, ${respuesta.rechazados ?? 0} rechazadas, ${duplicadas} duplicadas.`,
        });
        const manifiesto = await descargarManifiesto(eventoId);
        setManifiestoVigentes(contarVigentes(guardarManifiesto(manifiesto)));
      } catch (error) {
        setMensaje({ tono: "error", texto: mensajeDeError(error) });
      }
    });
  };

  const entraron = bitacora.filter((item) => item.permitido).length;
  const rechazados = bitacora.length - entraron;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-pildora border px-4 text-[15px] font-medium",
              enLinea ? "border-gris-suave text-tinta" : "border-aviso bg-aviso-contenedor text-sobre-aviso",
            )}
            role="status"
          >
            {enLinea ? <Cloud className="size-5 text-marino" aria-hidden="true" /> : <CloudOff className="size-5" aria-hidden="true" />}
            {enLinea ? "Con internet" : "Sin conexión"}
          </span>
          {pendientes > 0 ? (
            <Boton variante="destacado" tamano="compacto" onClick={enviarPendientes} disabled={!enLinea} cargando={sincronizando} icono={<RefreshCw className="size-4" aria-hidden="true" />}>
              Enviar {pendientes}
            </Boton>
          ) : null}
        </div>
        <div className="flex items-center gap-5 text-center">
          <div>
            <p className="text-2xl font-bold text-sobre-exito tabular-nums">{entraron}</p>
            <p className="text-sm text-gris-texto">entraron</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-error tabular-nums">{rechazados}</p>
            <p className="text-sm text-gris-texto">rechazados</p>
          </div>
        </div>
      </div>

      {mensaje ? <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso> : null}

      <div className="relative">
        <LectorQr activo={resultado === null && !dialogoCodigo} onLeer={(texto) => void validar(texto)} />
        {resultado ? <PantallaResultado resultado={resultado} onSiguiente={() => setResultado(null)} /> : null}
        {validando ? (
          <p role="status" className="absolute top-3 left-3 rounded-pildora bg-tinta/70 px-3 py-1 text-sm text-blanco">
            Validando…
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Boton variante="texto" icono={<Keyboard className="size-5" aria-hidden="true" />} onClick={() => setDialogoCodigo(true)}>
          Escribir código
        </Boton>
        <Boton variante="texto" onClick={() => setVerAccesos((valor) => !valor)} aria-expanded={verAccesos}>
          Últimos accesos
          <ChevronDown className={cn("size-5 transition-transform", verAccesos && "rotate-180")} aria-hidden="true" />
        </Boton>
      </div>

      {verAccesos ? (
        <ul className="divide-y divide-linea rounded-tarjeta bg-superficie px-5">
          {bitacora.length === 0 ? (
            <li className="py-4 text-[15px] text-gris-texto">Todavía no hay accesos registrados en este dispositivo.</li>
          ) : (
            bitacora.map((registro) => (
              <li key={`${registro.qr}-${registro.fechaHora}`} className="flex items-center gap-3 py-3">
                {registro.permitido ? (
                  <CheckCircle2 className="size-6 shrink-0 text-sobre-exito" aria-hidden="true" />
                ) : (
                  <XCircle className="size-6 shrink-0 text-error" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-tinta">
                    {registro.titulo}
                    {registro.asiento ? ` · ${registro.asiento}` : ""}
                  </p>
                  <p className="truncate font-mono text-sm text-gris-texto">{registro.codigo}</p>
                </div>
                <div className="text-right text-sm text-gris-texto">
                  <p>{hora(registro.fechaHora)}</p>
                  {registro.offline ? <p>{registro.sincronizado ? "sincronizada" : "sin sincronizar"}</p> : null}
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}

      <section aria-labelledby="sin-conexion" className="rounded-tarjeta bg-superficie p-5">
        <h2 id="sin-conexion" className="text-xl font-semibold text-tinta">
          Modo sin conexión
        </h2>
        <p className="mt-1 text-[15px] text-gris-texto">
          Descarga el manifiesto del evento mientras tengas red. Sin señal, cada QR se comprueba contra esa lista y queda pendiente de sincronizar. La firma solo la verifica el servidor.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {modoSinConexion ? (
            <>
              <span className="text-[15px] text-tinta">
                Manifiesto listo{manifiestoVigentes != null ? ` · ${manifiestoVigentes} vigentes` : ""}
              </span>
              <Boton variante="contorno" tamano="compacto" onClick={prepararOffline} disabled={!enLinea} cargando={sincronizando} icono={<Download className="size-4" aria-hidden="true" />}>
                Actualizar
              </Boton>
              <Boton variante="texto" tamano="compacto" onClick={desactivarOffline}>
                Desactivar
              </Boton>
            </>
          ) : (
            <Boton variante="contorno" onClick={prepararOffline} disabled={!enLinea} cargando={sincronizando} textoCargando="Descargando…" icono={<Download className="size-5" aria-hidden="true" />}>
              Activar modo sin conexión
            </Boton>
          )}
        </div>
      </section>

      <Dialogo
        abierto={dialogoCodigo}
        onCerrar={() => setDialogoCodigo(false)}
        titulo="Escribir código"
        acciones={
          <>
            <Boton variante="contorno" onClick={() => setDialogoCodigo(false)}>
              Cancelar
            </Boton>
            <Boton
              onClick={() => {
                const texto = codigoManual;
                setDialogoCodigo(false);
                setCodigoManual("");
                void validar(texto);
              }}
              disabled={!codigoManual.trim()}
            >
              Validar
            </Boton>
          </>
        }
      >
        <p>Pega el contenido completo del QR (código y firma separados por un punto) tal como aparece en el boleto.</p>
        <Campo etiqueta="Contenido del QR" value={codigoManual} onChange={(evento) => setCodigoManual(evento.target.value)} autoCapitalize="none" autoComplete="off" spellCheck={false} className="[&_input]:font-mono" />
      </Dialogo>
    </>
  );
}

function PantallaResultado({ resultado, onSiguiente }: { resultado: Resultado; onSiguiente: () => void }) {
  return (
    <div
      role="alert"
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-tarjeta px-6 text-center text-blanco",
        resultado.permitido ? "bg-exito" : "bg-error",
      )}
      style={{ animation: "pulso-resultado 220ms ease-out" }}
    >
      {resultado.permitido ? <CheckCircle2 className="size-20" aria-hidden="true" /> : <XCircle className="size-20" aria-hidden="true" />}
      <p className="text-4xl font-black tracking-tight">{resultado.permitido ? "PUEDE PASAR" : "NO PUEDE PASAR"}</p>
      <p className="text-lg font-semibold">{resultado.titulo}</p>
      {resultado.detalle ? <p className="text-[15px] text-blanco/90">{resultado.detalle}</p> : null}
      {resultado.asiento ? (
        <div className="mt-2">
          <p className="text-sm text-blanco/80">Asiento</p>
          <p className="text-3xl font-black">{resultado.asiento}</p>
        </div>
      ) : null}
      {resultado.codigo ? <p className="rounded-pildora bg-tinta/30 px-3 py-1 font-mono text-sm">{resultado.codigo}</p> : null}
      {resultado.offline ? <p className="text-sm text-blanco/85">Validado sin conexión · pendiente de sincronizar</p> : null}
      <Boton variante="contorno" className={cn("mt-3 border-blanco bg-blanco", resultado.permitido ? "text-sobre-exito" : "text-error")} onClick={onSiguiente}>
        Siguiente
      </Boton>
      {resultado.permitido ? <p className="text-sm text-blanco/80">Vuelve a la cámara en unos segundos</p> : null}
    </div>
  );
}
