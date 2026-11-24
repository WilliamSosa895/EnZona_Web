"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { EstadoVacio } from "@/components/ui/Estados";

/*
 * Notificaciones (NotificacionesScreen): con EnZona_Api no hay centro de
 * notificaciones; los avisos llegan por correo. Los filtros y los textos vacíos
 * son los mismos de la app.
 */

const DIAS_RECORDATORIO = 7;

const FILTROS = [
  { id: "todas", texto: "Todas" },
  { id: "proximos", texto: "Próximos" },
  { id: "cancelados", texto: "Cancelados" },
  { id: "compras", texto: "Compras" },
] as const;

type Filtro = (typeof FILTROS)[number]["id"];

const VACIOS: Record<Filtro, { titulo: string; texto: string }> = {
  todas: {
    titulo: "Tus avisos llegan por correo",
    texto:
      "EnZona te envía al correo el boleto con su QR, los recordatorios y cualquier cambio o cancelación de tus eventos. Revisa tu bandeja (y la carpeta de no deseados).",
  },
  proximos: {
    titulo: "No tienes eventos próximos",
    texto: `Te avisaremos ${DIAS_RECORDATORIO} días antes de cada evento para el que tengas boleto.`,
  },
  cancelados: {
    titulo: "Ningún evento cancelado",
    texto: "Si un organizador cancela un evento con tu boleto, lo verás aquí con el estado del reembolso.",
  },
  compras: {
    titulo: "Aún no hay compras",
    texto: "Cada compra o confirmación de asistencia genera un aviso con acceso directo al QR.",
  },
};

export function CentroNotificaciones() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const vacio = VACIOS[filtro];
  return (
    <div className="mt-5 flex flex-col gap-3">
      <div role="tablist" aria-label="Filtrar notificaciones" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sin-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTROS.map((opcion) => {
          const activo = opcion.id === filtro;
          return (
            <button
              key={opcion.id}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => setFiltro(opcion.id)}
              className={cn(
                "chip-vivo flex h-11 shrink-0 cursor-pointer items-center rounded-pildora border px-4 text-[15px] font-medium",
                activo ? "border-transparent bg-tinte-100 text-marino" : "border-gris-suave bg-superficie text-tinta hover:bg-superficie-alta",
              )}
            >
              {opcion.texto}
            </button>
          );
        })}
      </div>
      <p className="text-[15px] text-gris-texto">Todo leído</p>
      <EstadoVacio icono={<Bell />} titulo={vacio.titulo} descripcion={vacio.texto} />
    </div>
  );
}
