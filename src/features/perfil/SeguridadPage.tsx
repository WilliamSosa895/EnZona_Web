import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MdCheckCircle, MdMail, MdPhone } from 'react-icons/md';
import { ApiError } from '@/api/http';
import { identidadApi } from '@/api/identidad';
import { claves } from '@/app/consultas';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import { contrasenaValida, MENSAJES } from '@/lib/validaciones';
import { Aviso, BarraSuperior, Boton, Campo, Tarjeta } from '@/ui';
import { Apartado } from '@/features/informacion/Apartado';
import estilos from './Perfil.module.css';

/** Seguridad: estado de verificación de la cuenta y cambio de contraseña (SecurityScreen en Android). */
export default function SeguridadPage() {
  const perfil = useQuery({ queryKey: claves.perfil, queryFn: ({ signal }) => identidadApi.perfil(signal) });
  const p = perfil.data;

  return (
    <>
      <BarraSuperior titulo="Seguridad" volver />
      <div className={estilos.contenedorAjuste}>
        <h2 className={estilos.subtitulo}>Estado de la cuenta</h2>
        <Tarjeta>
          {perfil.isError && <Aviso texto={mensajeDeError(perfil.error)} tono="error" />}
          {p && (
            <>
              <div className={estilos.dato}>
                <MdMail aria-hidden="true" className={p.correoVerificado ? estilos.ok : estilos.pendiente} />
                <div>
                  <strong>Correo electrónico</strong>
                  <span>
                    {p.correo} · {p.correoVerificado ? 'verificado' : 'sin verificar'}
                  </span>
                </div>
              </div>
              <div className={estilos.dato}>
                <MdPhone aria-hidden="true" className={p.telefonoVerificado ? estilos.ok : estilos.neutro} />
                <div>
                  <strong>Teléfono</strong>
                  <span>
                    {p.telefono
                      ? `${p.telefono} · ${p.telefonoVerificado ? 'verificado' : 'sin verificar'}`
                      : 'Sin registrar'}
                  </span>
                </div>
              </div>
              <div className={estilos.dato}>
                <MdCheckCircle aria-hidden="true" className={estilos.ok} />
                <div>
                  <strong>Identidad verificada con CURP</strong>
                  <span>Reduce el fraude y la duplicación de boletos</span>
                </div>
              </div>
            </>
          )}
        </Tarjeta>

        <h2 className={estilos.subtitulo}>Cambiar contraseña</h2>
        <CambioContrasena />

        <Apartado titulo="Cómo protegemos tu cuenta">
          Tu contraseña se guarda cifrada con un algoritmo de un solo sentido: ni el equipo de EnZona puede leerla. Las
          sesiones usan un token firmado que caduca, y tu CURP se almacena cifrado y nunca se muestra a terceros.
        </Apartado>
      </div>
    </>
  );
}

function CambioContrasena() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [listo, setListo] = useState(false);

  const errorNueva = !contrasenaValida(nueva)
    ? MENSAJES.contrasena
    : nueva === actual
      ? 'La nueva contraseña debe ser distinta de la actual.'
      : null;
  const errorConfirmar = confirmar !== nueva ? MENSAJES.confirmar : null;

  const cambio = useMutation({
    mutationFn: () => identidadApi.cambiarContrasena(actual, nueva),
    onSuccess: () => {
      setActual('');
      setNueva('');
      setConfirmar('');
      setIntentado(false);
      setListo(true);
    },
  });
  const errorServidor = cambio.error instanceof ApiError ? cambio.error : null;
  const actualIncorrecta = esCodigo(cambio.error, 'CREDENCIALES_INVALIDAS');

  function enviar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    setListo(false);
    if (!actual || errorNueva || errorConfirmar) return;
    cambio.mutate();
  }

  const limpiar = () => {
    setListo(false);
    if (cambio.isError) cambio.reset();
  };

  return (
    <form className={estilos.formulario} onSubmit={enviar} noValidate>
      <Campo
        etiqueta="Contraseña actual"
        valor={actual}
        onCambio={(v) => {
          setActual(v);
          limpiar();
        }}
        esContrasena
        autoComplete="current-password"
        error={
          (intentado && !actual && 'Escribe tu contraseña actual.') ||
          (actualIncorrecta ? 'La contraseña actual no es correcta.' : null)
        }
      />
      <Campo
        etiqueta="Nueva contraseña"
        valor={nueva}
        onCambio={(v) => {
          setNueva(v);
          limpiar();
        }}
        esContrasena
        autoComplete="new-password"
        ayuda={MENSAJES.contrasena}
        error={(intentado && errorNueva) || errorServidor?.errorDeCampo('nueva')}
      />
      <Campo
        etiqueta="Confirmar nueva contraseña"
        valor={confirmar}
        onCambio={(v) => {
          setConfirmar(v);
          limpiar();
        }}
        esContrasena
        autoComplete="new-password"
        error={intentado ? errorConfirmar : null}
      />
      {cambio.isError && !actualIncorrecta && !errorServidor?.errores.length && (
        <Aviso texto={mensajeDeError(cambio.error)} tono="error" anunciar />
      )}
      {listo && <Aviso texto="Tu contraseña se actualizó correctamente." tono="exito" anunciar />}
      <Boton type="submit" cargando={cambio.isPending}>
        Actualizar contraseña
      </Boton>
    </form>
  );
}
