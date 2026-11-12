"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Flashlight, FlashlightOff } from "lucide-react";
import { Boton } from "@/components/ui/Boton";

/*
 * Cámara del validador con ZXing (`@zxing/browser`), como CamaraQr.kt con
 * ML Kit. Ocupa el área disponible, ofrece linterna cuando el dispositivo lo
 * permite y entrega cada lectura al padre; el padre decide cuándo pausar.
 */

interface Props {
  activo: boolean;
  onLeer: (texto: string) => void;
}

export function LectorQr({ activo, onLeer }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const controles = useRef<{ stop: () => void } | null>(null);
  const pista = useRef<MediaStreamTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linterna, setLinterna] = useState(false);
  const [tieneLinterna, setTieneLinterna] = useState(false);
  const ultimaLectura = useRef<{ texto: string; momento: number }>({ texto: "", momento: 0 });
  const onLeerRef = useRef(onLeer);
  useEffect(() => {
    onLeerRef.current = onLeer;
  }, [onLeer]);

  useEffect(() => {
    if (!activo || !video.current) return;
    let cancelado = false;
    setError(null);

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError("La cámara solo funciona con HTTPS o en localhost. Escribe el código a mano.");
        return;
      }
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const lector = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
        const dispositivos = await BrowserQRCodeReader.listVideoInputDevices();
        const trasera = dispositivos.find((dispositivo) => /back|rear|trasera|environment/i.test(dispositivo.label));
        if (cancelado || !video.current) return;
        const control = await lector.decodeFromVideoDevice(trasera?.deviceId, video.current, (resultado) => {
          if (!resultado) return;
          const texto = resultado.getText();
          const ahora = Date.now();
          // Evita leer el mismo QR varias veces seguidas mientras sigue frente a la cámara.
          if (texto === ultimaLectura.current.texto && ahora - ultimaLectura.current.momento < 2500) return;
          ultimaLectura.current = { texto, momento: ahora };
          onLeerRef.current(texto);
        });
        controles.current = control;
        const flujo = video.current.srcObject as MediaStream | null;
        const track = flujo?.getVideoTracks()[0] ?? null;
        pista.current = track;
        const capacidades = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        setTieneLinterna(Boolean(capacidades?.torch));
      } catch (causa) {
        if (cancelado) return;
        const nombre = causa instanceof Error ? causa.name : "";
        setError(
          nombre === "NotAllowedError"
            ? "Sin permiso para usar la cámara. Permítelo en el navegador o escribe el código a mano."
            : nombre === "NotFoundError"
              ? "No se encontró ninguna cámara. Escribe el código a mano."
              : "No se pudo iniciar la cámara. Escribe el código a mano.",
        );
      }
    })();

    return () => {
      cancelado = true;
      controles.current?.stop();
      controles.current = null;
      pista.current = null;
      setLinterna(false);
    };
  }, [activo]);

  const alternarLinterna = async () => {
    const track = pista.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !linterna } as MediaTrackConstraintSet] });
      setLinterna((valor) => !valor);
    } catch {
      setTieneLinterna(false);
    }
  };

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-tarjeta bg-tinta sm:aspect-video">
      <video ref={video} className="size-full object-cover" muted playsInline aria-label="Vista de la cámara para escanear códigos QR" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-[62%] max-h-[70%] rounded-[1.25rem] border-[3px] border-blanco/90 shadow-[0_0_0_9999px_rgba(27,36,50,0.35)]" />
      </div>
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-tinta/90 px-6 text-center text-blanco">
          <CameraOff className="size-10" aria-hidden="true" />
          <p className="text-[15px]">{error}</p>
        </div>
      ) : !activo ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-tinta/70 text-blanco">
          <Camera className="size-10" aria-hidden="true" />
          <p className="text-[15px]">Cámara en pausa</p>
        </div>
      ) : null}
      {tieneLinterna && activo && !error ? (
        <div className="absolute right-3 bottom-3">
          <Boton variante="contorno" tamano="compacto" className="border-blanco/60 bg-tinta/50 text-blanco hover:bg-tinta/70" onClick={alternarLinterna} icono={linterna ? <FlashlightOff className="size-4" aria-hidden="true" /> : <Flashlight className="size-4" aria-hidden="true" />}>
            {linterna ? "Apagar linterna" : "Linterna"}
          </Boton>
        </div>
      ) : null}
    </div>
  );
}
