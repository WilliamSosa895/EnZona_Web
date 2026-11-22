import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { entrar } from './apoyo';

test('guía de la primera vez: se recorre, es accesible y no vuelve a aparecer', async ({ page }) => {
  await entrar(page, 'asistente@uv.mx');
  const guia = page.getByRole('dialog', { name: '¡Hola! Bienvenido a EnZona' });
  await expect(guia).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations.map((v) => v.id)).toEqual([]);

  await page.getByRole('button', { name: 'Siguiente →' }).click();
  await expect(page.getByRole('dialog', { name: 'Esta es tu ciudad' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog', { name: '¿Buscas algo en especial?' })).toBeVisible();
  await page.getByRole('button', { name: 'Omitir' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(/eventos publicados/)).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
