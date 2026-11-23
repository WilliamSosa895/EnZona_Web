import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Botones de la marca (`ui/components/Comunes.kt`):
 *  - principal: azul marino con blanco (acciones generales, navegación).
 *  - destacado: coral con texto tinta (comprar, confirmar, publicar).
 *  - contorno: borde gris con texto tinta (acciones secundarias).
 *  - peligro: contorno con texto rojo (cancelar evento, quitar).
 *  - texto: enlace azul profundo.
 * Todos son píldora, de 48 px mínimo de alto y con foco visible.
 */
export type VarianteBoton = "principal" | "destacado" | "contorno" | "peligro" | "texto";

const VARIANTES: Record<VarianteBoton, string> = {
  principal:
    "boton-principal bg-marino text-blanco hover:bg-[#182e4b] active:bg-[#132540] disabled:bg-tinte-100 disabled:text-gris-texto",
  destacado:
    "boton-destacado bg-coral text-tinta hover:bg-[#ee5a30] active:bg-coral-oscuro disabled:bg-tinte-100 disabled:text-gris-texto",
  contorno:
    "border border-gris-suave bg-transparente text-tinta hover:bg-superficie-alta active:bg-tinte-100 disabled:text-gris-suave disabled:border-linea",
  peligro:
    "border border-gris-suave bg-transparente text-error hover:bg-error-contenedor active:bg-error-contenedor disabled:text-gris-suave",
  texto: "bg-transparente text-profundo hover:bg-tinte-50 active:bg-tinte-100 disabled:text-gris-suave",
};

const TAMANOS = {
  normal: "h-control px-5 text-[15px]",
  grande: "h-boton-principal px-6 text-base",
  compacto: "h-10 px-4 text-sm",
} as const;

const BASE =
  "boton-vivo inline-flex cursor-pointer items-center justify-center gap-2 rounded-pildora font-medium transition-colors duration-150 select-none disabled:cursor-not-allowed";

interface PropsBase {
  variante?: VarianteBoton;
  tamano?: keyof typeof TAMANOS;
  ancho?: boolean;
  icono?: ReactNode;
  className?: string;
  children: ReactNode;
}

interface PropsBoton extends PropsBase, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  cargando?: boolean;
  textoCargando?: string;
}

export function Boton({
  variante = "principal",
  tamano = "normal",
  ancho,
  icono,
  cargando,
  textoCargando,
  className,
  children,
  disabled,
  type = "button",
  ...resto
}: PropsBoton) {
  return (
    <button
      type={type}
      aria-busy={cargando || undefined}
      disabled={disabled || cargando}
      className={cn(BASE, VARIANTES[variante], TAMANOS[tamano], ancho && "w-full", className)}
      {...resto}
    >
      {cargando ? <Ruedita /> : icono}
      <span>{cargando && textoCargando ? textoCargando : children}</span>
    </button>
  );
}

interface PropsEnlace extends PropsBase {
  href: string;
  prefetch?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function BotonEnlace({
  href,
  variante = "principal",
  tamano = "normal",
  ancho,
  icono,
  className,
  children,
  prefetch,
  onClick,
}: PropsEnlace) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={onClick}
      className={cn(BASE, VARIANTES[variante], TAMANOS[tamano], ancho && "w-full", className)}
    >
      {icono}
      <span>{children}</span>
    </Link>
  );
}

/** Indicador de progreso pequeño para botones. */
export function Ruedita({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}
