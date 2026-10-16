import type { ReactElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { crearClienteConsultas } from '@/app/consultas';
import { rutas } from '@/app/rutas';
import { guardarSesion } from '@/auth/almacen';
import { SesionProvider } from '@/auth/SesionContext';
import { base } from '@/mocks/manejadores';

/** Inicia sesión en la API simulada sin pasar por la pantalla de acceso. */
export function sesionComo(correo: string, accesoPersonal = false) {
  const u = base().usuarios.find((x) => x.correo === correo);
  if (!u) throw new Error(`No existe ${correo} en la API simulada`);
  const token = `simulado.${u.id}.prueba`;
  base().sesiones.set(token, u.id);
  guardarSesion({
    token,
    expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
    usuario: { id: u.id, nombre: u.nombre, correo: u.correo, roles: u.roles },
    accesoPersonal,
  });
  return u;
}

/** Renderiza la aplicación completa en la ruta indicada, con la API simulada. */
export function renderizarApp(ruta: string) {
  const cliente = crearClienteConsultas();
  cliente.setDefaultOptions({ queries: { retry: false, staleTime: 0 } });
  const enrutador = createMemoryRouter(rutas, { initialEntries: [ruta] });
  const usuario = userEvent.setup();
  const resultado = render(
    <QueryClientProvider client={cliente}>
      <SesionProvider>
        <RouterProvider router={enrutador} />
      </SesionProvider>
    </QueryClientProvider>,
  );
  return { ...resultado, usuario, enrutador };
}

/** Renderiza un componente suelto con el proveedor de consultas. */
export function renderizar(elemento: ReactElement) {
  const cliente = crearClienteConsultas();
  return {
    ...render(<QueryClientProvider client={cliente}>{elemento}</QueryClientProvider>),
    usuario: userEvent.setup(),
  };
}
