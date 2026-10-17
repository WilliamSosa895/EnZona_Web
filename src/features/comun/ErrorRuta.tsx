import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { MdErrorOutline } from 'react-icons/md';
import { EstadoVacio } from '@/ui';

const CLAVE_RECARGA = 'enzona.recarga-por-version';

/** Un fragmento de la aplicación no se pudo descargar: normalmente porque se publicó una versión nueva. */
const esFragmentoFaltante = (error: unknown) =>
  error instanceof Error &&
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    error.message,
  );

/**
 * Pantalla de error de las rutas. Si falta un fragmento tras una actualización, recarga una sola vez para
 * obtener la versión nueva; en cualquier otro caso ofrece recargar sin mostrar detalles técnicos.
 */
export function ErrorRuta() {
  const error = useRouteError();
  const fragmento = esFragmentoFaltante(error);

  useEffect(() => {
    if (!fragmento) return;
    try {
      // Una recarga automática como máximo cada minuto: evita un ciclo si el fragmento sigue sin existir.
      const ultima = Number(sessionStorage.getItem(CLAVE_RECARGA) ?? 0);
      if (Date.now() - ultima < 60_000) return;
      sessionStorage.setItem(CLAVE_RECARGA, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [fragmento]);

  const noEncontrado = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main id="contenido" style={{ padding: 'var(--esp-xl) var(--margen)' }}>
      <EstadoVacio
        icono={<MdErrorOutline size={56} />}
        titulo={
          fragmento ? 'Hay una versión nueva de EnZona' : noEncontrado ? 'No encontramos esta página' : 'Algo salió mal'
        }
        texto={
          fragmento
            ? 'Recarga la página para continuar con la versión más reciente.'
            : 'Ocurrió un error inesperado. Recarga la página; si persiste, escríbenos a soporte@enzona.mx.'
        }
        textoAccion="Recargar"
        onAccion={() => {
          try {
            sessionStorage.removeItem(CLAVE_RECARGA);
          } catch {
            /* sin almacenamiento */
          }
          window.location.reload();
        }}
      />
    </main>
  );
}
