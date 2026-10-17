import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { env } from '@/config/env';
import '@/styles/global.css';

async function prepararApiSimulada() {
  // Solo en desarrollo y con VITE_API_MOCK=true: la API se simula en el navegador (modo demostración).
  if (!env.apiSimulada) return;
  const { iniciarApiSimulada } = await import('@/mocks/navegador');
  await iniciarApiSimulada();
}

prepararApiSimulada().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
