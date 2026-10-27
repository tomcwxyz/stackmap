import { test, expect } from '@playwright/test';

test('paste tools, explore a system and return to export diagrams', async ({ page }) => {
  await page.goto('/wizard');
  await page.getByRole('button', { name: 'Paste a list' }).click();
  await page.getByLabel('Software, spreadsheets or other systems')
    .fill('Xero\nMicrosoft 365');
  await expect(page.getByText(/2 new, 0 already in this map/)).toBeVisible();
  await page.getByRole('button', { name: /add 2 systems to the map/i }).click();
  await expect(page.getByText(/2 systems added/i)).toBeVisible();
  // The local, offline-first architecture store writes with a 500ms debounce.
  await page.waitForTimeout(750);

  await page.goto('/view/diagram');
  await expect(page.getByRole('heading', { name: 'Explore connections' })).toBeVisible();
  await page.getByRole('button', { name: 'Inspect Xero' }).click();
  await expect(page.getByRole('heading', { name: 'What if this system were unavailable?' })).toBeVisible();
  await expect(page.getByText('No named owner')).toBeVisible();

  await page.getByRole('button', { name: 'Export diagrams' }).click();
  await expect(page.getByRole('button', { name: 'Full diagram' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export as SVG' })).toBeVisible();
});
