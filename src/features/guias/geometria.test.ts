import { describe, expect, it } from 'vitest';
import { alasDeFlecha, posicionTarjeta, trazarFlecha } from './geometria';

const pantalla = { ancho: 400, alto: 800 };
const tarjeta = { ancho: 260, alto: 120 };

describe('posicionTarjeta (como GuiaInteractiva.kt)', () => {
  it('sin foco centra el texto', () => {
    expect(posicionTarjeta(null, pantalla, tarjeta, 84, 24)).toEqual({ x: 70, y: 340 });
  });

  it('va debajo del foco si cabe', () => {
    const foco = { left: 16, top: 100, right: 384, bottom: 160 };
    expect(posicionTarjeta(foco, pantalla, tarjeta, 84, 24)).toEqual({ x: 24, y: 244 });
  });

  it('va encima cuando el foco está abajo (barra de navegación)', () => {
    const foco = { left: 200, top: 720, right: 300, bottom: 790 };
    expect(posicionTarjeta(foco, pantalla, tarjeta, 84, 24)).toEqual({ x: 116, y: 516 });
  });

  it('nunca se sale de la pantalla', () => {
    const alto = { left: 0, top: 10, right: 400, bottom: 790 };
    const p = posicionTarjeta(alto, pantalla, tarjeta, 84, 24);
    expect(p.y).toBeGreaterThanOrEqual(24);
    expect(p.y + tarjeta.alto).toBeLessThanOrEqual(pantalla.alto - 24);
  });
});

describe('trazarFlecha', () => {
  it('con el foco debajo, baja desde el texto hasta el borde superior del foco', () => {
    const texto = { left: 24, top: 300, right: 284, bottom: 420 };
    const foco = { left: 16, top: 520, right: 384, bottom: 580 };
    const f = trazarFlecha(texto, foco, pantalla);
    expect(f.inicio.y).toBe(434);
    expect(f.fin.y).toBe(506);
    expect(f.fin.x).toBeGreaterThanOrEqual(foco.left);
    expect(f.fin.x).toBeLessThanOrEqual(foco.right);
  });

  it('con el foco a la derecha sale por el lado derecho del texto', () => {
    const texto = { left: 24, top: 300, right: 200, bottom: 360 };
    const foco = { left: 300, top: 100, right: 380, bottom: 160 };
    const f = trazarFlecha(texto, foco, pantalla);
    expect(f.inicio).toEqual({ x: 214, y: 330 });
    expect(f.fin).toEqual({ x: 340, y: 174 });
    expect(f.control).toEqual({ x: 340, y: 330 });
  });

  it('las alas de la punta quedan simétricas respecto a la tangente final', () => {
    const alas = alasDeFlecha({ inicio: { x: 0, y: 0 }, control: { x: 100, y: 0 }, fin: { x: 100, y: 100 } }, 20)!;
    expect(alas[0].y).toBeCloseTo(80);
    expect(alas[1].y).toBeCloseTo(80);
    expect(alas[0].x + alas[1].x).toBeCloseTo(200);
  });
});
