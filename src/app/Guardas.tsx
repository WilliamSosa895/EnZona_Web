import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MdLock } from 'react-icons/md';
import type { Rol } from '@/api/tipos';
import { rutaInicio } from '@/auth/roles';
import { useSesion } from '@/auth/useSesion';
import { EstadoVacio } from '@/ui';

/** Exige sesión; si no hay, envía al acceso y recuerda a dónde volver. */
export function RequiereSesion({ children }: { children: ReactNode }) {
  const { autenticado } = useSesion();
  const ubicacion = useLocation();
  if (!autenticado) return <Navigate to="/acceso" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  return <>{children}</>;
}

/** Solo para visitantes sin sesión (acceso y registro): con sesión, va al inicio de su rol. */
export function SoloSinSesion({ children }: { children: ReactNode }) {
  const { autenticado, usuario, accesoPersonal } = useSesion();
  if (autenticado && usuario) return <Navigate to={rutaInicio(usuario.roles, accesoPersonal)} replace />;
  return <>{children}</>;
}

/**
 * Oculta una sección a quien no tiene el rol. Es solo interfaz: la API vuelve a comprobar el rol en cada
 * petición (un recurso ajeno responde 403).
 */
export function RequiereRol({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { usuario, accesoPersonal } = useSesion();
  const navegar = useNavigate();
  if (!usuario?.roles.some((r) => roles.includes(r))) {
    return (
      <EstadoVacio
        icono={<MdLock size={56} />}
        titulo="Sección no disponible"
        texto="Tu cuenta no tiene el rol necesario para entrar aquí."
        textoAccion="Ir a mi inicio"
        onAccion={() => navegar(rutaInicio(usuario?.roles ?? [], accesoPersonal), { replace: true })}
      />
    );
  }
  return <>{children}</>;
}
