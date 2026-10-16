import { setupServer } from 'msw/node';
import { manejadores } from './manejadores';

/** API simulada para las pruebas automáticas (Vitest). */
export const servidor = setupServer(...manejadores);
