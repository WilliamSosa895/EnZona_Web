import type { Rol } from '@/api/tipos';

export const ROLES_PERSONAL: Rol[] = ['ORGANIZADOR', 'VALIDADOR', 'ADMIN'];

export const tieneRol = (roles: readonly Rol[] | undefined, rol: Rol) => !!roles?.includes(rol);

export const esPersonal = (roles: readonly Rol[]) => roles.some((r) => ROLES_PERSONAL.includes(r));

/** Rol principal para elegir el panel de inicio del acceso del personal. */
export function rolPrincipal(roles: readonly Rol[]): Rol {
  for (const rol of ['ADMIN', 'ORGANIZADOR', 'VALIDADOR'] as const) if (roles.includes(rol)) return rol;
  return 'ASISTENTE';
}

/**
 * Ruta principal tras iniciar sesión. Un usuario puede ser asistente y organizador a la vez: si entró por el
 * acceso normal va a «Inicio»; si entró por el acceso del personal va al panel de su rol (igual que en Android).
 */
export function rutaInicio(roles: readonly Rol[], accesoPersonal: boolean): string {
  if (!accesoPersonal && roles.includes('ASISTENTE')) return '/';
  switch (rolPrincipal(roles)) {
    case 'ADMIN':
      return '/admin';
    case 'ORGANIZADOR':
      return '/organizador';
    case 'VALIDADOR':
      return '/validador';
    default:
      return '/';
  }
}

export const NOMBRE_ROL: Record<Rol, string> = {
  ASISTENTE: 'Asistente',
  ORGANIZADOR: 'Organizador',
  VALIDADOR: 'Validador',
  ADMIN: 'Administrador',
};
