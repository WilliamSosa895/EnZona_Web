"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * QR del boleto: contenido `codigo.firma` tal cual lo entrega la API, oscuro
 * sobre blanco, completo y con margen, sin degradados ni elementos encima
 * (corrección M, como ZXing en la app).
 */
export function CodigoQr({ contenido, tamano = 280, anulado }: { contenido: string; tamano?: number; anulado?: boolean }) {
  return (
    <div className="relative inline-flex rounded-campo bg-blanco p-3">
      <QRCodeSVG
        value={contenido}
        size={tamano}
        level="M"
        marginSize={1}
        bgColor="#FFFFFF"
        fgColor="#1B2432"
        role="img"
        aria-label="Código QR del boleto"
        className={anulado ? "opacity-25" : undefined}
      />
      {anulado ? (
        <span className="absolute inset-0 flex items-center justify-center text-center text-lg font-bold text-error">
          Boleto anulado
        </span>
      ) : null}
    </div>
  );
}
