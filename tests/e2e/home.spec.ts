import { expect, test } from '@playwright/test';

test('home route renders heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /home/i })).toBeVisible();
});
