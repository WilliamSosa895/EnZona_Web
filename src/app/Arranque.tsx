import { useEffect, useState, type ReactNode } from 'react';
import { MdCloudOff, MdErrorOutline } from 'react-icons/md';
import { useSesion } from '@/auth/useSesion';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import { EstadoVacio } from '@/ui';
import { PantallaConectando } from './PantallaConectando';
import estilos from './PantallaConectando.module.css';

/**
 * Tiempo mínimo de la pantalla de conexión, como en Android (`TiemposConexion.TEXTO_FIN + 250`): el logo alcanza
 * a armarse completo aunque la API conteste en milisegundos.
 */
export const DURACION_MINIMA_CONEXION_MS = 2_050;

type Estado = { fase: 'conectando' } | { fase: 'lista' } | { fase: 'fallo'; mensaje: string; sinConexion: boolean };

const esperar = (ms: number) => new Promise<void>((resolver) => window.setTimeout(resolver, Math.max(0, ms)));

/**
 * Al abrir EnZona con una sesión guardada, la comprueba con `GET /api/usuarios/me` (restaurarSesion en Android)
 * mientras muestra la animación de conexión: así se recuperan el nombre y los roles vigentes y una cuenta
 * bloqueada o un token vencido no llegan a ver pantallas. Sin sesión guardada no hay nada que comprobar y la
 * aplicación se muestra de inmediato. Si la API no responde, se ofrece reintentar.
 */
export function Arranque({
  children,
  duracionMinimaMs = DURACION_MINIMA_CONEXION_MS,
}: {
  children: ReactNode;
  duracionMinimaMs?: number;
}) {
  const { autenticado, refrescar } = useSesion();
  const [estado, setEstado] = useState<Estado>(() => (autenticado ? { fase: 'conectando' } : { fase: 'lista' }));

  useEffect(() => {
    if (estado.fase !== 'conectando') return;
    let vigente = true;
    const inicio = performance.now();
    (async () => {
      let siguiente: Estado = { fase: 'lista' };
      try {
        await refrescar();
      } catch (error) {
        // Un 401 ya cerró la sesión (el cliente HTTP avisa): la persona sigue al acceso con el motivo.
        if (!esCodigo(error, 'NO_AUTENTICADO')) {
          siguiente = { fase: 'fallo', mensaje: mensajeDeError(error), sinConexion: esCodigo(error, 'SIN_CONEXION') };
        }
      }
      await esperar(duracionMinimaMs - (performance.now() - inicio));
      if (vigente) setEstado(siguiente);
    })();
    return () => {
      vigente = false;
    };
  }, [estado, refrescar, duracionMinimaMs]);

  if (estado.fase === 'conectando') return <PantallaConectando />;
  if (estado.fase === 'fallo') {
    return (
      <main className={estilos.pantalla}>
        <EstadoVacio
          icono={estado.sinConexion ? <MdCloudOff size={56} /> : <MdErrorOutline size={56} />}
          titulo={estado.sinConexion ? 'Sin conexión con el servidor' : 'No se pudo cargar'}
          texto={estado.mensaje}
          textoAccion="Reintentar"
          onAccion={() => setEstado({ fase: 'conectando' })}
        />
      </main>
    );
  }
  return <>{children}</>;
}
