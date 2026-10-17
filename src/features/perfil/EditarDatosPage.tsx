import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MdBadge } from 'react-icons/md';
import { ApiError } from '@/api/http';
import { identidadApi } from '@/api/identidad';
import type { Perfil } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { useSesion } from '@/auth/useSesion';
import { mensajeDeError } from '@/lib/errores';
import { MENSAJES, normalizarTelefono, telefonoValido } from '@/lib/validaciones';
import { Aviso, BarraSuperior, Boton, Campo, IndicadorCarga, Tarjeta } from '@/ui';
import estilos from './Perfil.module.css';

/** Editar mis datos (RF-04): nombre y teléfono. El CURP se guarda cifrado y no se puede cambiar. */
export default function EditarDatosPage() {
  const perfil = useQuery({ queryKey: claves.perfil, queryFn: ({ signal }) => identidadApi.perfil(signal) });
  return (
    <>
      <BarraSuperior titulo="Editar mis datos" volver />
      <div className={estilos.contenedorAjuste}>
        {perfil.isPending ? (
          <IndicadorCarga texto="Cargando tus datos…" />
        ) : perfil.isError ? (
          <Aviso
            tono="error"
            texto={mensajeDeError(perfil.error)}
            textoAccion="Reintentar"
            onAccion={() => void perfil.refetch()}
          />
        ) : (
          <Formulario perfil={perfil.data} />
        )}
      </div>
    </>
  );
}

function Formulario({ perfil }: { perfil: Perfil }) {
  const consultas = useQueryClient();
  const { refrescar } = useSesion();
  const [nombre, setNombre] = useState(perfil.nombre);
  const [telefono, setTelefono] = useState(perfil.telefono ?? '');
  const [intentado, setIntentado] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const errorNombre = !nombre.trim() ? MENSAJES.nombre : nombre.trim().length > 120 ? 'Máximo 120 caracteres.' : null;
  const errorTelefono = telefonoValido(telefono) ? null : MENSAJES.telefono;
  const cambio = nombre.trim() !== perfil.nombre || normalizarTelefono(telefono) !== (perfil.telefono ?? null);

  const guardar = useMutation({
    mutationFn: () => identidadApi.actualizarPerfil(nombre.trim(), normalizarTelefono(telefono)),
    onSuccess: (nuevo) => {
      consultas.setQueryData(claves.perfil, nuevo);
      void refrescar(); // el nombre también se muestra en la sesión
      setGuardado(true);
    },
  });
  const errorServidor = guardar.error instanceof ApiError ? guardar.error : null;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    setGuardado(false);
    if (errorNombre || errorTelefono || !cambio) return;
    guardar.mutate();
  }

  return (
    <form className={estilos.formulario} onSubmit={enviar} noValidate>
      <Campo
        etiqueta="Nombre completo"
        valor={nombre}
        onCambio={(v) => {
          setNombre(v);
          setGuardado(false);
        }}
        autoComplete="name"
        maxLength={120}
        error={(intentado && errorNombre) || errorServidor?.errorDeCampo('nombre')}
      />
      <Campo
        etiqueta="Teléfono"
        valor={telefono}
        onCambio={(v) => {
          setTelefono(v);
          setGuardado(false);
        }}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        ayuda="Opcional. Si lo cambias tendrás que verificarlo de nuevo."
        error={(intentado && errorTelefono) || errorServidor?.errorDeCampo('telefono')}
      />
      <Tarjeta>
        <div className={estilos.dato}>
          <MdBadge aria-hidden="true" className={estilos.neutro} />
          <div>
            <strong>CURP</strong>
            <span>
              Se almacena cifrado y no puede consultarse ni modificarse desde la aplicación. Se usa únicamente para
              verificar tu identidad y reducir el fraude de boletos.
            </span>
          </div>
        </div>
      </Tarjeta>
      {guardar.isError && !errorServidor?.errores.length && (
        <Aviso texto={mensajeDeError(guardar.error)} tono="error" anunciar />
      )}
      {guardado && <Aviso texto="Tus datos se guardaron." tono="exito" anunciar />}
      <Boton type="submit" cargando={guardar.isPending} disabled={!cambio && !guardar.isPending}>
        {guardado && !cambio ? 'Cambios guardados' : 'Guardar cambios'}
      </Boton>
    </form>
  );
}
