import { test, expect } from '@playwright/test';

test('mobile map starts in a searchable, readable system browser', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/wizard');
  await page.getByRole('button', { name: 'Paste a list' }).click();
  await page.getByLabel('Software, spreadsheets or other systems')
    .fill('Xero\nMicrosoft 365\nCustom volunteer spreadsheet');
  await page.getByRole('button', { name: /add 3 systems to the map/i }).click();
  await expect(page.getByText(/3 systems added/i)).toBeVisible();
  await page.waitForTimeout(750);

  await page.goto('/view/diagram');
  await expect(page.getByTestId('mobile-architecture-explorer')).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Find a system' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inspect Xero' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Interactive architecture map' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.getByRole('searchbox', { name: 'Find a system' }).fill('xero');
  await expect(page.getByRole('button', { name: 'Inspect Xero' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inspect Microsoft 365' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Inspect Xero' }).click();
  await expect(page.getByRole('heading', { name: 'What if this system were unavailable?' })).toBeVisible();
  await page.getByRole('button', { name: '← Back to systems' }).click();

  await page.getByRole('button', { name: 'Full network' }).click();
  const map = page.getByRole('region', { name: 'Interactive architecture map' });
  await expect(map).toBeVisible();
  expect(await map.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Inspect Xero' }).click();
  await expect(page.getByRole('button', { name: '← Back to network' })).toBeVisible();
});
