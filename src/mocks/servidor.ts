import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { URL_NOMINATIM } from '@/lib/geocodificacion';
import { manejadores } from './manejadores';

/**
 * API simulada para las pruebas automáticas (Vitest). La geocodificación inversa de OpenStreetMap también se
 * simula: las pruebas nunca salen a internet.
 */
export const servidor = setupServer(
  ...manejadores,
  http.get(URL_NOMINATIM, () =>
    HttpResponse.json({ address: { road: 'Oriente 6', house_number: '1', suburb: 'Centro', city: 'Orizaba' } }),
  ),
);
