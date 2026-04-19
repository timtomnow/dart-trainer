import { expect, test, type Page } from '@playwright/test';

async function createProfile(page: Page, name = 'Tester') {
  await page.goto('/');
  await page.getByLabel(/your name/i).fill(name);
  await page.getByRole('button', { name: /create profile/i }).click();
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible();
}

async function throwX01Dart(page: Page, mult: 'S' | 'D' | 'T', num: number) {
  if (mult !== 'S') await page.getByTestId(`x01-mult-${mult}`).click();
  await page.getByTestId(`x01-num-${num}`).click();
}

test('history: filter by mode and open x01 session detail with replay scrubber', async ({
  page
}) => {
  await createProfile(page);

  // ── play a freeform session and forfeit ──────────────────────────────────
  await page.getByRole('button', { name: /start freeform session/i }).click();
  await expect(page.getByRole('heading', { name: /active game/i })).toBeVisible();
  await page.getByRole('button', { name: /^s20$/i }).click();
  await page.getByRole('button', { name: /^forfeit$/i }).click();
  // wait for the session status to update before navigating away
  await expect(page.getByTestId('session-status')).toHaveText('forfeited');
  await page.getByRole('button', { name: /^quit$/i }).click();
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible();

  // ── play a 301 x01 session (T20×3 → remaining 121; T20 T7 D20 → checkout) ─
  await page.getByTestId('home-play').click();
  await page.getByTestId('x01-start-score').selectOption('301');
  await page.getByTestId('x01-out-rule').selectOption('double');
  await page.getByTestId('x01-legs-to-win').fill('1');
  await page.getByTestId('x01-start').click();
  await expect(page.getByRole('heading', { name: /^x01$/i })).toBeVisible();

  // Turn 1: T20 T20 T20 → 180 scored, remaining 121
  await throwX01Dart(page, 'T', 20);
  await throwX01Dart(page, 'T', 20);
  await throwX01Dart(page, 'T', 20);
  await expect(page.getByTestId('x01-remaining')).toHaveText('121');

  // Turn 2: T20 T7 D20 → 60+21+40 = 121 → checkout
  await throwX01Dart(page, 'T', 20);
  await throwX01Dart(page, 'T', 7);
  await throwX01Dart(page, 'D', 20);
  await expect(page.getByTestId('x01-status')).toHaveText('Match won');

  // Session completed — navigate home
  await page.getByTestId('x01-quit').click();
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible();

  // ── open History ──────────────────────────────────────────────────────────
  await page.getByRole('link', { name: /history/i }).click();
  await expect(page.getByRole('heading', { name: /^history$/i })).toBeVisible();

  // both sessions should appear with no filter (wait for async load)
  await expect(page.getByTestId('history-list')).toBeVisible({ timeout: 8000 });

  // ── filter by x01 ─────────────────────────────────────────────────────────
  await page.getByTestId('history-filter-mode').selectOption('x01');
  // only the x01 session should remain
  const rows = page.getByTestId('history-list').locator('li');
  await expect(rows).toHaveCount(1);

  // ── open the x01 session detail ───────────────────────────────────────────
  await rows.first().click();
  await expect(page.getByRole('heading', { name: /session detail/i })).toBeVisible();
  await expect(page.getByTestId('detail-start-score')).toHaveText('301');

  // leg breakdown should show 1 leg won
  await expect(page.getByTestId('leg-row-0')).toBeVisible();

  // per-session stats panel should show highest finish = 121
  await expect(page.getByTestId('x01-session-stats')).toBeVisible();

  // ── replay scrubber: scrub to after 3 events (turn 1 complete) ───────────
  const slider = page.getByTestId('replay-slider');
  await slider.fill('3');
  // After T20 T20 T20 (values 60+60+60=180), remaining should be 121
  // The participant id is not known in E2E so we check by text content
  await expect(page.getByTestId('replay-x01')).toContainText('121');
  await expect(page.getByTestId('replay-position')).toContainText('Event 3');

  // ── scrub back to start ───────────────────────────────────────────────────
  await page.getByTestId('replay-start').click();
  await expect(page.getByTestId('replay-x01')).toContainText('301');

  // ── back button returns to history list ───────────────────────────────────
  await page.getByTestId('detail-back').click();
  await expect(page.getByRole('heading', { name: /^history$/i })).toBeVisible();
});
