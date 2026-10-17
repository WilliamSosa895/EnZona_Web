import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MdEdit, MdEventBusy, MdHowToReg, MdOpenInNew, MdPublish } from 'react-icons/md';
import { eventosApi } from '@/api/eventos';
import type { Evento, Reporte } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { corto, largo, yaPaso } from '@/lib/fechas';
import { aNumero, importeMxn, precio } from '@/lib/formato';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import { correoValido } from '@/lib/validaciones';
import {
  Aviso,
  BarraSuperior,
  Boton,
  BotonIcono,
  BotonSecundario,
  BotonTexto,
  Campo,
  EnlaceSecundario,
  EstadoVacio,
  EtiquetaEstadoEvento,
  IndicadorCarga,
} from '@/ui';
import { DialogoCancelarEvento } from './DialogoCancelarEvento';
import { BarraProgreso, Metrica } from './Metricas';
import estilos from './Organizador.module.css';

/**
 * Panel del evento para el organizador (EventStatsScreen en Android): reportes de ventas y accesos (RF-17),
 * publicar (RF-08), cancelar con la política de la API (RF-14) y personal de acceso.
 */
export default function PanelEventoPage() {
  const id = Number(useParams().id);
  const evento = useQuery({ queryKey: claves.evento(id), queryFn: ({ signal }) => eventosApi.detalle(id, signal) });
  const reporte = useQuery({
    queryKey: claves.reporte(id),
    queryFn: ({ signal }) => eventosApi.reporte(id, signal),
    refetchInterval: 30_000, // los accesos validados cambian durante el evento
  });

  if (evento.isPending) return <IndicadorCarga texto="Cargando el panel…" />;
  if (evento.isError)
    return (
      <>
        <BarraSuperior titulo="Panel del evento" volver />
        <EstadoVacio
          icono={<MdEventBusy size={56} />}
          titulo={esCodigo(evento.error, 'NO_ENCONTRADO') ? 'Este evento no existe' : 'No se pudo cargar el evento'}
          texto={mensajeDeError(evento.error)}
          textoAccion="Reintentar"
          onAccion={() => void evento.refetch()}
        />
      </>
    );
  return <Panel evento={evento.data} reporte={reporte.data} errorReporte={reporte.error} />;
}

function Panel({ evento, reporte, errorReporte }: { evento: Evento; reporte?: Reporte; errorReporte: Error | null }) {
  const navegar = useNavigate();
  const consultas = useQueryClient();
  const [cancelando, setCancelando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const editable = evento.estado === 'BORRADOR' || (evento.estado === 'PUBLICADO' && !yaPaso(evento.fechaHoraInicio));

  const refrescar = () => {
    void consultas.invalidateQueries({ queryKey: claves.evento(evento.id) });
    void consultas.invalidateQueries({ queryKey: claves.reporte(evento.id) });
    void consultas.invalidateQueries({ queryKey: claves.eventosOrganizador });
    void consultas.invalidateQueries({ queryKey: ['eventos'] });
  };
  const publicar = useMutation({
    mutationFn: () => eventosApi.publicar(evento.id),
    onSuccess: (e) => {
      consultas.setQueryData(claves.evento(evento.id), e);
      refrescar();
      setAviso('El evento ya es visible para los asistentes.');
    },
  });

  const emitidos = reporte?.boletosEmitidos ?? 0;
  const validados = reporte?.accesosValidados ?? 0;
  const ocupados = reporte ? reporte.aforo - reporte.disponibles : 0;

  return (
    <>
      <BarraSuperior
        titulo="Panel del evento"
        volver={() => navegar('/organizador')}
        acciones={
          editable && (
            <BotonIcono etiqueta="Editar evento" onClick={() => navegar(`/organizador/eventos/${evento.id}/editar`)}>
              <MdEdit />
            </BotonIcono>
          )
        }
      />
      {cancelando && (
        <DialogoCancelarEvento
          eventoId={evento.id}
          nombreEvento={evento.nombre}
          onCerrar={() => setCancelando(false)}
          onCancelado={(r) => {
            setCancelando(false);
            refrescar();
            void consultas.invalidateQueries({ queryKey: claves.politica(evento.id) });
            setAviso(
              `Evento cancelado. Se anularon ${r.boletosAnulados} boletos y se avisó a ${r.asistentesNotificados} asistentes.` +
                (aNumero(r.importeReembolsado) > 0 ? ` Reembolso: ${importeMxn(r.importeReembolsado)}.` : ''),
            );
          }}
        />
      )}
      <div className={estilos.panel}>
        <header className={estilos.panelCabecera}>
          <div>
            <h1 className={estilos.panelTitulo}>{evento.nombre}</h1>
            <p className={estilos.apoyo}>
              {evento.lugar} · {corto(evento.fechaHoraInicio)}
            </p>
          </div>
          <EtiquetaEstadoEvento estado={evento.estado} />
        </header>

        {aviso && <Aviso texto={aviso} tono="exito" anunciar />}
        {errorReporte && <Aviso texto={mensajeDeError(errorReporte)} tono="error" />}

        <div className={estilos.metricas}>
          <Metrica etiqueta="Asistentes" valor={reporte ? String(emitidos) : '…'} />
          <Metrica etiqueta="Validados" valor={reporte ? String(validados) : '…'} />
          <Metrica etiqueta="Ingresos" valor={reporte ? precio(reporte.ingresos) : '…'} />
        </div>

        <div className={estilos.columnasPanel}>
          <section className={estilos.seccionPanel} aria-label="Ocupación y asistencia">
            <BarraProgreso
              titulo="Ocupación del aforo"
              detalle={`${ocupados} / ${evento.aforo}`}
              valor={evento.aforo ? ocupados / evento.aforo : 0}
            />
            <BarraProgreso
              titulo="Asistencia registrada en puerta"
              detalle={`${validados} / ${emitidos}`}
              valor={emitidos ? validados / emitidos : 0}
              tono="exito"
            />
            {reporte && (reporte.accesosRechazados > 0 || reporte.boletosCancelados > 0) && (
              <p className={estilos.apoyo}>
                {reporte.accesosRechazados} intentos de acceso rechazados · {reporte.boletosCancelados} boletos
                cancelados
                {aNumero(reporte.reembolsado) > 0 && ` · ${importeMxn(reporte.reembolsado)} reembolsados`}
              </p>
            )}

            <h2 className={estilos.subtitulo}>Ventas por tipo de boleto</h2>
            {reporte && reporte.porTipo.length > 0 ? (
              <div className={estilos.tablaDesplazable}>
                <table className={estilos.tabla}>
                  <thead>
                    <tr>
                      <th scope="col">Tipo</th>
                      <th scope="col">Precio</th>
                      <th scope="col">Emitidos</th>
                      <th scope="col">Disponibles</th>
                      <th scope="col">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.porTipo.map((t) => (
                      <tr key={t.tipoBoletoId}>
                        <th scope="row">{t.nombre}</th>
                        <td>{aNumero(t.precio) > 0 ? precio(t.precio) : 'Gratis'}</td>
                        <td>
                          {t.emitidos} / {t.cantidadTotal}
                        </td>
                        <td>{t.disponibles}</td>
                        <td>{precio(t.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={estilos.apoyo}>Todavía no hay boletos emitidos.</p>
            )}
          </section>

          <div className={estilos.seccionPanel}>
            {evento.estado !== 'CANCELADO' && evento.estado !== 'REALIZADO' && (
              <PersonalDeAcceso eventoId={evento.id} />
            )}

            {evento.estado === 'CANCELADO' && (
              <Aviso
                titulo="Evento cancelado"
                tono="error"
                texto={[
                  evento.fechaCancelacion && `Cancelado el ${largo(evento.fechaCancelacion)}.`,
                  evento.motivoCancelacion && `Motivo: ${evento.motivoCancelacion}`,
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            )}

            {evento.estado === 'BORRADOR' && (
              <>
                {evento.latitud === null && (
                  <Aviso
                    tono="aviso"
                    texto="Para publicar hace falta fijar la ubicación en el mapa. Edita el evento para hacerlo."
                  />
                )}
                <Boton
                  icono={<MdPublish />}
                  cargando={publicar.isPending}
                  disabled={evento.latitud === null}
                  onClick={() => publicar.mutate()}
                >
                  Publicar evento
                </Boton>
                {publicar.isError && <Aviso texto={mensajeDeError(publicar.error)} tono="error" anunciar />}
              </>
            )}

            {evento.estado === 'PUBLICADO' && (
              <EnlaceSecundario to={`/eventos/${evento.id}`} icono={<MdOpenInNew />}>
                Ver como asistente
              </EnlaceSecundario>
            )}

            {evento.estado !== 'CANCELADO' && evento.estado !== 'REALIZADO' && (
              <BotonSecundario className={estilos.botonPeligro} onClick={() => setCancelando(true)}>
                Cancelar evento
              </BotonSecundario>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Personal de acceso: el organizador designa por correo a una cuenta ya registrada; la API le concede el rol
 * VALIDADOR para este evento.
 */
function PersonalDeAcceso({ eventoId }: { eventoId: number }) {
  const consultas = useQueryClient();
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const validadores = useQuery({
    queryKey: claves.validadores(eventoId),
    queryFn: ({ signal }) => eventosApi.validadores(eventoId, signal),
  });
  const designar = useMutation({
    mutationFn: () => eventosApi.designarValidador(eventoId, correo.trim().toLowerCase()),
    onSuccess: (v) => {
      setMensaje({ texto: `${v.nombre} ya puede validar accesos de este evento.`, error: false });
      setCorreo('');
      void consultas.invalidateQueries({ queryKey: claves.validadores(eventoId) });
    },
    onError: (e) =>
      setMensaje({
        texto: esCodigo(e, 'NO_ENCONTRADO') ? 'No existe una cuenta registrada con ese correo.' : mensajeDeError(e),
        error: true,
      }),
  });
  const retirar = useMutation({
    mutationFn: (usuarioId: number) => eventosApi.retirarValidador(eventoId, usuarioId),
    onSuccess: () => void consultas.invalidateQueries({ queryKey: claves.validadores(eventoId) }),
    onError: (e) => setMensaje({ texto: mensajeDeError(e), error: true }),
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!correoValido(correo)) {
      setMensaje({ texto: 'Escribe un correo válido.', error: true });
      return;
    }
    designar.mutate();
  }

  return (
    <section className={estilos.personal} aria-labelledby="titulo-personal">
      <h2 id="titulo-personal" className={estilos.tituloPersonal}>
        <MdHowToReg aria-hidden="true" />
        Personal de acceso
      </h2>
      <p className={estilos.apoyo}>Quien designes podrá escanear los códigos QR en la puerta desde su propia cuenta.</p>
      <form className={estilos.formularioPersonal} onSubmit={enviar} noValidate>
        <Campo
          etiqueta="Correo de la persona"
          valor={correo}
          onCambio={(v) => {
            setCorreo(v);
            setMensaje(null);
          }}
          type="email"
          autoComplete="off"
          inputMode="email"
        />
        <Boton type="submit" cargando={designar.isPending} disabled={!correo.trim()}>
          Designar como validador
        </Boton>
      </form>
      {mensaje && <Aviso texto={mensaje.texto} tono={mensaje.error ? 'error' : 'exito'} anunciar />}
      {validadores.data && validadores.data.length > 0 && (
        <>
          <h3 className={estilos.etiquetaPequena}>Designados</h3>
          <ul className={estilos.listaPersonal}>
            {validadores.data.map((v) => (
              <li key={v.usuarioId}>
                <div>
                  <strong>{v.nombre}</strong>
                  <span>{v.correo}</span>
                </div>
                <BotonTexto
                  tono="peligro"
                  disabled={retirar.isPending}
                  onClick={() => retirar.mutate(v.usuarioId)}
                  aria-label={`Quitar a ${v.nombre}`}
                >
                  Quitar
                </BotonTexto>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
