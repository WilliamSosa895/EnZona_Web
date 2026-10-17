import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MdCheckCircle } from 'react-icons/md';
import type { ApiError } from '@/api/http';
import { ErrorModoAcceso } from '@/auth/contexto';
import { rutaInicio } from '@/auth/roles';
import { useSesion } from '@/auth/useSesion';
import { env } from '@/config/env';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import logo from '@/assets/enzona_logo.png';
import { Aviso, Boton, BotonTexto, Campo } from '@/ui';
import estilos from './Acceso.module.css';

interface EstadoNavegacion {
  desde?: string;
  aviso?: string;
}

/**
 * Inicio de sesión (RF-03). `modoPersonal` es el acceso especial para organizadores, validadores y
 * administradores: mismo mecanismo, pero pantalla y mensajes diferenciados (igual que LoginScreen en Android).
 */
export default function AccesoPage({ modoPersonal }: { modoPersonal: boolean }) {
  const { iniciarSesion, avisoCierre } = useSesion();
  const navegar = useNavigate();
  const { state } = useLocation() as { state: EstadoNavegacion | null };
  const [identificador, setIdentificador] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const usuario = await iniciarSesion(identificador.trim(), contrasena, modoPersonal);
      const destino = state?.desde && state.desde !== '/' ? state.desde : rutaInicio(usuario.roles, modoPersonal);
      navegar(destino, { replace: true });
    } catch (causa) {
      if (esCodigo(causa, 'CUENTA_PENDIENTE') && identificador.includes('@')) {
        navegar(`/verificacion?correo=${encodeURIComponent(identificador.trim())}`, {
          state: { aviso: 'Tu cuenta aún no está verificada. Ingresa el código que enviamos a tu correo.' },
        });
        return;
      }
      setError(causa instanceof ErrorModoAcceso ? causa.message : mensajeDeError(causa as ApiError));
    } finally {
      setEnviando(false);
    }
  }

  const avisoInicial = state?.aviso ?? avisoCierre;

  return (
    <div className={estilos.pantalla}>
      <div className={estilos.columna}>
        <img src={logo} alt="EnZona" className={estilos.logo} width={300} height={87} />
        {modoPersonal && <h1 className={estilos.titulo}>Acceso del personal</h1>}
        <p className={estilos.lema}>
          {modoPersonal ? 'Organizadores, validadores y administración' : 'Descubre y accede a los eventos de tu zona'}
        </p>

        <form className={estilos.formulario} onSubmit={enviar} noValidate>
          {!modoPersonal && <h1 className="sr-only">Iniciar sesión</h1>}
          {avisoInicial && (
            <Aviso
              texto={avisoInicial}
              tono={state?.aviso ? 'exito' : 'aviso'}
              icono={state?.aviso ? <MdCheckCircle /> : undefined}
              anunciar
            />
          )}
          <Campo
            etiqueta="Correo o CURP"
            valor={identificador}
            onCambio={(v) => {
              setIdentificador(v);
              setError(null);
            }}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
          <Campo
            etiqueta="Contraseña"
            valor={contrasena}
            onCambio={(v) => {
              setContrasena(v);
              setError(null);
            }}
            esContrasena
            autoComplete="current-password"
          />
          {error && (
            <p className={estilos.error} role="alert">
              {error}
            </p>
          )}
          <Boton
            type="submit"
            disabled={!identificador.trim() || !contrasena}
            cargando={enviando}
            style={{ marginTop: 10 }}
          >
            Iniciar sesión
          </Boton>
        </form>

        <div className={estilos.enlaces}>
          {!modoPersonal && <BotonTexto onClick={() => navegar('/registro')}>¿No tienes cuenta? Regístrate</BotonTexto>}
          <BotonTexto tono="neutro" onClick={() => navegar(modoPersonal ? '/acceso' : '/acceso/personal')}>
            {modoPersonal ? 'Volver al acceso de asistentes' : 'Acceso para organizadores y personal'}
          </BotonTexto>
          <BotonTexto tono="neutro" onClick={() => navegar('/verificacion')}>
            Verificar mi cuenta con un código
          </BotonTexto>
        </div>

        {env.apiSimulada && (
          <div className={estilos.demo}>
            <strong>Cuentas de prueba · contraseña: enzona123</strong>
            {modoPersonal ? (
              <>
                <span>organizador@uv.mx — crea y gestiona eventos</span>
                <span>validador@uv.mx — escanea boletos en la puerta</span>
                <span>admin@uv.mx — gestiona usuarios y eventos</span>
              </>
            ) : (
              <span>asistente@uv.mx — compra boletos y muestra su QR</span>
            )}
          </div>
        )}
        <p className={estilos.nota} style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/privacidad/aviso">Aviso de privacidad</Link>
        </p>
      </div>
    </div>
  );
}
