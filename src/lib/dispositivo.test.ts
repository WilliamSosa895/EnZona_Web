import { afterEach, describe, expect, it, vi } from 'vitest';
import { nuevaClave } from './idempotencia';
import { obtenerUbicacion } from './ubicacion';

const geolocalizacion = (impl: Partial<Geolocation>) =>
  Object.defineProperty(navigator, 'geolocation', { value: impl, configurable: true });

describe('Idempotency-Key', () => {
  it('genera claves distintas con el formato que acepta la API', () => {
    const a = nuevaClave();
    expect(a).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(nuevaClave()).not.toBe(a);
  });

  it('usa getRandomValues si randomUUID no existe', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis.crypto, 'randomUUID');
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(nuevaClave()).toMatch(/^[0-9a-f]{32}$/);
    } finally {
      if (original) Object.defineProperty(globalThis.crypto, 'randomUUID', original);
      else delete (globalThis.crypto as { randomUUID?: unknown }).randomUUID;
    }
  });
});

describe('ubicación (RF-19, RNF-11)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('redondea las coordenadas a 4 decimales', async () => {
    geolocalizacion({
      getCurrentPosition: (ok) => ok({ coords: { latitude: 18.851234, longitude: -97.100987 } } as GeolocationPosition),
    });
    await expect(obtenerUbicacion()).resolves.toEqual({ lat: 18.8512, lng: -97.101 });
  });

  it('explica cómo seguir si se niega el permiso', async () => {
    geolocalizacion({
      getCurrentPosition: (_ok, error) => error?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    });
    await expect(obtenerUbicacion()).rejects.toThrow(/elegir tu ciudad a mano/);
  });
});
