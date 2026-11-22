import { SearchX } from "lucide-react";
import { BotonEnlace } from "@/components/ui/Boton";
import { EstadoVacio } from "@/components/ui/Estados";
import { RUTAS } from "@/lib/rutas";

export default function NoEncontrado() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EstadoVacio
        icono={<SearchX />}
        titulo="No encontramos esta página"
        descripcion="Puede que el evento ya no esté publicado o que el enlace esté incompleto."
        accion={<BotonEnlace href={RUTAS.inicio}>Ver eventos</BotonEnlace>}
      />
    </div>
  );
}
