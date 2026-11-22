import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { SesionProvider } from '@/auth/SesionContext';
import { Arranque } from './Arranque';
import { crearClienteConsultas } from './consultas';
import { crearEnrutador } from './rutas';

export function App() {
  const [clienteConsultas] = useState(crearClienteConsultas);
  const [enrutador] = useState(crearEnrutador);
  return (
    <QueryClientProvider client={clienteConsultas}>
      <SesionProvider>
        <Arranque>
          <RouterProvider router={enrutador} />
        </Arranque>
      </SesionProvider>
    </QueryClientProvider>
  );
}
