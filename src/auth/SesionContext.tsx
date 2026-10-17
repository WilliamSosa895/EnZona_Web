import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { configurarSesion } from '@/api/http';
import { identidadApi } from '@/api/identidad';
import type { Rol } from '@/api/tipos';
import { borrarSesion, guardarSesion, leerSesion, type SesionGuardada } from './almacen';
import { esPersonal } from './roles';
import { ErrorModoAcceso, SesionContext, type ValorSesion } from './contexto';

export function SesionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sesion, setSesion] = useState<SesionGuardada | null>(() => leerSesion());
  const [avisoCierre, setAvisoCierre] = useState<string | null>(null);
  const sesionRef = useRef(sesion);
  sesionRef.current = sesion;

  const cerrar = useCallback(
    (motivo: string | null) => {
      borrarSesion();
      setSesion(null);
      setAvisoCierre(motivo);
      queryClient.clear(); // ningún dato de la cuenta anterior queda en caché
    },
    [queryClient],
  );

  // El cliente HTTP toma el token de aquí y avisa si la API responde 401. Se configura durante el PRIMER
  // render y no en un efecto: los efectos de los hijos corren antes que los del padre, y una pantalla ya
  // cargada pediría sus datos con la configuración anterior (sin token o con el de otra sesión).
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;
  useState(() =>
    configurarSesion({
      obtenerToken: () => sesionRef.current?.token ?? null,
      alNoAutenticado: () => cerrarRef.current('Tu sesión terminó. Vuelve a iniciar sesión.'),
    }),
  );

  // Cierre automático al vencer el token (no hay token de renovación en esta versión de la API).
  useEffect(() => {
    if (!sesion) return;
    const restante = Date.parse(sesion.expiraEn) - Date.now();
    const temporizador = window.setTimeout(
      () => cerrar('Tu sesión venció por seguridad. Vuelve a iniciar sesión.'),
      Math.max(0, Math.min(restante, 2_147_000_000)),
    );
    return () => window.clearTimeout(temporizador);
  }, [sesion, cerrar]);

  const iniciarSesion = useCallback(
    async (identificador: string, contrasena: string, modoPersonal: boolean) => {
      const respuesta = await identidadApi.iniciarSesion(identificador, contrasena);
      const roles = respuesta.usuario.roles;
      if (modoPersonal && !esPersonal(roles)) {
        throw new ErrorModoAcceso('Esta cuenta no tiene permisos de personal. Usa el acceso normal.');
      }
      if (!modoPersonal && roles.includes('ADMIN')) {
        throw new ErrorModoAcceso('Las cuentas de administración entran por el acceso del personal.');
      }
      const nueva: SesionGuardada = {
        token: respuesta.token,
        expiraEn: respuesta.expiraEn,
        usuario: respuesta.usuario,
        accesoPersonal: modoPersonal,
      };
      queryClient.clear();
      guardarSesion(nueva);
      setAvisoCierre(null);
      setSesion(nueva);
      return respuesta.usuario;
    },
    [queryClient],
  );

  const actualizarRoles = useCallback((roles: Rol[]) => {
    setSesion((actual) => {
      if (!actual) return actual;
      const nueva = { ...actual, usuario: { ...actual.usuario, roles } };
      guardarSesion(nueva);
      return nueva;
    });
  }, []);

  const refrescar = useCallback(async () => {
    if (!sesionRef.current) return;
    const perfil = await identidadApi.perfil();
    setSesion((actual) => {
      if (!actual) return actual;
      const nueva = {
        ...actual,
        usuario: { id: perfil.id, nombre: perfil.nombre, correo: perfil.correo, roles: perfil.roles },
      };
      guardarSesion(nueva);
      return nueva;
    });
  }, []);

  const valor = useMemo<ValorSesion>(
    () => ({
      usuario: sesion?.usuario ?? null,
      accesoPersonal: sesion?.accesoPersonal ?? false,
      autenticado: sesion !== null,
      avisoCierre,
      iniciarSesion,
      cerrarSesion: () => cerrar(null),
      refrescar,
      actualizarRoles,
    }),
    [sesion, avisoCierre, iniciarSesion, cerrar, refrescar, actualizarRoles],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}
