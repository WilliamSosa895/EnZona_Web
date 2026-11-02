import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { CanalVerificacion } from '@/api/tipos';
import { identidadApi } from '@/api/identidad';
import { env } from '@/config/env';
import { mensajeDeError } from '@/lib/errores';
import { codigoValido, correoValido } from '@/lib/validaciones';
import { Aviso, Boton, BotonTexto, Campo, ZonaDemostracion } from '@/ui';
import { leerUltimoEnvio, registrarEnvio, segundosRestantes, textoReenvio } from './reenvio';
import estilos from './Acceso.module.css';

/** Cuando la API pide el código del teléfono: EnZona solo envía correo (Resend), así que ese código no llegaría. */
export const AVISO_SIN_SMS =
  'Tu cuenta tiene un teléfono registrado y por ahora EnZona no envía SMS. ' +
  'Escribe al equipo de EnZona (enzona.org@gmail.com) para activarla.';

/** La web solo pide el código del correo; el del teléfono exigiría un SMS que la API no envía. */
const canal: CanalVerificacion = 'CORREO';

const AYUDA_CORREO =
  'Si no lo ves, revisa la carpeta de no deseados: llega de EnZona con el asunto «Tu código de verificación de EnZona».';

/**
 * Verificación de la cuenta con código de un solo uso (RF-02). Casos CP-01 (código correcto) y CP-04 (incorrecto).
 * La API envía el código por correo. Si además pide el del teléfono, la pantalla no lo solicita (no hay SMS):
 * explica cómo activar la cuenta y deshabilita Verificar y Reenviar, como OtpScreen en Android.
 */
export default function VerificacionPage() {
  const navegar = useNavigate();
  const { state } = useLocation() as { state: { aviso?: string } | null };
  const [parametros] = useSearchParams();
  const [correo, setCorreo] = useState(parametros.get('correo') ?? '');
  const correoFijo = !!parametros.get('correo');
  const [codigo, setCodigo] = useState('');
  // Fallo al verificar (la cuenta sigue sin activar) y fallo al pedir otro código: son cosas distintas.
  const [error, setError] = useState<string | null>(null);
  const [errorReenvio, setErrorReenvio] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(state?.aviso ?? null);
  const [sinSms, setSinSms] = useState(false);
  // Al venir del registro la API acaba de emitir un código: la espera corre desde el principio.
  const [espera, setEspera] = useState(() => (env.apiSimulada ? 0 : segundosRestantes(leerUltimoEnvio(correo))));

  useEffect(() => {
    if (espera <= 0) return;
    const t = window.setTimeout(() => setEspera(segundosRestantes(leerUltimoEnvio(correo))), 1000);
    return () => window.clearTimeout(t);
  }, [espera, correo]);

  const verificacion = useMutation({
    mutationFn: () => identidadApi.verificar(correo.trim().toLowerCase(), codigo, canal),
    onSuccess: (r) => {
      setCodigo('');
      if (r.estado === 'ACTIVO') {
        navegar('/acceso', { replace: true, state: { aviso: 'Tu cuenta está activa. Ya puedes iniciar sesión.' } });
      } else if (r.verificacionesPendientes.includes('TELEFONO')) {
        // Sin proveedor de SMS ese código nunca llegará: no se pide.
        setSinSms(true);
        setInfo(null);
      }
    },
    onError: (causa) => setError(mensajeDeError(causa)),
  });

  const reenvio = useMutation({
    mutationFn: () => identidadApi.reenviarCodigo(correo.trim().toLowerCase(), canal),
    onSuccess: () => {
      registrarEnvio(correo);
      setEspera(env.apiSimulada ? 0 : segundosRestantes(leerUltimoEnvio(correo)));
      setCodigo('');
      setError(null);
      // La API descarta en silencio un reenvío antes de 60 s: el código anterior sigue valiendo.
      setInfo('Pedimos un código nuevo para tu correo. Si no llega en un minuto, el anterior sigue vigente.');
    },
    onError: (causa) => setErrorReenvio(mensajeDeError(causa)),
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (sinSms || !codigoValido(codigo) || !correoValido(correo) || verificacion.isPending) return;
    setError(null);
    setErrorReenvio(null);
    verificacion.mutate();
  }

  return (
    <div className={estilos.pantalla}>
      <div className={estilos.columna}>
        <h1 className={estilos.titulo} style={{ marginTop: 90 }}>
          Verifica tu cuenta
        </h1>
        <p className={estilos.lema} style={{ marginTop: 8 }}>
          {sinSms
            ? 'Tu correo quedó verificado, pero falta confirmar el teléfono.'
            : 'Enviamos un código de 6 dígitos a tu correo. Ingrésalo para activar tu cuenta.'}
        </p>

        <form className={estilos.formulario} onSubmit={enviar} noValidate>
          {info && <Aviso texto={info} tono="exito" anunciar />}
          {sinSms && <Aviso texto={AVISO_SIN_SMS} anunciar />}
          {env.apiSimulada && !sinSms && (
            <ZonaDemostracion>
              <span>La API simulada no envía correos. El código es:</span>
              <span className={estilos.codigoDemo}>123456</span>
            </ZonaDemostracion>
          )}
          {!correoFijo && (
            <Campo
              etiqueta="Correo de tu cuenta"
              valor={correo}
              onCambio={(v) => {
                setCorreo(v);
                setEspera(env.apiSimulada ? 0 : segundosRestantes(leerUltimoEnvio(v)));
              }}
              type="email"
              inputMode="email"
              autoComplete="email"
              disabled={sinSms}
              error={correo && !correoValido(correo) ? 'El correo no tiene un formato válido.' : null}
            />
          )}
          <Campo
            etiqueta="Código de verificación"
            valor={codigo}
            onCambio={(v) => {
              if (/^\d{0,6}$/.test(v)) {
                setCodigo(v);
                setError(null);
              }
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            disabled={sinSms}
            // Con la API simulada el código se ve arriba: no hay correo que buscar.
            ayuda={!env.apiSimulada && !sinSms ? AYUDA_CORREO : undefined}
            error={error}
          />
          <Boton
            type="submit"
            disabled={sinSms || !codigoValido(codigo) || !correoValido(correo)}
            cargando={verificacion.isPending}
          >
            Verificar
          </Boton>
        </form>
        <BotonTexto
          onClick={() => {
            setErrorReenvio(null);
            reenvio.mutate();
          }}
          disabled={sinSms || espera > 0 || reenvio.isPending || !correoValido(correo)}
          style={{ marginTop: 8 }}
        >
          {textoReenvio(espera)}
        </BotonTexto>
        {errorReenvio && (
          <p className={estilos.error} role="alert" style={{ textAlign: 'center', marginTop: 8 }}>
            {errorReenvio}
          </p>
        )}
        {error && (
          <p className={estilos.error} style={{ textAlign: 'center', marginTop: 8 }}>
            La cuenta permanece sin activar hasta que el código sea correcto.
          </p>
        )}
        <BotonTexto tono="neutro" onClick={() => navegar('/acceso')} style={{ marginTop: 8 }}>
          Volver a iniciar sesión
        </BotonTexto>
      </div>
    </div>
  );
}
