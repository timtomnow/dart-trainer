import { expect, test, type Page } from '@playwright/test';

async function throwDart(page: Page, mult: 'S' | 'D' | 'T', num: number) {
  if (mult !== 'S') await page.getByTestId(`x01-mult-${mult}`).click();
  await page.getByTestId(`x01-num-${num}`).click();
}

test('x01 301 leg: score, bust, and checkout on D20', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/your name/i).fill('Tester');
  await page.getByRole('button', { name: /create profile/i }).click();
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible();

  await page.getByTestId('home-play').click();
  await page.getByTestId('x01-start-score').selectOption('301');
  await page.getByTestId('x01-out-rule').selectOption('double');
  await page.getByTestId('x01-legs-to-win').fill('1');
  await page.getByTestId('x01-start').click();

  await expect(page.getByRole('heading', { name: /^x01$/i })).toBeVisible();
  await expect(page.getByTestId('x01-remaining')).toHaveText('301');
  await expect(page.getByTestId('x01-legs')).toContainText('Leg 1');

  // Turn 1: T20 T20 T20 → 180 scored, remaining 121.
  await throwDart(page, 'T', 20);
  await throwDart(page, 'T', 20);
  await throwDart(page, 'T', 20);
  await expect(page.getByTestId('x01-remaining')).toHaveText('121');

  // Turn 2 first two darts: T20 T20 → leaves 1, bust under double-out. Reverts to 121.
  await throwDart(page, 'T', 20);
  await throwDart(page, 'T', 20);
  await expect(page.getByTestId('x01-remaining')).toHaveText('121');

  // Turn 3: T20 T7 D20 → 60 + 21 + 40 = 121 checkout.
  await throwDart(page, 'T', 20);
  await throwDart(page, 'T', 7);
  await throwDart(page, 'D', 20);

  await expect(page.getByTestId('x01-status')).toHaveText('Match won');
  await expect(page.getByTestId('x01-remaining')).toHaveText('0');
  await expect(page.getByTestId('x01-legs')).toContainText('Won 1/1');
  await expect(page.getByTestId('x01-darts-thrown')).toHaveText('8');

  // Undo the checkout dart: status returns to in_progress with 40 remaining.
  await page.getByTestId('x01-undo').click();
  await expect(page.getByTestId('x01-status')).not.toHaveText('Match won');
  await expect(page.getByTestId('x01-remaining')).toHaveText('40');
});

test('x01 resume: leaving mid-turn restores working score', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/your name/i).fill('Tester');
  await page.getByRole('button', { name: /create profile/i }).click();

  await page.getByTestId('home-play').click();
  await page.getByTestId('x01-start-score').selectOption('501');
  await page.getByTestId('x01-start').click();
  await throwDart(page, 'T', 20);
  await expect(page.getByTestId('x01-remaining')).toHaveText('441');
  await page.getByTestId('x01-quit').click();

  await expect(page.getByTestId('resume-card')).toBeVisible();
  await page.getByRole('button', { name: /^resume$/i }).click();
  await expect(page.getByTestId('x01-remaining')).toHaveText('441');
});
