import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MdCampaign,
  MdDescription,
  MdHelpOutline,
  MdLogout,
  MdMyLocation,
  MdPerson,
  MdPlace,
  MdPrivacyTip,
  MdPublic,
  MdShield,
} from 'react-icons/md';
import { eventosApi } from '@/api/eventos';
import type { Rol } from '@/api/tipos';
import { identidadApi } from '@/api/identidad';
import { claves } from '@/app/consultas';
import { NOMBRE_ROL, rutaInicio, tieneRol } from '@/auth/roles';
import { useSesion } from '@/auth/useSesion';
import { env } from '@/config/env';
import { yaPaso } from '@/lib/fechas';
import { mensajeDeError } from '@/lib/errores';
import { guardarPreferencias, leerPreferencias } from '@/lib/preferencias';
import { obtenerUbicacion } from '@/lib/ubicacion';
import {
  Aviso,
  Avatar,
  Boton,
  BotonSecundario,
  BotonTexto,
  Dialogo,
  FilaAjuste,
  GrupoAjustes,
  Interruptor,
  Pagina,
  Separador,
  TituloSeccion,
} from '@/ui';
import estilos from './Perfil.module.css';

/** Mi cuenta: perfil, rol de organizador y ajustes (RF-04, ProfileScreen en Android). */
export default function PerfilPage() {
  const navegar = useNavigate();
  const { usuario, accesoPersonal, cerrarSesion, actualizarRoles } = useSesion();
  const perfil = useQuery({ queryKey: claves.perfil, queryFn: ({ signal }) => identidadApi.perfil(signal) });
  const [aviso, setAviso] = useState<{ texto: string; tono: 'exito' | 'error' } | null>(null);
  const [dialogo, setDialogo] = useState<'convertirse' | 'dejar' | null>(null);
  const [preferencias, setPreferencias] = useState(leerPreferencias);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);

  if (!usuario) return null;
  const roles = perfil.data?.roles ?? usuario.roles;
  const esOrganizador = tieneRol(roles, 'ORGANIZADOR');
  const esAdmin = tieneRol(roles, 'ADMIN');

  async function cambiarUbicacion(activo: boolean) {
    setAvisoUbicacion(null);
    if (activo) {
      try {
        await obtenerUbicacion(); // pide el permiso del navegador en este momento (RNF-11)
      } catch (e) {
        setAvisoUbicacion((e as Error).message);
        return;
      }
    }
    const nuevas = { ...preferencias, usarUbicacion: activo };
    setPreferencias(nuevas);
    guardarPreferencias(nuevas);
  }

  return (
    <Pagina titulo="Mi cuenta" angosta>
      {dialogo === 'convertirse' && (
        <DialogoConvertirse
          onCerrar={() => setDialogo(null)}
          onListo={(nuevos) => {
            actualizarRoles(nuevos);
            setDialogo(null);
            setAviso({ texto: 'Ahora eres organizador. Encontrarás tus eventos en «Mis eventos».', tono: 'exito' });
          }}
        />
      )}
      {dialogo === 'dejar' && (
        <DialogoDejar
          onCerrar={() => setDialogo(null)}
          onListo={(nuevos) => {
            actualizarRoles(nuevos);
            setDialogo(null);
            // Si entró como personal y ya no tiene ese rol, vuelve al inicio que le corresponde.
            if (accesoPersonal) navegar(rutaInicio(nuevos, accesoPersonal), { replace: true });
            else setAviso({ texto: 'Ya no eres organizador. Sigues siendo asistente.', tono: 'exito' });
          }}
        />
      )}

      <section className={estilos.cabecera} aria-label="Tus datos">
        <Avatar nombre={perfil.data?.nombre ?? usuario.nombre} />
        <div className={estilos.cabeceraTexto}>
          <strong className={estilos.nombre}>{perfil.data?.nombre ?? usuario.nombre}</strong>
          <span className={estilos.correo}>{usuario.correo}</span>
          {perfil.data && (
            <span className={estilos.verificacion}>
              <span
                className={perfil.data.correoVerificado ? estilos.puntoOk : estilos.puntoError}
                aria-hidden="true"
              />
              {perfil.data.correoVerificado ? 'Identidad verificada' : 'Cuenta sin verificar'}
            </span>
          )}
        </div>
      </section>
      <ul className={estilos.roles} aria-label="Tus roles">
        {roles.map((r) => (
          <li key={r}>{NOMBRE_ROL[r]}</li>
        ))}
      </ul>

      {aviso && <Aviso texto={aviso.texto} tono={aviso.tono} anunciar />}

      {!esOrganizador && !esAdmin && (
        <section className={estilos.tarjeta}>
          <h2 className={estilos.tarjetaTitulo}>
            <MdCampaign aria-hidden="true" className={estilos.iconoCoral} />
            ¿Quieres publicar tus propios eventos?
          </h2>
          <p className={estilos.texto}>
            Como organizador puedes crear eventos gratuitos o de pago, definir el aforo y los asientos, y llevar el
            control de acceso. Sigues conservando tu cuenta de asistente.
          </p>
          <Boton variante="destacado" onClick={() => setDialogo('convertirse')}>
            Convertirme en organizador
          </Boton>
        </section>
      )}
      {esOrganizador && !esAdmin && (
        <section className={estilos.tarjeta}>
          <h2 className={estilos.tarjetaTitulo}>Cuenta de organizador</h2>
          <p className={estilos.texto}>
            Puedes dejar de ser organizador cuando quieras. Sigues siendo asistente y tu historial se conserva.
          </p>
          <BotonSecundario onClick={() => setDialogo('dejar')}>Dejar de ser organizador</BotonSecundario>
        </section>
      )}

      <TituloSeccion>Ajustes de localización</TituloSeccion>
      <GrupoAjustes>
        <FilaAjuste icono={<MdPlace />} texto="Mi zona" valor={preferencias.ciudad} mostrarFlecha={false} />
        <Separador />
        <FilaAjuste icono={<MdPublic />} texto="Mi país" valor="México" mostrarFlecha={false} />
        <Separador />
        <div className={estilos.filaInterruptor}>
          <Interruptor
            icono={<MdMyLocation />}
            texto="Contenido basado en mi ubicación"
            detalle="Muestra primero los eventos cercanos a ti"
            activo={preferencias.usarUbicacion}
            onCambio={(activo) => void cambiarUbicacion(activo)}
          />
        </div>
      </GrupoAjustes>
      {avisoUbicacion && <Aviso texto={avisoUbicacion} tono="aviso" anunciar />}

      <TituloSeccion>Preferencias</TituloSeccion>
      <GrupoAjustes>
        <FilaAjuste icono={<MdPerson />} texto="Editar mis datos" descripcion="Nombre y teléfono" a="/perfil/datos" />
        <Separador />
        <FilaAjuste
          icono={<MdShield />}
          texto="Seguridad"
          descripcion="Contraseña y verificación de la cuenta"
          a="/perfil/seguridad"
        />
      </GrupoAjustes>

      <TituloSeccion>Ayuda</TituloSeccion>
      <GrupoAjustes>
        <FilaAjuste icono={<MdHelpOutline />} texto="¿Necesitas ayuda?" a="/ayuda" />
        <Separador />
        <FilaAjuste icono={<MdPrivacyTip />} texto="Privacidad" a="/privacidad" />
        <Separador />
        <FilaAjuste icono={<MdDescription />} texto="Legal" a="/legal" />
      </GrupoAjustes>

      <div className={estilos.cerrar}>
        <GrupoAjustes>
          <FilaAjuste
            icono={<MdLogout />}
            texto="Cerrar sesión"
            color="var(--error)"
            mostrarFlecha={false}
            onClick={() => {
              cerrarSesion();
              navegar('/acceso', { replace: true });
            }}
          />
        </GrupoAjustes>
      </div>
      <p className={estilos.version}>EnZona web · versión {env.version}</p>
    </Pagina>
  );
}

// ---------------------------------------------------------------- diálogos de rol

function DialogoConvertirse({ onCerrar, onListo }: { onCerrar: () => void; onListo: (roles: Rol[]) => void }) {
  const consultas = useQueryClient();
  const alta = useMutation({
    mutationFn: identidadApi.activarOrganizador,
    onSuccess: (u) => {
      void consultas.invalidateQueries({ queryKey: claves.perfil });
      onListo(u.roles);
    },
  });
  return (
    <Dialogo
      titulo="¿Convertirte en organizador?"
      onCerrar={alta.isPending ? undefined : onCerrar}
      acciones={
        <>
          <BotonTexto onClick={onCerrar} disabled={alta.isPending}>
            Cancelar
          </BotonTexto>
          <Boton variante="destacado" cargando={alta.isPending} onClick={() => alta.mutate()}>
            Sí, convertirme en organizador
          </Boton>
        </>
      }
    >
      <p>Al confirmar, en tu cuenta cambia esto:</p>
      <ul className={estilos.lista}>
        <li>Aparece la pestaña Mis eventos.</li>
        <li>Podrás crear y publicar eventos gratuitos o de pago, definir aforo y asientos.</li>
        <li>Podrás designar personal de acceso para tus eventos.</li>
        <li>Conservas tu cuenta de asistente y podrás dejar de ser organizador más adelante.</li>
      </ul>
      {alta.isError && <Aviso texto={mensajeDeError(alta.error)} tono="error" anunciar />}
    </Dialogo>
  );
}

function DialogoDejar({ onCerrar, onListo }: { onCerrar: () => void; onListo: (roles: Rol[]) => void }) {
  const consultas = useQueryClient();
  // Comprobación previa con la misma regla de la API: eventos publicados que aún no terminan.
  const eventos = useQuery({
    queryKey: claves.eventosOrganizador,
    queryFn: ({ signal }) => eventosApi.delOrganizador(signal),
  });
  const vigentes = (eventos.data ?? []).filter(
    (e) => e.estado === 'PUBLICADO' && !yaPaso(e.fechaHoraFin ?? e.fechaHoraInicio),
  ).length;
  const motivo =
    vigentes > 0
      ? `Tienes ${vigentes === 1 ? '1 evento publicado vigente' : `${vigentes} eventos publicados vigentes`}. Cancélalos o espera a que terminen para dejar el rol.`
      : null;
  const baja = useMutation({
    mutationFn: identidadApi.dejarOrganizador,
    onSuccess: (u) => {
      void consultas.invalidateQueries({ queryKey: claves.perfil });
      onListo(u.roles);
    },
  });

  return (
    <Dialogo
      titulo="¿Dejar de ser organizador?"
      onCerrar={baja.isPending ? undefined : onCerrar}
      acciones={
        <>
          <BotonTexto onClick={onCerrar} disabled={baja.isPending}>
            {motivo ? 'Entendido' : 'Cancelar'}
          </BotonTexto>
          {!motivo && (
            <Boton
              variante="peligro"
              cargando={baja.isPending}
              disabled={eventos.isPending}
              onClick={() => baja.mutate()}
            >
              Sí, dejar de ser organizador
            </Boton>
          )}
        </>
      }
    >
      {motivo ? (
        <Aviso titulo="Por ahora no es posible" texto={motivo} tono="aviso" />
      ) : (
        <>
          <p>Se quitará el rol de organizador de tu cuenta:</p>
          <ul className={estilos.lista}>
            <li>Desaparece la pestaña Mis eventos.</li>
            <li>Tus eventos en borrador o realizados se conservan en el historial.</li>
            <li>Sigues siendo asistente y puedes volver a activar el rol cuando quieras.</li>
          </ul>
        </>
      )}
      {baja.isError && <Aviso texto={mensajeDeError(baja.error)} tono="error" anunciar />}
    </Dialogo>
  );
}
