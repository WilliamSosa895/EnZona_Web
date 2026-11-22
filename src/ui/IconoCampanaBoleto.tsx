/**
 * Campana de notificaciones con aire de boleto (ic_campana_boleto.xml de Android): cuerpo azul EnZona con muescas
 * en el borde, línea de perforación blanca y badajo azul marino. Es decorativa; el botón lleva su propia etiqueta.
 */
export function IconoCampanaBoleto({ tamano = 30 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#2E86AB"
        fillRule="evenodd"
        d="M12 1.3A1.1 1.1 0 1 1 11.99 1.3ZM12 2.6C8.3 2.6 5.7 5.3 5.7 8.9V13.1L3.4 16.1V17.6H20.6V16.1L18.3 13.1V8.9C18.3 5.3 15.7 2.6 12 2.6ZM4.9 17.6A1.4 1.4 0 1 0 4.89 17.6ZM19.1 17.6A1.4 1.4 0 1 0 19.09 17.6Z"
      />
      <path
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.1}
        strokeLinecap="round"
        d="M7.4 14.9H8.3M9.7 14.9H10.6M12 14.9H12.9M14.3 14.9H15.2M16.6 14.9H17.1"
      />
      <path fill="#1F3A5F" d="M10 20.2A2 2 0 1 0 14 20.2A2 2 0 1 0 10 20.2Z" />
    </svg>
  );
}
