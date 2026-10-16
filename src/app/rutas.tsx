/* eslint-disable react-refresh/only-export-components -- archivo de configuración de rutas */
import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { Marco } from './Marco';
import { RequiereSesion } from './Guardas';

// Cada pantalla se carga bajo demanda: la primera visita descarga solo lo necesario.
const NoEncontrado = lazy(() => import('@/features/comun/NoEncontradoPage'));

export const rutas: RouteObject[] = [
  {
    element: (
      <RequiereSesion>
        <Marco />
      </RequiereSesion>
    ),
    children: [{ path: '*', element: <NoEncontrado /> }],
  },
];

export const crearEnrutador = () => createBrowserRouter(rutas);
