import { test, expect } from '@playwright/test';

test('mobile actions are editable and survive a reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/wizard');
  await page.getByRole('button', { name: 'Paste a list' }).click();
  await page.getByLabel('Software, spreadsheets or other systems').fill('Xero\nMicrosoft 365');
  await page.getByRole('button', { name: /add 2 systems to the map/i }).click();
  await expect(page.getByText(/2 systems added/i)).toBeVisible();
  await page.waitForTimeout(750);
  await page.goto('/view/actions');
  await expect(page.getByRole('heading', { name: 'Your actions' })).toBeVisible();
  await page.getByRole('combobox', { name: /Progress for / }).first().selectOption('in_progress');
  await page.getByRole('textbox', { name: /Action owner for / }).first().fill('Alex');
  await page.getByRole('textbox', { name: /Notes for / }).first().fill('Follow up next week');
  await page.waitForTimeout(750);
  await page.reload();
  await expect(page.getByRole('combobox', { name: /Progress for / }).first()).toHaveValue('in_progress');
  await expect(page.getByRole('textbox', { name: /Action owner for / }).first()).toHaveValue('Alex');
  await expect(page.getByRole('textbox', { name: /Notes for / }).first()).toHaveValue('Follow up next week');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
