/* eslint-disable react-refresh/only-export-components -- archivo de configuración de rutas */
import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { Marco, MarcoAcceso } from './Marco';
import { RequiereRol, RequiereSesion, SoloSinSesion } from './Guardas';

// Cada pantalla se carga bajo demanda: la primera visita descarga solo lo necesario.
const Acceso = lazy(() => import('@/features/acceso/AccesoPage'));
const Registro = lazy(() => import('@/features/acceso/RegistroPage'));
const Verificacion = lazy(() => import('@/features/acceso/VerificacionPage'));
const Inicio = lazy(() => import('@/features/eventos/InicioPage'));
const DetalleEvento = lazy(() => import('@/features/eventos/DetalleEventoPage'));
const Asientos = lazy(() => import('@/features/compra/AsientosPage'));
const Pago = lazy(() => import('@/features/compra/PagoPage'));
const Orden = lazy(() => import('@/features/compra/OrdenPage'));
const MisBoletos = lazy(() => import('@/features/boletos/MisBoletosPage'));
const Boleto = lazy(() => import('@/features/boletos/BoletoPage'));
const Perfil = lazy(() => import('@/features/perfil/PerfilPage'));
const EditarDatos = lazy(() => import('@/features/perfil/EditarDatosPage'));
const Seguridad = lazy(() => import('@/features/perfil/SeguridadPage'));
const MisEventos = lazy(() => import('@/features/organizador/MisEventosPage'));
const FormularioEvento = lazy(() => import('@/features/organizador/FormularioEventoPage'));
const PanelEvento = lazy(() => import('@/features/organizador/PanelEventoPage'));
const Escaner = lazy(() => import('@/features/validador/EscanerPage'));
const Admin = lazy(() => import('@/features/admin/AdminPage'));
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
      { path: '/', element: <Inicio /> },
      { path: '/eventos/:id', element: <DetalleEvento /> },
      { path: '/eventos/:id/asientos', element: <Asientos /> },
      { path: '/pago', element: <Pago /> },
      { path: '/ordenes/:id', element: <Orden /> },
      { path: '/boletos', element: <MisBoletos /> },
      { path: '/boletos/:id', element: <Boleto /> },
      { path: '/perfil', element: <Perfil /> },
      { path: '/perfil/datos', element: <EditarDatos /> },
      { path: '/perfil/seguridad', element: <Seguridad /> },
      {
        path: '/organizador',
        element: (
          <RequiereRol roles={['ORGANIZADOR']}>
            <MisEventos />
          </RequiereRol>
        ),
      },
      {
        path: '/organizador/eventos/nuevo',
        element: (
          <RequiereRol roles={['ORGANIZADOR']}>
            <FormularioEvento />
          </RequiereRol>
        ),
      },
      {
        path: '/organizador/eventos/:id',
        element: (
          <RequiereRol roles={['ORGANIZADOR']}>
            <PanelEvento />
          </RequiereRol>
        ),
      },
      {
        path: '/organizador/eventos/:id/editar',
        element: (
          <RequiereRol roles={['ORGANIZADOR']}>
            <FormularioEvento />
          </RequiereRol>
        ),
      },
      {
        path: '/validador',
        element: (
          <RequiereRol roles={['VALIDADOR', 'ORGANIZADOR', 'ADMIN']}>
            <Escaner />
          </RequiereRol>
        ),
      },
      {
        path: '/admin',
        element: (
          <RequiereRol roles={['ADMIN']}>
            <Admin />
          </RequiereRol>
        ),
      },
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
