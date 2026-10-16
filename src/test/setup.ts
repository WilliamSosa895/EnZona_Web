import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { reiniciarBase } from '@/mocks/manejadores';
import { servidor } from '@/mocks/servidor';

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
