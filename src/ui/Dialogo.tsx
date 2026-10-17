import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import estilos from './Dialogo.module.css';

interface DialogoProps {
  titulo: string;
  children: ReactNode;
  acciones: ReactNode;
  /** Se llama con Escape o al pulsar el fondo; omítelo para impedir el cierre (por ejemplo, mientras se procesa). */
  onCerrar?: () => void;
}

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal accesible (AlertDialog): rol dialog, título enlazado, foco atrapado dentro, Escape para cerrar
 * y el foco vuelve al control que lo abrió.
 */
export function Dialogo({ titulo, children, acciones, onCerrar }: DialogoProps) {
  const idTitulo = useId();
  const ref = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const desbordamiento = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const primero = ref.current?.querySelector<HTMLElement>(ENFOCABLES);
    (primero ?? ref.current)?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cerrarRef.current) {
        e.stopPropagation();
        cerrarRef.current();
      }
      if (e.key === 'Tab' && ref.current) {
        const elementos = Array.from(ref.current.querySelectorAll<HTMLElement>(ENFOCABLES));
        if (elementos.length === 0) return;
        const [inicio, fin] = [elementos[0], elementos[elementos.length - 1]];
        if (e.shiftKey && document.activeElement === inicio) {
          e.preventDefault();
          fin.focus();
        } else if (!e.shiftKey && document.activeElement === fin) {
          e.preventDefault();
          inicio.focus();
        }
      }
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = desbordamiento;
      anterior?.focus?.();
    };
  }, []);

  return createPortal(
    // El fondo cierra con el ratón; el teclado cierra con Escape (manejado arriba).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className={estilos.fondo} onClick={(e) => e.target === e.currentTarget && onCerrar?.()}>
      <div
        ref={ref}
        className={estilos.dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
      >
        <h2 id={idTitulo} className={estilos.titulo}>
          {titulo}
        </h2>
        <div className={estilos.cuerpo}>{children}</div>
        <div className={estilos.acciones}>{acciones}</div>
      </div>
    </div>,
    document.body,
  );
}
