import { useEffect, useState } from 'react';

/**
 * Mantiene la pantalla encendida mientras se muestra el boleto (Screen Wake Lock API). Es el equivalente web
 * del brillo al máximo de Android, que el navegador no permite controlar. Devuelve si se logró activar.
 */
export function useMantenerPantalla(activo: boolean): boolean {
  const [activado, setActivado] = useState(false);

  useEffect(() => {
    if (!activo || !('wakeLock' in navigator)) return;
    let bloqueo: WakeLockSentinel | null = null;
    let vigente = true;

    const solicitar = async () => {
      try {
        bloqueo = await navigator.wakeLock.request('screen');
        if (!vigente) return void bloqueo.release();
        setActivado(true);
        bloqueo.addEventListener('release', () => vigente && setActivado(false));
      } catch {
        setActivado(false); // batería baja, pestaña oculta o permiso denegado: no es un error para el usuario
      }
    };
    // El bloqueo se libera al ocultar la pestaña; se vuelve a pedir al regresar.
    const alCambiarVisibilidad = () => document.visibilityState === 'visible' && void solicitar();

    void solicitar();
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      vigente = false;
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      void bloqueo?.release().catch(() => undefined);
    };
  }, [activo]);

  return activado;
}
