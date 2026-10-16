import { useState } from 'react';
import { MdCheck, MdMyLocation } from 'react-icons/md';
import { ZONAS_DE_MUESTRA } from '@/lib/preferencias';
import { BotonSecundario, BotonTexto, Campo, Dialogo } from '@/ui';
import estilos from './Eventos.module.css';

interface DialogoZonaProps {
  zonaActual: string;
  usandoUbicacion: boolean;
  buscandoUbicacion: boolean;
  onElegir: (ciudad: string) => void;
  onUsarUbicacion: () => void;
  onCerrar: () => void;
}

/** "¿En qué zona buscas?": ciudades de muestra, otra ciudad o la ubicación del dispositivo (RF-19, RNF-11). */
export function DialogoZona({
  zonaActual,
  usandoUbicacion,
  buscandoUbicacion,
  onElegir,
  onUsarUbicacion,
  onCerrar,
}: DialogoZonaProps) {
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
      <p>Elige una zona, escribe la tuya o usa tu ubicación. No hace falta activar la ubicación para explorar.</p>
      <BotonSecundario icono={<MdMyLocation />} onClick={onUsarUbicacion} disabled={buscandoUbicacion}>
        {buscandoUbicacion ? 'Buscando tu ubicación…' : usandoUbicacion ? 'Usando mi ubicación' : 'Usar mi ubicación'}
      </BotonSecundario>
      <div>
        {ZONAS_DE_MUESTRA.map((zona) => (
          <button key={zona} type="button" className={estilos.opcionZona} onClick={() => onElegir(zona)}>
            {zona}
            {!usandoUbicacion && zona === zonaActual && <MdCheck aria-label="Zona actual" />}
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
