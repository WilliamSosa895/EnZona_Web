import Image from "next/image";
import {
  Cpu,
  Drama,
  GraduationCap,
  Music,
  PartyPopper,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { bloque } from "@/lib/fecha";
import { cn } from "@/lib/cn";

/*
 * Portada 16:9 del evento (`ui/components/Portada.kt`): la imagen que subió el
 * organizador o, si no hay, un panel plano por categoría con su icono grande
 * y el nombre de la categoría abajo a la izquierda. El bloque de fecha
 * (día grande, mes abajo) va arriba a la izquierda en las tarjetas.
 */

interface EstiloCategoria {
  fondo: string;
  texto: string;
  Icono: typeof Music;
}

const CATEGORIAS: Record<string, EstiloCategoria> = {
  academico: { fondo: "bg-exito-contenedor", texto: "text-sobre-exito", Icono: GraduationCap },
  musica: { fondo: "bg-tinte-100", texto: "text-marino", Icono: Music },
  tecnologia: { fondo: "bg-info-contenedor", texto: "text-sobre-info", Icono: Cpu },
  teatro: { fondo: "bg-coral-suave", texto: "text-coral-oscuro", Icono: Drama },
  deportes: { fondo: "bg-tinte-50", texto: "text-profundo", Icono: Trophy },
  deportivo: { fondo: "bg-tinte-50", texto: "text-profundo", Icono: Trophy },
  cultural: { fondo: "bg-aviso-contenedor", texto: "text-marino", Icono: PartyPopper },
  taller: { fondo: "bg-superficie-alta", texto: "text-gris-texto", Icono: Wrench },
  gastronomico: { fondo: "bg-coral-suave", texto: "text-tinta", Icono: UtensilsCrossed },
};

const POR_DEFECTO: EstiloCategoria = { fondo: "bg-tinte-100", texto: "text-marino", Icono: Sparkles };

function normalizar(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function estiloDeCategoria(nombre: string | null | undefined): EstiloCategoria {
  if (!nombre) return POR_DEFECTO;
  return CATEGORIAS[normalizar(nombre)] ?? POR_DEFECTO;
}

/** Completa una URL relativa de la API (`/api/imagenes/…`) con el origen del servidor. */
export function urlPortada(imagenUrl: string | null | undefined): string | null {
  if (!imagenUrl) return null;
  if (/^https?:\/\//i.test(imagenUrl)) return imagenUrl;
  const base = (process.env.ENZONA_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");
  return `${base}${imagenUrl.startsWith("/") ? "" : "/"}${imagenUrl}`;
}

interface PropsPortada {
  nombre: string;
  categoria?: string | null;
  imagenUrl?: string | null;
  fechaIso?: string | null;
  /** Prioridad de carga para la portada del detalle (LCP). */
  prioridad?: boolean;
  className?: string;
  redondeo?: "arriba" | "todo";
  sizes?: string;
}

export function Portada({
  nombre,
  categoria,
  imagenUrl,
  fechaIso,
  prioridad,
  className,
  redondeo = "todo",
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: PropsPortada) {
  const estilo = estiloDeCategoria(categoria);
  const url = urlPortada(imagenUrl);
  const fecha = fechaIso ? bloque(fechaIso) : null;
  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden",
        redondeo === "todo" ? "rounded-tarjeta" : "rounded-t-tarjeta",
        !url && estilo.fondo,
        className,
      )}
    >
      {url ? (
        <Image
          src={url}
          alt={`Portada de ${nombre}`}
          fill
          sizes={sizes}
          priority={prioridad}
          className="portada-zoom object-cover"
          unoptimized={url.startsWith("http://")}
        />
      ) : (
        <>
          <estilo.Icono
            aria-hidden="true"
            className={cn("portada-zoom absolute -right-4 -bottom-5 size-[42%] opacity-35", estilo.texto)}
            strokeWidth={1.4}
          />
          {categoria ? (
            <span className={cn("absolute bottom-4 left-5 text-base font-medium", estilo.texto)}>{categoria}</span>
          ) : null}
        </>
      )}
      {fecha ? <BloqueFecha dia={fecha.dia} mes={fecha.mes} className="absolute top-3 left-3" /> : null}
    </div>
  );
}

export function BloqueFecha({ dia, mes, className, tono = "blanco" }: { dia: string; mes: string; className?: string; tono?: "blanco" | "coral" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex min-w-[3.6rem] flex-col items-center justify-center rounded-campo px-2 py-1.5 leading-none",
        tono === "blanco" ? "bg-superficie text-tinta" : "bg-coral-suave text-tinta",
        className,
      )}
    >
      <span className="text-2xl font-bold tabular-nums">{dia}</span>
      <span className={cn("mt-0.5 text-sm font-medium", tono === "blanco" ? "text-profundo" : "text-tinta")}>{mes}</span>
    </div>
  );
}
