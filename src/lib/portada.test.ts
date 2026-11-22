import { describe, expect, it } from 'vitest';
import { conZoom, moverEncuadre, rectanguloRecorte, urlPortada, validarArchivo, ZOOM_MAXIMO } from './portada';

describe('rectanguloRecorte (mismo cálculo que ImagenPortada.kt)', () => {
  it('recorta a los lados una imagen más ancha que 16:9 y la centra', () => {
    expect(rectanguloRecorte(2000, 900, { x: 0, y: 0, zoom: 1 })).toEqual({ x: 200, y: 0, ancho: 1600, alto: 900 });
  });

  it('recorta arriba y abajo una foto vertical', () => {
    expect(rectanguloRecorte(900, 1600, { x: 0, y: 0, zoom: 1 })).toEqual({ x: 0, y: 547, ancho: 900, alto: 506 });
  });

  it('lleva el recorte al borde con -1 y 1', () => {
    expect(rectanguloRecorte(2000, 900, { x: -1, y: 0, zoom: 1 }).x).toBe(0);
    expect(rectanguloRecorte(2000, 900, { x: 1, y: 0, zoom: 1 }).x).toBe(400);
    expect(rectanguloRecorte(900, 1600, { x: 0, y: 1, zoom: 1 }).y).toBe(1094);
  });

  it('acerca dividiendo el recorte entre el zoom, sin pasar del máximo', () => {
    expect(rectanguloRecorte(1600, 900, { x: 0, y: 0, zoom: 2 })).toEqual({ x: 400, y: 225, ancho: 800, alto: 450 });
    const maximo = rectanguloRecorte(1600, 900, { x: 0, y: 0, zoom: 99 });
    expect(maximo.ancho).toBe(1600 / ZOOM_MAXIMO);
  });
});

describe('moverEncuadre', () => {
  it('arrastrar a la derecha muestra la parte izquierda', () => {
    const e = moverEncuadre({ x: 0, y: 0, zoom: 1 }, 100, 0, 400, 2000, 900);
    expect(e.x).toBeLessThan(0);
    expect(e.y).toBe(0);
  });

  it('no se sale de los bordes ni mueve un eje sin sobrante', () => {
    const e = moverEncuadre({ x: 0, y: 0, zoom: 1 }, -10_000, 500, 400, 2000, 900);
    expect(e).toEqual({ x: 1, y: 0, zoom: 1 });
  });

  it('conZoom respeta los límites', () => {
    expect(conZoom({ x: 0.5, y: 0, zoom: 1 }, 0.2).zoom).toBe(1);
    expect(conZoom({ x: 0.5, y: 0, zoom: 1 }, 9).zoom).toBe(ZOOM_MAXIMO);
  });
});

describe('validarArchivo', () => {
  it('acepta JPEG, PNG y WebP', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp'])
      expect(validarArchivo({ type, size: 1000 })).toBeNull();
  });

  it('rechaza otros tipos y archivos enormes', () => {
    expect(validarArchivo({ type: 'image/gif', size: 1000 })).toMatch(/JPEG, PNG o WebP/);
    expect(validarArchivo({ type: 'image/png', size: 30 * 1024 * 1024 })).toMatch(/demasiado grande/);
  });
});

describe('urlPortada', () => {
  it('completa la ruta relativa del almacén local con la dirección de la API', () => {
    expect(urlPortada('/api/imagenes/abc.jpg', 'http://localhost:8080')).toBe(
      'http://localhost:8080/api/imagenes/abc.jpg',
    );
  });

  it('deja intactas las URL absolutas de Cloudinary y las vistas previas locales', () => {
    const nube = 'https://res.cloudinary.com/demo/image/upload/eventos/1/x.jpg';
    expect(urlPortada(nube)).toBe(nube);
    expect(urlPortada('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
  });

  it('descarta valores vacíos y esquemas no permitidos', () => {
    expect(urlPortada(null)).toBeNull();
    expect(urlPortada('  ')).toBeNull();
    expect(urlPortada('javascript:alert(1)')).toBeNull();
    expect(urlPortada('//otro.sitio/x.jpg')).toBeNull();
  });
});
