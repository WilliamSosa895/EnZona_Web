import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSesion } from '@/auth/useSesion';
import { AnfitrionGuias } from '@/features/guias/AnfitrionGuias';
import { IndicadorCarga } from '@/ui';
import pin from '@/assets/enzona_pin.svg';
import { destinosDeRol } from './navegacion';
import estilos from './Marco.module.css';

/**
 * Marco de la aplicación autenticada. En móvil muestra la barra inferior solo en las pantallas principales
 * (como Android); en escritorio, un riel lateral siempre visible.
 */
export function Marco() {
  const { usuario, accesoPersonal } = useSesion();
  const { pathname } = useLocation();
  const destinos = destinosDeRol(usuario?.roles ?? [], accesoPersonal);
  const enPestana = destinos.some((d) => d.ruta === pathname);

  return (
    <AnfitrionGuias>
      <div className={[estilos.marco, estilos.conNavegacion, enPestana ? estilos.conBarra : ''].join(' ')}>
        <a href="#contenido" className="saltar-contenido">
          Saltar al contenido
        </a>
        <nav className={estilos.barra} aria-label="Navegación principal">
          <img src={pin} alt="" className={estilos.logoRiel} width={53} height={56} />
          {destinos.map(({ ruta, etiqueta, icono: Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={ruta === '/'}
              data-guia={`nav_${ruta}`}
              className={({ isActive }) => [estilos.destino, isActive ? estilos.activo : ''].join(' ')}
            >
              <span className={estilos.indicador} aria-hidden="true">
                <Icono />
              </span>
              {etiqueta}
            </NavLink>
          ))}
        </nav>
        <main id="contenido" className={estilos.contenido} tabIndex={-1}>
          <Suspense fallback={<IndicadorCarga texto="Cargando…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </AnfitrionGuias>
  );
}

/** Marco de las pantallas de acceso (sin navegación). */
export function MarcoAcceso() {
  return (
    <main id="contenido">
      <Suspense fallback={<IndicadorCarga texto="Cargando…" />}>
        <Outlet />
      </Suspense>
    </main>
  );
}
