"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Campos de la marca: borde gris suave, 12 px de radio, etiqueta visible y
 * ayuda o error debajo (nunca solo el placeholder como etiqueta).
 */

interface PropsComunes {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  /** Oculta la etiqueta visual pero la conserva para lectores de pantalla (login). */
  etiquetaOculta?: boolean;
  icono?: ReactNode;
  className?: string;
}

const CLASE_CAMPO =
  "w-full rounded-campo border bg-superficie px-4 text-base text-tinta placeholder:text-gris-texto outline-none transition-colors duration-150 focus:border-profundo focus:ring-2 focus:ring-profundo/30 disabled:bg-superficie-baja disabled:text-gris-texto";

export function Campo({
  etiqueta,
  ayuda,
  error,
  etiquetaOculta,
  icono,
  className,
  id: idExterno,
  type = "text",
  ...resto
}: PropsComunes & InputHTMLAttributes<HTMLInputElement>) {
  const idGenerado = useId();
  const id = idExterno ?? idGenerado;
  const [verContrasena, setVerContrasena] = useState(false);
  const esContrasena = type === "password";
  const tipoReal = esContrasena && verContrasena ? "text" : type;
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-sm font-medium text-tinta", etiquetaOculta && "sr-only")}>
        {etiqueta}
      </label>
      <div className="relative">
        {icono ? (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gris-texto">
            {icono}
          </span>
        ) : null}
        <input
          id={id}
          type={tipoReal}
          aria-invalid={error ? true : undefined}
          aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
          className={cn(
            CLASE_CAMPO,
            "h-14",
            icono ? "pl-12" : null,
            esContrasena ? "pr-14" : null,
            error ? "border-error" : "border-gris-suave",
          )}
          {...resto}
        />
        {esContrasena ? (
          <button
            type="button"
            onClick={() => setVerContrasena((valor) => !valor)}
            aria-label={verContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={verContrasena}
            className="absolute inset-y-0 right-1 flex w-12 cursor-pointer items-center justify-center rounded-pildora text-gris-texto hover:text-tinta"
          >
            {verContrasena ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={idError} role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : ayuda ? (
        <p id={idAyuda} className="text-sm text-gris-texto">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

export function AreaTexto({
  etiqueta,
  ayuda,
  error,
  className,
  id: idExterno,
  ...resto
}: PropsComunes & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const idGenerado = useId();
  const id = idExterno ?? idGenerado;
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {etiqueta}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
        className={cn(CLASE_CAMPO, "min-h-28 py-3", error ? "border-error" : "border-gris-suave")}
        {...resto}
      />
      {error ? (
        <p id={idError} role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : ayuda ? (
        <p id={idAyuda} className="text-sm text-gris-texto">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

interface PropsSelector extends PropsComunes {
  value: string;
  onChange: (valor: string) => void;
  opciones: { valor: string; texto: string }[];
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
}

export function Selector({
  etiqueta,
  ayuda,
  error,
  className,
  value,
  onChange,
  opciones,
  placeholder,
  name,
  disabled,
  required,
}: PropsSelector) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {etiqueta}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(evento) => onChange(evento.target.value)}
        aria-invalid={error ? true : undefined}
        className={cn(CLASE_CAMPO, "h-14 cursor-pointer", error ? "border-error" : "border-gris-suave")}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : ayuda ? (
        <p className="text-sm text-gris-texto">{ayuda}</p>
      ) : null}
    </div>
  );
}

interface PropsCasilla {
  etiqueta: ReactNode;
  checked: boolean;
  onChange: (valor: boolean) => void;
  name?: string;
  error?: string;
  className?: string;
}

export function Casilla({ etiqueta, checked, onChange, name, error, className }: PropsCasilla) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-base text-tinta">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(evento) => onChange(evento.target.checked)}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-marino"
        />
        <span>{etiqueta}</span>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface PropsInterruptor {
  etiqueta: string;
  descripcion?: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
  disabled?: boolean;
}

/** Interruptor coral como el de Material 3 en la app. */
export function Interruptor({ etiqueta, descripcion, checked, onChange, disabled }: PropsInterruptor) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="flex flex-col">
        <span className="text-base text-tinta">{etiqueta}</span>
        {descripcion ? <span className="text-sm text-gris-texto">{descripcion}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-8 w-14 shrink-0 cursor-pointer rounded-pildora transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-coral" : "bg-tinte-200",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1 left-0 size-6 rounded-full bg-blanco shadow-tarjeta transition-transform duration-200",
            checked ? "translate-x-7" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
