import type { Page } from '@playwright/test';

/** Claves de las guías de la primera vez (src/features/guias/almacen.ts). */
const GUIAS = ['inicio', 'detalle_evento', 'asientos', 'boleto', 'organizador', 'nuevo_evento', 'panel_evento'];

/** Marca todas las guías como vistas para que no se abran encima de lo que prueba cada flujo. */
export async function sinGuias(page: Page) {
  await page.addInitScript((claves) => localStorage.setItem('enzona.guias', JSON.stringify(claves)), GUIAS);
}

export async function entrar(page: Page, correo: string, personal = false) {
  await page.goto(personal ? '/acceso/personal' : '/acceso');
  await page.getByLabel('Correo o CURP', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill('enzona123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/acceso'));
}
