import { createContext } from 'react';
import type { Rol, UsuarioResumen } from '@/api/tipos';

export interface ValorSesion {
  usuario: UsuarioResumen | null;
  accesoPersonal: boolean;
  autenticado: boolean;
  /** Motivo del último cierre automático (sesión vencida), para avisarlo en la pantalla de acceso. */
  avisoCierre: string | null;
  iniciarSesion: (identificador: string, contrasena: string, modoPersonal: boolean) => Promise<UsuarioResumen>;
  cerrarSesion: () => void;
  /** Vuelve a leer roles y datos desde GET /api/usuarios/me (los roles pueden cambiar en el servidor). */
  refrescar: () => Promise<void>;
  actualizarRoles: (roles: Rol[]) => void;
}

export const SesionContext = createContext<ValorSesion | null>(null);

/** Error de acceso que se detecta en el cliente (modo de acceso equivocado). */
export class ErrorModoAcceso extends Error {}
