import { expect, test } from '@playwright/test';

test('first launch routes through welcome, then lands on Home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /welcome to ttn darts trainer/i })).toBeVisible();

  await page.getByLabel(/your name/i).fill('Tom');
  await page.getByRole('button', { name: /create profile/i }).click();

  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible();
});
