import { useRef, useState, type ChangeEvent } from 'react';
import { MdImage, MdRotateRight } from 'react-icons/md';
import { mensajeDeError } from '@/lib/errores';
import { cargarImagen, ENCUADRE_INICIAL, girar, TIPOS_PORTADA } from '@/lib/portada';
import { Aviso, BotonSecundario, BotonTexto, Portada, Tarjeta } from '@/ui';
import { EditorPortada } from './EditorPortada';
import type { usePortadaFormulario } from './usePortadaFormulario';
import estilos from './Organizador.module.css';

type Props = ReturnType<typeof usePortadaFormulario> & {
  nombre: string;
  categoria: string | null;
  fecha: string;
  /** Texto del botón principal del formulario («crear» o «guardar»). */
  verbo: 'crear' | 'guardar';
  deshabilitado: boolean;
  /** Clave de la guía interactiva que apunta a esta sección. */
  guia?: string;
};

/**
 * Sección «Portada» del formulario del evento (opcional). Sin imagen se muestra el panel de la categoría, igual
 * que en el catálogo.
 */
export function SeccionPortada({
  estado,
  setEstado,
  error,
  setError,
  urlActual,
  nombre,
  categoria,
  fecha,
  verbo,
  deshabilitado,
  guia,
}: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [preparando, setPreparando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const urlVisible = estado.quitar ? null : urlActual;
  const hayPortada = estado.imagen !== null || urlVisible !== null;
  const bloqueado = deshabilitado || preparando;

  async function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    setPreparando(true);
    setError(null);
    setAviso(null);
    try {
      const imagen = await cargarImagen(archivo);
      setEstado({ imagen, encuadre: ENCUADRE_INICIAL, quitar: false });
      setAviso(
        `Imagen lista. Muévela, acércala o gírala hasta que quede como quieres; se guardará al ${verbo} el evento.`,
      );
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : mensajeDeError(causa));
    } finally {
      setPreparando(false);
    }
  }

  return (
    <Tarjeta data-guia={guia}>
      <h2 className={estilos.tituloTarjeta}>Portada</h2>
      {estado.imagen ? (
        <>
          <EditorPortada
            imagen={estado.imagen}
            encuadre={estado.encuadre}
            onEncuadre={(encuadre) => setEstado((a) => ({ ...a, encuadre }))}
            deshabilitado={bloqueado}
          />
          <BotonTexto
            tono="neutro"
            icono={<MdRotateRight />}
            disabled={bloqueado}
            onClick={() =>
              setEstado((a) =>
                a.imagen
                  ? { ...a, imagen: girar(a.imagen), encuadre: { ...ENCUADRE_INICIAL, zoom: a.encuadre.zoom } }
                  : a,
              )
            }
          >
            Girar
          </BotonTexto>
        </>
      ) : (
        <Portada
          nombre={nombre || 'Evento'}
          categoria={categoria}
          fecha={fecha}
          imagenUrl={urlVisible}
          mostrarFecha={false}
        />
      )}
      <input
        ref={entrada}
        type="file"
        accept={TIPOS_PORTADA.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={alElegir}
      />
      <div className={estilos.accionesPortada}>
        <BotonSecundario icono={<MdImage />} disabled={bloqueado} onClick={() => entrada.current?.click()}>
          {preparando ? 'Preparando la imagen…' : hayPortada ? 'Cambiar imagen' : 'Elegir imagen'}
        </BotonSecundario>
        {hayPortada && (
          <BotonTexto
            tono="peligro"
            disabled={bloqueado}
            onClick={() => {
              setEstado({ imagen: null, encuadre: ENCUADRE_INICIAL, quitar: urlActual !== null });
              setError(null);
              setAviso(urlActual ? 'La portada se quitará al guardar.' : null);
            }}
          >
            Quitar portada
          </BotonTexto>
        )}
      </div>
      {aviso && !error && (
        <p className={estilos.avisoPortada} aria-live="polite">
          {aviso}
        </p>
      )}
      {error && <Aviso tono="error" texto={error} anunciar />}
      {!estado.imagen && (
        <p className={estilos.apoyo}>
          Opcional. JPEG, PNG o WebP; se reduce en tu equipo y la guarda el servidor. Sin imagen se muestra el panel de
          la categoría.
        </p>
      )}
    </Tarjeta>
  );
}
