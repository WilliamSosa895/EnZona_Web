import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@/api/http';
import { identidadApi } from '@/api/identidad';
import { mensajeDeError } from '@/lib/errores';
import {
  MENSAJES,
  contrasenaValida,
  correoValido,
  curpValido,
  normalizarTelefono,
  telefonoValido,
} from '@/lib/validaciones';
import { Aviso, BarraSuperior, Boton, Campo } from '@/ui';
import estilos from './Acceso.module.css';

type CampoRegistro = 'nombre' | 'correo' | 'telefono' | 'curp' | 'contrasena' | 'confirmar' | 'aviso';

/** Errores de los campos según las mismas reglas que la API (se muestran después del primer intento). */
function validar(d: Record<CampoRegistro, string | boolean>): Partial<Record<CampoRegistro, string>> {
  const errores: Partial<Record<CampoRegistro, string>> = {};
  if (!String(d.nombre).trim()) errores.nombre = MENSAJES.nombre;
  if (!correoValido(String(d.correo))) errores.correo = MENSAJES.correo;
  if (!telefonoValido(String(d.telefono))) errores.telefono = MENSAJES.telefono;
  if (!curpValido(String(d.curp))) errores.curp = MENSAJES.curp;
  if (!contrasenaValida(String(d.contrasena))) errores.contrasena = MENSAJES.contrasena;
  if (d.contrasena !== d.confirmar) errores.confirmar = MENSAJES.confirmar;
  if (d.aviso !== true) errores.aviso = MENSAJES.aviso;
  return errores;
}

/** Registro de usuario (RF-01). Casos CP-01 (datos válidos), CP-02 (CURP duplicado) y CP-03 (CURP inválido). */
export default function RegistroPage() {
  const navegar = useNavigate();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [curp, setCurp] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [aviso, setAviso] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<Partial<Record<CampoRegistro, string>>>({});

  const errores = intentado ? validar({ nombre, correo, telefono, curp, contrasena, confirmar, aviso }) : {};
  const error = (c: CampoRegistro) => errores[c] ?? erroresServidor[c];

  const registro = useMutation({
    mutationFn: () =>
      identidadApi.registrar({
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        telefono: normalizarTelefono(telefono),
        curp: curp.trim().toUpperCase(),
        contrasena,
        organizador: false,
        aceptaAvisoPrivacidad: aviso,
      }),
    onSuccess: (r) => {
      const telefonoPendiente = r.verificacionesPendientes.includes('TELEFONO');
      navegar(`/verificacion?correo=${encodeURIComponent(r.correo)}${telefonoPendiente ? '&telefono=1' : ''}`, {
        replace: true,
        state: { aviso: 'Tu cuenta se creó. Te enviamos un código de 6 dígitos para activarla.' },
      });
    },
    onError: (causa) => {
      if (!(causa instanceof ApiError)) return;
      if (causa.codigo === 'CORREO_REGISTRADO') setErroresServidor({ correo: 'Ese correo ya está registrado.' });
      else if (causa.codigo === 'CURP_REGISTRADO')
        setErroresServidor({ curp: 'Ese CURP ya está registrado en el sistema.' });
      else if (causa.codigo === 'VALIDACION') {
        const porCampo: Partial<Record<CampoRegistro, string>> = {};
        for (const e of causa.errores) {
          const campo = (e.campo === 'aceptaAvisoPrivacidad' ? 'aviso' : e.campo) as CampoRegistro;
          porCampo[campo] = e.mensaje;
        }
        setErroresServidor(porCampo);
      }
    },
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    setErroresServidor({});
    const pendientes = validar({ nombre, correo, telefono, curp, contrasena, confirmar, aviso });
    if (Object.keys(pendientes).length === 0 && !registro.isPending) registro.mutate();
  }

  const limpiar = (c: CampoRegistro) => setErroresServidor((x) => ({ ...x, [c]: undefined }));
  const errorGeneral =
    registro.isError &&
    !(
      registro.error instanceof ApiError &&
      ['CORREO_REGISTRADO', 'CURP_REGISTRADO', 'VALIDACION'].includes(registro.error.codigo)
    )
      ? mensajeDeError(registro.error)
      : null;
  const hayErrores = intentado && (Object.keys(errores).length > 0 || Object.values(erroresServidor).some(Boolean));

  return (
    <>
      <BarraSuperior titulo="Crear cuenta" volver={() => navegar('/acceso')} />
      <form className={estilos.registro} onSubmit={enviar} noValidate>
        <p className={estilos.nota}>
          Tu CURP se usa como dato de verificación de identidad y se almacena cifrado, conforme a la LFPDPPP.
        </p>
        <Campo
          etiqueta="Nombre completo"
          valor={nombre}
          onCambio={(v) => {
            setNombre(v);
            limpiar('nombre');
          }}
          error={error('nombre')}
          autoComplete="name"
          maxLength={120}
        />
        <Campo
          etiqueta="Correo electrónico"
          valor={correo}
          onCambio={(v) => {
            setCorreo(v);
            limpiar('correo');
          }}
          error={error('correo')}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          maxLength={180}
        />
        <Campo
          etiqueta="Teléfono (opcional)"
          valor={telefono}
          onCambio={(v) => {
            setTelefono(v);
            limpiar('telefono');
          }}
          error={error('telefono')}
          ayuda="Si lo registras, también lo verificaremos con un código."
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
        <Campo
          etiqueta="CURP"
          valor={curp}
          onCambio={(v) => {
            setCurp(v);
            limpiar('curp');
          }}
          error={error('curp')}
          ayuda="18 caracteres. Ejemplo: PERA000229MDFRRSA1"
          mayusculas
          maxLength={18}
          autoCapitalize="characters"
          spellCheck={false}
        />
        <Campo
          etiqueta="Contraseña"
          valor={contrasena}
          onCambio={(v) => {
            setContrasena(v);
            limpiar('contrasena');
          }}
          error={error('contrasena')}
          ayuda="Mínimo 8 caracteres, con letras y números."
          esContrasena
          autoComplete="new-password"
          maxLength={72}
        />
        <Campo
          etiqueta="Confirmar contraseña"
          valor={confirmar}
          onCambio={(v) => {
            setConfirmar(v);
            limpiar('confirmar');
          }}
          error={error('confirmar')}
          esContrasena
          autoComplete="new-password"
          maxLength={72}
        />
        <label className={estilos.casilla}>
          <input
            type="checkbox"
            checked={aviso}
            onChange={(e) => {
              setAviso(e.target.checked);
              limpiar('aviso');
            }}
            aria-invalid={error('aviso') ? true : undefined}
          />
          <span>
            He leído y acepto el{' '}
            <Link to="/privacidad/aviso" target="_blank" rel="noopener">
              aviso de privacidad
            </Link>
            .
          </span>
        </label>
        {error('aviso') && (
          <p className={estilos.error} role="alert">
            {error('aviso')}
          </p>
        )}
        {errorGeneral && <Aviso texto={errorGeneral} tono="error" anunciar />}
        <Boton type="submit" cargando={registro.isPending} style={{ marginTop: 12 }}>
          Crear cuenta
        </Boton>
        {hayErrores && <p className={estilos.nota}>Revisa los campos marcados.</p>}
      </form>
    </>
  );
}
