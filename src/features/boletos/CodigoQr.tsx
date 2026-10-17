import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface CodigoQrProps {
  /** Texto exacto que espera el validador: "codigo.firma". */
  contenido: string;
  descripcion: string;
  atenuado?: boolean;
  className?: string;
}

/**
 * QR negro sobre blanco puro con zona de silencio, sin nada encima (requisito para leerlo con la cámara del
 * validador). Se genera en el navegador: el contenido firmado no sale a ningún servicio externo.
 */
export function CodigoQr({ contenido, descripcion, atenuado = false, className }: CodigoQrProps) {
  const [imagen, setImagen] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;
    QRCode.toDataURL(contenido, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => vigente && setImagen(url))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, [contenido]);

  if (fallo) return <p role="alert">No se pudo dibujar el código QR. Muestra el código de referencia en el acceso.</p>;
  if (!imagen) return <div className={className} aria-busy="true" aria-label="Generando el código QR" />;
  return (
    <img
      src={imagen}
      alt={descripcion}
      className={className}
      style={atenuado ? { opacity: 0.3 } : undefined}
      width={512}
      height={512}
    />
  );
}
