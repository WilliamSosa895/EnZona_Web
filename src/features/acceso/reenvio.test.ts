import { beforeEach, describe, expect, it } from 'vitest';
import { ESPERA_REENVIO_S, leerUltimoEnvio, registrarEnvio, segundosRestantes, textoReenvio } from './reenvio';

describe('reenvío del código de verificación', () => {
  beforeEach(() => sessionStorage.clear());

  it('el botón muestra la cuenta regresiva mientras la API no acepta otro envío', () => {
    expect(textoReenvio(52)).toBe('Reenviar código (52 s)');
    expect(textoReenvio(0)).toBe('Reenviar código');
  });

  it('cuenta los 60 s desde el último envío', () => {
    expect(segundosRestantes(null)).toBe(0);
    expect(segundosRestantes(10_000, 10_000)).toBe(ESPERA_REENVIO_S);
    expect(segundosRestantes(10_000, 18_500)).toBe(52);
    expect(segundosRestantes(10_000, 75_000)).toBe(0);
    // Un reloj atrasado no da más de 60 s de espera.
    expect(segundosRestantes(10_000, 5_000)).toBe(ESPERA_REENVIO_S);
  });

  it('recuerda el envío por correo, sin distinguir mayúsculas', () => {
    registrarEnvio('Luis@Correo.com', 1_234);
    expect(leerUltimoEnvio('luis@correo.com')).toBe(1_234);
    expect(leerUltimoEnvio('otra@correo.com')).toBeNull();
  });
});
