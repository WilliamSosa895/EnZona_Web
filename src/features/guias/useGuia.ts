import { useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { suscribirGuias, versionGuias, type ClaveGuia } from './almacen';
import { GuiasContext, type PasoGuia } from './contexto';

/** Deja que la pantalla termine de dibujarse y de colocar sus objetivos antes de abrir la guía. */
const ESPERA_ANTES_DE_ABRIR_MS = 450;

/**
 * Declara la guía de la pantalla en la que se llama (GuiaDePantalla en Android). Se abre sola la primera vez;
 * `activa = false` la pospone, por ejemplo hasta que terminen de cargar los datos. Los objetivos se marcan con
 * el atributo `data-guia` en el elemento que se quiere iluminar.
 */
export function useGuia(clave: ClaveGuia, pasos: PasoGuia[], activa = true): void {
  const guias = useContext(GuiasContext);
  // Si se reinician desde Perfil, la pantalla vuelve a pedir su guía.
  const version = useSyncExternalStore(suscribirGuias, versionGuias, versionGuias);
  const pasosVigentes = useRef(pasos);
  pasosVigentes.current = pasos;

  useEffect(() => {
    if (!guias || !activa) return;
    const temporizador = window.setTimeout(() => guias.pedir(clave, pasosVigentes.current), ESPERA_ANTES_DE_ABRIR_MS);
    return () => window.clearTimeout(temporizador);
  }, [guias, clave, activa, version]);

  useEffect(() => () => guias?.cancelar(clave), [guias, clave]);
}
