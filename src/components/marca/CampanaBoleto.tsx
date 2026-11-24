import { cn } from "@/lib/cn";

/**
 * Campana de notificaciones con aire de boleto (`drawable/ic_campana_boleto.xml`
 * de la app): cuerpo azul EnZona con muescas, línea de perforación blanca y
 * badajo azul marino. Mismas rutas que el vector original.
 */
export function CampanaBoleto({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-7", className)}>
      <path
        fill="#2E86AB"
        fillRule="evenodd"
        d="M12 1.3 A1.1 1.1 0 1 1 11.99 1.3 Z M12 2.6 C8.3 2.6 5.7 5.3 5.7 8.9 V13.1 L3.4 16.1 V17.6 H20.6 V16.1 L18.3 13.1 V8.9 C18.3 5.3 15.7 2.6 12 2.6 Z M4.9 17.6 A1.4 1.4 0 1 0 4.89 17.6 Z M19.1 17.6 A1.4 1.4 0 1 0 19.09 17.6 Z"
      />
      <path
        stroke="#FFFFFF"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
        d="M7.4 14.9 H8.3 M9.7 14.9 H10.6 M12 14.9 H12.9 M14.3 14.9 H15.2 M16.6 14.9 H17.1"
      />
      <path fill="#1F3A5F" d="M10 20.2 A2 2 0 1 0 14 20.2 A2 2 0 1 0 10 20.2 Z" />
    </svg>
  );
}
