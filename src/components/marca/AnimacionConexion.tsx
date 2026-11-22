import { cn } from "@/lib/cn";

/*
 * Pantalla de conexión (`ui/components/AnimacionConexion.kt`): sobre azul muy
 * claro, el contorno del pin se traza, el disco se llena, el boleto aparece
 * con un rebote y entra el nombre. Con `prefers-reduced-motion` el logo se
 * muestra directamente (globals.css anula las animaciones).
 */
export function AnimacionConexion({ mensaje = "Conectando con EnZona…", className }: { mensaje?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex min-h-dvh flex-col items-center justify-center gap-8 bg-cielo px-6", className)}
    >
      <svg viewBox="0 0 360 380" width="190" height="200" aria-hidden="true">
        <path
          fill="none"
          stroke="#1B819C"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray="1200"
          strokeDashoffset="1200"
          style={{ animation: "trazo 1.1s ease-out forwards" }}
          d="M180 15C270 15 333 82 333 168c0 68-43 118-70 149-23 25-41 50-83 50s-60-25-83-50C70 286 27 236 27 168 27 82 90 15 180 15Z"
        />
        <g style={{ animation: "aparecer 600ms 900ms ease-out both", transformOrigin: "180px 168px" }}>
          <circle cx="180" cy="168" r="128" fill="#1C4E78" />
          <circle cx="180" cy="168" r="112" fill="#21416E" />
          <circle cx="52" cy="168" r="14" fill="#1C4E78" />
          <circle cx="308" cy="168" r="14" fill="#1C4E78" />
        </g>
        <g
          style={{ animation: "aparecer 700ms 1400ms cubic-bezier(.34,1.56,.64,1) both", transformOrigin: "180px 168px" }}
          transform="translate(180 168) rotate(-45) translate(-75 -45)"
        >
          <path fill="#FFFFFF" stroke="#3489B1" strokeWidth="5" d="M0 0h150v30a15 15 0 0 0 0 30v30H0V60a15 15 0 0 0 0-30Z" />
          <path
            stroke="#3489B1"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
            d="M34 8v6m0 5v6m0 5v6m0 5v6m0 5v6m0 5v6m0 5v6M116 8v6m0 5v6m0 5v6m0 5v6m0 5v6m0 5v6m0 5v6"
          />
        </g>
      </svg>
      <p
        className="text-4xl font-black tracking-tight"
        style={{ animation: "entrar 500ms 2000ms ease-out both" }}
      >
        <span className="text-marino">En</span>
        <span className="text-enzona">Zona</span>
      </p>
      <p className="text-lg text-gris-texto">{mensaje}</p>
    </div>
  );
}
