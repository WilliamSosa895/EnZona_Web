import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import estilos from './Campo.module.css';

interface CampoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  error?: string | null;
  ayuda?: string | null;
  /** Campo de contraseña con botón para mostrar u ocultar. */
  esContrasena?: boolean;
  /** Más de una línea: usa un área de texto. */
  lineas?: number;
  /** Convierte a mayúsculas mientras se escribe (CURP). */
  mayusculas?: boolean;
  iconoInicial?: ReactNode;
}

/** Campo de texto de la marca con etiqueta flotante y mensaje de error accesible (CampoEnZona). */
export function Campo({
  etiqueta,
  valor,
  onCambio,
  error,
  ayuda,
  esContrasena = false,
  lineas = 1,
  mayusculas = false,
  iconoInicial,
  disabled,
  id,
  type,
  ...resto
}: CampoProps) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  const idPie = `${idCampo}-pie`;
  const [visible, setVisible] = useState(false);
  const pie = error || ayuda;
  const cambiar = (texto: string) => onCambio(mayusculas ? texto.toUpperCase() : texto);

  const clasesCaja = [
    estilos.caja,
    error ? estilos.conError : '',
    disabled ? estilos.deshabilitada : '',
    iconoInicial ? estilos.conIcono : '',
    lineas > 1 ? estilos.multilinea : '',
  ]
    .filter(Boolean)
    .join(' ');

  const comunes = {
    id: idCampo,
    className: estilos.entrada,
    placeholder: ' ',
    disabled,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': pie ? idPie : undefined,
  } as const;

  return (
    <div className={estilos.contenedor}>
      <div className={clasesCaja}>
        {iconoInicial && (
          <span className={estilos.icono} aria-hidden="true">
            {iconoInicial}
          </span>
        )}
        {lineas > 1 ? (
          <textarea
            {...comunes}
            rows={lineas}
            value={valor}
            maxLength={resto.maxLength}
            onChange={(e) => cambiar(e.target.value)}
          />
        ) : (
          <input
            {...resto}
            {...comunes}
            type={esContrasena ? (visible ? 'text' : 'password') : (type ?? 'text')}
            value={valor}
            onChange={(e) => cambiar(e.target.value)}
          />
        )}
        <label htmlFor={idCampo} className={estilos.etiqueta}>
          {etiqueta}
        </label>
        {esContrasena && (
          <button
            type="button"
            className={estilos.ojo}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            disabled={disabled}
          >
            {visible ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
        )}
      </div>
      {pie && (
        <p
          id={idPie}
          className={[estilos.pie, error ? estilos.pieError : ''].join(' ')}
          role={error ? 'alert' : undefined}
        >
          {pie}
        </p>
      )}
    </div>
  );
}
