import { expect, test } from '@playwright/test';

test('system evidence is explicitly confirmed, stays across reloads and becomes outdated after edits', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/wizard');
  await page.getByRole('button', { name: 'Paste a list' }).click();
  await page.getByLabel('Software, spreadsheets or other systems').fill('Xero');
  await page.getByRole('button', { name: /add 1 system to the map/i }).click();
  await page.waitForTimeout(750);
  await page.goto('/view/systems');
  await expect(page.getByText('Not yet checked')).toBeVisible();
  await page.getByRole('button', { name: 'Edit Xero' }).click();
  await page.getByRole('textbox', { name: 'Checked by' }).fill('Alex');
  await page.getByRole('combobox', { name: 'Evidence source' }).selectOption('finance_records');
  await page.getByRole('checkbox', { name: /i have checked this system record/i }).check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Recently checked')).toBeVisible();
  await page.waitForTimeout(750);
  await page.reload();
  await expect(page.getByText('Recently checked')).toBeVisible();

  await page.getByRole('button', { name: 'Edit Xero' }).click();
  await page.getByRole('textbox', { name: 'Supplier' }).fill('Changed provider');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Not yet checked')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
