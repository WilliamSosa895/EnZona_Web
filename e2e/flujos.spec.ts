import { expect, test } from '@playwright/test';
import { entrar, sinGuias } from './apoyo';

test.beforeEach(({ page }) => sinGuias(page));

test('asistente: compra dos asientos y ve sus boletos QR', async ({ page }) => {
  await entrar(page, 'asistente@uv.mx');
  await page.getByText('Noche de jazz en el Foro').first().click();
  await page.getByRole('button', { name: 'Agregar un boleto' }).click();
  await page.getByRole('button', { name: 'Elegir 2 asientos' }).click();
  await page.getByRole('checkbox', { name: /fila B, asiento 7,/ }).click();
  await page.getByRole('checkbox', { name: /fila B, asiento 8,/ }).click();
  await page.getByRole('button', { name: /Continuar al pago/ }).click();
  await expect(page.getByText('Total a pagar')).toBeVisible();
  await page.getByRole('button', { name: 'Pagar $360.00 MXN' }).click();
  await expect(page.getByRole('heading', { name: 'Tus 2 boletos están listos' })).toBeVisible();
  await page.getByRole('link', { name: /Boleto 1 de 2/ }).click();
  await expect(page.getByRole('img', { name: /Código QR del boleto/ })).toBeVisible();
});

test('organizador: abre el panel de un evento', async ({ page }) => {
  await entrar(page, 'organizador@uv.mx', true);
  await expect(page.getByRole('heading', { name: 'Mis eventos' })).toBeVisible();
  await page.getByText('Noche de jazz en el Foro').click();
  await expect(page.getByRole('heading', { name: 'Personal de acceso' })).toBeVisible();
});

test('sin sesión, una ruta protegida lleva a la pantalla de acceso', async ({ page }) => {
  await page.goto('/boletos');
  await expect(page).toHaveURL(/\/acceso/);
});

test('registro sin teléfono, verificación por correo y acceso', async ({ page }) => {
  await page.goto('/registro');
  await expect(page.getByLabel(/Teléfono/)).toHaveCount(0);
  await page.getByLabel('Nombre completo').fill('Luis Pérez');
  await page.getByLabel('Correo electrónico').fill('luis.e2e@correo.com');
  await page.getByLabel('CURP').fill('PELL010101HVZRSS05');
  await page.getByLabel('Contraseña', { exact: true }).fill('Secreta123');
  await page.getByLabel('Confirmar contraseña').fill('Secreta123');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Verifica tu cuenta' })).toBeVisible();
  // En el modo demostración la API simulada muestra el código en pantalla.
  await page.getByLabel('Código de verificación').fill('123456');
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page.getByText('Tu cuenta está activa. Ya puedes iniciar sesión.')).toBeVisible();
});

test('administración: activa sin código una cuenta pendiente', async ({ page }) => {
  await entrar(page, 'admin@uv.mx', true);
  await page.getByRole('tab', { name: 'Usuarios' }).click();
  const tarjeta = page.getByRole('article', { name: 'Paco Pendiente' });
  await tarjeta.getByRole('button', { name: 'Activar sin código' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Activar cuenta' }).click();
  await expect(tarjeta.getByText('Activo', { exact: true })).toBeVisible();
});
