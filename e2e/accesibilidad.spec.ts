import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Revisión automática WCAG 2.1 A y AA de las pantallas principales de cada rol. */
async function revisar(page: Page, ruta: string) {
  await page.goto(ruta);
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`),
    ruta,
  ).toEqual([]);
}

async function entrar(page: Page, correo: string, personal = false) {
  await page.goto(personal ? '/acceso/personal' : '/acceso');
  await page.getByLabel('Correo o CURP', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill('enzona123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/acceso'));
}

test('accesibilidad: pantallas sin sesión', async ({ page }) => {
  for (const ruta of ['/acceso', '/acceso/personal', '/registro']) await revisar(page, ruta);
});

test('accesibilidad: asistente', async ({ page }) => {
  await entrar(page, 'asistente@uv.mx');
  for (const ruta of [
    '/',
    '/eventos/1',
    '/eventos/1/asientos?tipo=15&cantidad=2',
    '/pago?evento=4&tipo=40&cantidad=1',
    '/boletos',
    '/perfil',
    '/perfil/seguridad',
  ])
    await revisar(page, ruta);
});

test('accesibilidad: organizador y administración', async ({ page }) => {
  await entrar(page, 'organizador@uv.mx', true);
  for (const ruta of ['/organizador', '/organizador/eventos/1', '/organizador/eventos/nuevo'])
    await revisar(page, ruta);
  await page.evaluate(() => sessionStorage.removeItem('enzona.sesion'));
  await entrar(page, 'admin@uv.mx', true);
  for (const ruta of ['/admin', '/validador']) await revisar(page, ruta);
});
