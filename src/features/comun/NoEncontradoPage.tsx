import { useNavigate } from 'react-router-dom';
import { MdSearchOff } from 'react-icons/md';
import { EstadoVacio } from '@/ui';

/** Página 404 de la aplicación. */
export default function NoEncontradoPage() {
  const navegar = useNavigate();
  return (
    <EstadoVacio
      icono={<MdSearchOff size={56} />}
      titulo="No encontramos esta página"
      texto="Puede que el enlace esté incompleto o que la página ya no exista."
      textoAccion="Ir al inicio"
      onAccion={() => navegar('/', { replace: true })}
    />
  );
}
