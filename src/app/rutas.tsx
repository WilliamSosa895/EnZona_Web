/* eslint-disable react-refresh/only-export-components -- archivo de configuración de rutas */
import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { Marco, MarcoAcceso } from './Marco';
import { RequiereSesion, SoloSinSesion } from './Guardas';

// Cada pantalla se carga bajo demanda: la primera visita descarga solo lo necesario.
const Acceso = lazy(() => import('@/features/acceso/AccesoPage'));
const Registro = lazy(() => import('@/features/acceso/RegistroPage'));
const Verificacion = lazy(() => import('@/features/acceso/VerificacionPage'));
const Ayuda = lazy(() => import('@/features/informacion/AyudaPage'));
const Privacidad = lazy(() => import('@/features/informacion/PrivacidadPage'));
const Legal = lazy(() => import('@/features/informacion/LegalPage'));
const NoEncontrado = lazy(() => import('@/features/comun/NoEncontradoPage'));

export const rutas: RouteObject[] = [
  {
    element: <MarcoAcceso />,
    children: [
      {
        path: '/acceso',
        element: (
          <SoloSinSesion>
            <Acceso modoPersonal={false} />
          </SoloSinSesion>
        ),
      },
      {
        path: '/acceso/personal',
        element: (
          <SoloSinSesion>
            <Acceso modoPersonal />
          </SoloSinSesion>
        ),
      },
      {
        path: '/registro',
        element: (
          <SoloSinSesion>
            <Registro />
          </SoloSinSesion>
        ),
      },
      { path: '/verificacion', element: <Verificacion /> },
      { path: '/privacidad/aviso', element: <Privacidad /> },
    ],
  },
  {
    element: (
      <RequiereSesion>
        <Marco />
      </RequiereSesion>
    ),
    children: [
      { path: '/ayuda', element: <Ayuda /> },
      { path: '/privacidad', element: <Privacidad /> },
      { path: '/legal', element: <Legal /> },
      { path: '*', element: <NoEncontrado /> },
    ],
  },
];

/** Comportamientos de React Router v7 activados desde ahora para facilitar la migración. */
export const FUTURO = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const;

export const crearEnrutador = () => createBrowserRouter(rutas, { future: FUTURO });
