"use client";

import { useEffect } from "react";
import { WifiOff } from "lucide-react";
import { Boton, BotonEnlace } from "@/components/ui/Boton";
import { EstadoVacio } from "@/components/ui/Estados";
import { MENSAJE_SIN_CONEXION } from "@/lib/api/errores";
import { RUTAS } from "@/lib/rutas";

/**
 * Error no controlado de una pantalla. Si la API no respondió (Render dormido,
 * red caída) se explica y se ofrece reintentar; nunca se muestran detalles técnicos.
 */
export default function PaginaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[EnZona] Error de pantalla", error.digest ?? error.message);
    // Tras publicar una versión nueva, un fragmento viejo deja de existir: una recarga lo resuelve (una sola vez).
    if (/ChunkLoadError|Loading chunk|dynamically imported module/i.test(error.message)) {
      const clave = "enzona:recarga-fragmento";
      if (sessionStorage.getItem(clave) !== "1") {
        sessionStorage.setItem(clave, "1");
        window.location.reload();
      }
    }
  }, [error]);

  const sinConexion = error.message === MENSAJE_SIN_CONEXION || /SIN_CONEXION|fetch failed/i.test(error.message);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EstadoVacio
        icono={<WifiOff />}
        titulo={sinConexion ? "Sin conexión con el servidor" : "Algo no salió bien"}
        descripcion={
          sinConexion
            ? "El servidor de EnZona no respondió. Si acaba de encenderse, puede tardar un minuto. Inténtalo de nuevo."
            : "Ocurrió un error inesperado. Inténtalo de nuevo o vuelve al inicio."
        }
        accion={
          <div className="flex flex-wrap justify-center gap-3">
            <Boton onClick={reset}>Reintentar</Boton>
            <BotonEnlace href={RUTAS.inicio} variante="contorno">
              Ir al inicio
            </BotonEnlace>
          </div>
        }
      />
    </div>
  );
}
