import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import estilos from './Validador.module.css';

interface Props {
  /** Mientras es false la cámara sigue abierta pero no entrega lecturas (hay un resultado en pantalla). */
  activa: boolean;
  onCodigo: (contenido: string) => void;
  onError: (mensaje: string) => void;
}

/**
 * Lector de QR con la cámara trasera (CamaraQr en Android). ZXing se carga bajo demanda para no pesar en el
 * resto de la aplicación. La cámara solo funciona en un contexto seguro (HTTPS o localhost).
 */
export function CamaraQr({ activa, onCodigo, onError }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const activaRef = useRef(activa);
  const alCodigo = useRef(onCodigo);
  const alError = useRef(onError);
  activaRef.current = activa;
  alCodigo.current = onCodigo;
  alError.current = onError;
  const [lista, setLista] = useState(false);

  useEffect(() => {
    let controles: IScannerControls | null = null;
    let vigente = true;
    let ultimo = '';
    let ultimoEn = 0;

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        alError.current('La cámara solo está disponible en una conexión segura (HTTPS). Captura el código a mano.');
        return;
      }
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        const lector = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
        controles = await lector.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video.current ?? undefined,
          (resultado) => {
            if (!resultado || !activaRef.current) return;
            const texto = resultado.getText();
            // La misma lectura repetida en menos de 3 s es el mismo boleto frente a la cámara.
            if (texto === ultimo && Date.now() - ultimoEn < 3_000) return;
            ultimo = texto;
            ultimoEn = Date.now();
            alCodigo.current(texto);
          },
        );
        if (!vigente) controles.stop();
        else setLista(true);
      } catch (e) {
        const nombre = (e as Error).name;
        alError.current(
          nombre === 'NotAllowedError'
            ? 'No diste permiso para usar la cámara. Actívalo en la configuración del navegador o captura el código a mano.'
            : nombre === 'NotFoundError'
              ? 'No se encontró una cámara en este dispositivo. Captura el código a mano.'
              : 'No se pudo abrir la cámara. Captura el código a mano.',
        );
      }
    })();

    return () => {
      vigente = false;
      controles?.stop();
    };
  }, []);

  return (
    <div className={estilos.camara}>
      <video ref={video} className={estilos.video} muted playsInline aria-label="Vista de la cámara" />
      <span className={estilos.guia} aria-hidden="true" />
      {!lista && <span className={estilos.abriendo}>Abriendo la cámara…</span>}
    </div>
  );
}
