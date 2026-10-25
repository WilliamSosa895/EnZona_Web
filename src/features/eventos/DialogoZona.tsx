import { useState } from 'react';
import { MdCheck } from 'react-icons/md';
import { ZONAS_DE_MUESTRA } from '@/lib/preferencias';
import { BotonTexto, Campo, Dialogo } from '@/ui';
import estilos from './Eventos.module.css';

interface DialogoZonaProps {
  zonaActual: string;
  onElegir: (ciudad: string) => void;
  onCerrar: () => void;
}

/**
 * "¿En qué zona buscas?": ciudades de muestra u otra ciudad (RNF-11). La ubicación del dispositivo se usa con el
 * filtro «Cerca de mí» de Inicio, como en la app Android.
 */
export function DialogoZona({ zonaActual, onElegir, onCerrar }: DialogoZonaProps) {
  const [texto, setTexto] = useState('');
  return (
    <Dialogo
      titulo="¿En qué zona buscas?"
      onCerrar={onCerrar}
      acciones={
        <>
          <BotonTexto onClick={onCerrar}>Cancelar</BotonTexto>
          <BotonTexto onClick={() => onElegir(texto.trim())} disabled={!texto.trim()}>
            Usar esta zona
          </BotonTexto>
        </>
      }
    >
      <p>Elige una zona o escribe la tuya. No hace falta activar la ubicación para explorar.</p>
      <div>
        {ZONAS_DE_MUESTRA.map((zona) => (
          <button key={zona} type="button" className={estilos.opcionZona} onClick={() => onElegir(zona)}>
            {zona}
            {zona === zonaActual && <MdCheck aria-label="Zona actual" />}
          </button>
        ))}
      </div>
      <Campo etiqueta="Otra ciudad" valor={texto} onCambio={setTexto} maxLength={80} />
      <p style={{ font: 'var(--body-small)' }}>
        El área de estudio es Orizaba. Si eliges otra ciudad y no hay eventos, podrás volver a Orizaba desde aquí.
      </p>
    </Dialogo>
  );
}
