import { expect, test } from '@playwright/test';

test('freeform session: start, throw, undo across boundaries, forfeit, resume', async ({
  page
}) => {
  await page.goto('/');
  await page.getByLabel(/your name/i).fill('Tester');
  await page.getByRole('button', { name: /create profile/i }).click();
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible();

  await page.getByRole('button', { name: /start freeform session/i }).click();
  await expect(page.getByRole('heading', { name: /active game/i })).toBeVisible();
  await expect(page.getByTestId('session-status')).toHaveText('in_progress');
  await expect(page.getByTestId('throw-count')).toHaveText('0');

  const t20 = page.getByRole('button', { name: /^t20$/i });
  await t20.click();
  await t20.click();
  await t20.click();
  await t20.click();
  await expect(page.getByTestId('throw-count')).toHaveText('4');

  const undo = page.getByRole('button', { name: /^undo$/i });
  await undo.click();
  await undo.click();
  await undo.click();
  await undo.click();
  await expect(page.getByTestId('throw-count')).toHaveText('0');
  await expect(undo).toBeDisabled();

  await t20.click();
  await page.getByRole('button', { name: /^forfeit$/i }).click();
  await expect(page.getByTestId('session-status')).toHaveText('forfeited');

  await page.getByRole('button', { name: /^quit$/i }).click();
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible();

  await page.getByRole('button', { name: /start freeform session/i }).click();
  await expect(page.getByTestId('session-status')).toHaveText('in_progress');
  await page.getByRole('button', { name: /^s20$/i }).click();
  await page.getByRole('button', { name: /^quit$/i }).click();

  await expect(page.getByTestId('resume-card')).toBeVisible();
  await page.getByRole('button', { name: /^resume$/i }).click();
  await expect(page.getByTestId('throw-count')).toHaveText('1');
});
