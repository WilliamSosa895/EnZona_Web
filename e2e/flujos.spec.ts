import { expect, test, type Page } from '@playwright/test';

async function entrar(page: Page, correo: string, personal = false) {
  await page.goto(personal ? '/acceso/personal' : '/acceso');
  await page.getByLabel('Correo o CURP', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill('enzona123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

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
