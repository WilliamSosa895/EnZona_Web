import { peticion } from './http';
import type {
  CanalVerificacion,
  Perfil,
  RegistroRespuesta,
  RegistroSolicitud,
  SesionRespuesta,
  UsuarioResumen,
  VerificacionRespuesta,
} from './tipos';

/** Módulo de identidad y acceso: /api/auth y /api/usuarios/me (RF-01 a RF-04). */
export const identidadApi = {
  registrar: (datos: RegistroSolicitud) =>
    peticion<RegistroRespuesta>('POST', '/api/auth/registro', { cuerpo: datos, autenticada: false }),

  verificar: (correo: string, codigo: string, canal: CanalVerificacion = 'CORREO') =>
    peticion<VerificacionRespuesta>('POST', '/api/auth/verificacion', {
      cuerpo: { correo, canal, codigo },
      autenticada: false,
    }),

  reenviarCodigo: (correo: string, canal: CanalVerificacion = 'CORREO') =>
    peticion<void>('POST', '/api/auth/verificacion/reenvio', { cuerpo: { correo, canal }, autenticada: false }),

  iniciarSesion: (identificador: string, contrasena: string) =>
    peticion<SesionRespuesta>('POST', '/api/auth/sesion', {
      cuerpo: { identificador, contrasena },
      autenticada: false,
    }),

  perfil: (senal?: AbortSignal) => peticion<Perfil>('GET', '/api/usuarios/me', { senal }),

  actualizarPerfil: (nombre: string, telefono: string | null) =>
    peticion<Perfil>('PUT', '/api/usuarios/me', { cuerpo: { nombre, telefono } }),

  cambiarContrasena: (actual: string, nueva: string) =>
    peticion<void>('PUT', '/api/usuarios/me/contrasena', { cuerpo: { actual, nueva } }),

  activarOrganizador: () => peticion<UsuarioResumen>('POST', '/api/usuarios/me/roles/organizador'),

  dejarOrganizador: () => peticion<UsuarioResumen>('DELETE', '/api/usuarios/me/roles/organizador'),
};
