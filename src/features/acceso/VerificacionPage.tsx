import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { CanalVerificacion } from '@/api/tipos';
import { identidadApi } from '@/api/identidad';
import { env } from '@/config/env';
import { mensajeDeError } from '@/lib/errores';
import { codigoValido, correoValido } from '@/lib/validaciones';
import { Aviso, Boton, BotonTexto, Campo, ZonaDemostracion } from '@/ui';
import estilos from './Acceso.module.css';

const ESPERA_REENVIO_S = 60;

/**
 * Verificación de la cuenta con código de un solo uso (RF-02). Casos CP-01 (código correcto) y CP-04 (incorrecto).
 * Si el usuario registró teléfono, después del correo se verifica el teléfono (canal TELEFONO).
 */
export default function VerificacionPage() {
  const navegar = useNavigate();
  const { state } = useLocation() as { state: { aviso?: string } | null };
  const [parametros] = useSearchParams();
  const [correo, setCorreo] = useState(parametros.get('correo') ?? '');
  const correoFijo = !!parametros.get('correo');
  const [canal, setCanal] = useState<CanalVerificacion>('CORREO');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(state?.aviso ?? null);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [espera]);

  const verificacion = useMutation({
    mutationFn: () => identidadApi.verificar(correo.trim().toLowerCase(), codigo, canal),
    onSuccess: (r) => {
      setCodigo('');
      if (r.estado === 'ACTIVO') {
        navegar('/acceso', { replace: true, state: { aviso: 'Tu cuenta está activa. Ya puedes iniciar sesión.' } });
      } else if (r.verificacionesPendientes.includes('TELEFONO')) {
        setCanal('TELEFONO');
        setInfo('Correo verificado. Ahora ingresa el código que enviamos a tu teléfono.');
      }
    },
    onError: (causa) => setError(mensajeDeError(causa)),
  });

  const reenvio = useMutation({
    mutationFn: () => identidadApi.reenviarCodigo(correo.trim().toLowerCase(), canal),
    onSuccess: () => {
      setEspera(ESPERA_REENVIO_S);
      setCodigo('');
      setError(null);
      setInfo(
        canal === 'TELEFONO' ? 'Te enviamos un código nuevo por SMS.' : 'Te enviamos un código nuevo a tu correo.',
      );
    },
    onError: (causa) => setError(mensajeDeError(causa)),
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!codigoValido(codigo) || !correoValido(correo) || verificacion.isPending) return;
    setError(null);
    verificacion.mutate();
  }

  return (
    <div className={estilos.pantalla}>
      <div className={estilos.columna}>
        <h1 className={estilos.titulo} style={{ marginTop: 90 }}>
          Verifica tu cuenta
        </h1>
        <p className={estilos.lema} style={{ marginTop: 8 }}>
          {canal === 'TELEFONO'
            ? 'Enviamos un código de 6 dígitos a tu teléfono. Ingrésalo para terminar de activar tu cuenta.'
            : 'Enviamos un código de 6 dígitos a tu correo. Ingrésalo para activar tu cuenta.'}
        </p>

        <form className={estilos.formulario} onSubmit={enviar} noValidate>
          {info && <Aviso texto={info} tono="exito" anunciar />}
          {env.apiSimulada && (
            <ZonaDemostracion>
              <span>La API simulada no envía correos. El código es:</span>
              <span className={estilos.codigoDemo}>123456</span>
            </ZonaDemostracion>
          )}
          {!correoFijo && (
            <Campo
              etiqueta="Correo de tu cuenta"
              valor={correo}
              onCambio={setCorreo}
              type="email"
              inputMode="email"
              autoComplete="email"
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
            error={error}
          />
          <Boton
            type="submit"
            disabled={!codigoValido(codigo) || !correoValido(correo)}
            cargando={verificacion.isPending}
          >
            Verificar
          </Boton>
        </form>
        <BotonTexto
          onClick={() => reenvio.mutate()}
          disabled={espera > 0 || reenvio.isPending || !correoValido(correo)}
          style={{ marginTop: 8 }}
        >
          {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
        </BotonTexto>
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
