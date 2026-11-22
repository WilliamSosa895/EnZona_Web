import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { entrar, sinGuias } from './apoyo';

/** Revisión automática WCAG 2.1 A y AA de las pantallas principales de cada rol. */
async function revisar(page: Page, ruta: string) {
  await page.goto(ruta);
  // Con sesión, la carga empieza con la pantalla de conexión: se revisa la pantalla de la ruta, no esa.
  await expect(page.getByText('Conectando con EnZona…')).toHaveCount(0, { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`),
    ruta,
  ).toEqual([]);
}

test.beforeEach(({ page }) => sinGuias(page));

test('accesibilidad: pantallas sin sesión', async ({ page }) => {
  for (const ruta of ['/acceso', '/acceso/personal', '/registro', '/verificacion?correo=nuevo%40correo.com'])
    await revisar(page, ruta);
});

test('accesibilidad: pantalla de conexión', async ({ page }) => {
  await entrar(page, 'asistente@uv.mx');
  await page.reload();
  await expect(page.getByText('Conectando con EnZona…')).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
  await expect(page.getByRole('heading', { name: 'Eventos cerca de ti' })).toBeVisible({ timeout: 10_000 });
});

test('accesibilidad: asistente', async ({ page }) => {
  await entrar(page, 'asistente@uv.mx');
  for (const ruta of [
    '/',
    '/eventos/1',
    '/eventos/1/asientos?tipo=15&cantidad=2',
    '/pago?evento=4&tipo=40&cantidad=1',
    '/boletos',
    '/notificaciones',
    '/perfil',
    '/perfil/datos',
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
