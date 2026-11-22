import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { configurarGuias } from '@/features/guias/almacen';
import { reiniciarBase } from '@/mocks/manejadores';
import { servidor } from '@/mocks/servidor';

// Las guías de la primera vez no se abren encima de lo que se prueba (guias.test.tsx las activa a propósito).
configurarGuias({ habilitadas: false });

// Las consultas por rol recorren todo el árbol accesible; en jsdom pueden tardar más que el límite por defecto.
configure({ asyncUtilTimeout: 4000 });

// jsdom no implementa scrollTo ni matchMedia; las pantallas los usan de forma opcional.
window.scrollTo = () => undefined;
window.matchMedia ??= ((consulta: string) => ({
  matches: false,
  media: consulta,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  servidor.resetHandlers();
  reiniciarBase();
  sessionStorage.clear();
  localStorage.clear();
});
afterAll(() => servidor.close());
