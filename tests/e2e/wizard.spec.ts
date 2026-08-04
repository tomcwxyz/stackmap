import { test, expect, type Page } from '@playwright/test';

/**
 * A walk through the function-first path, which is the route most people take.
 *
 * These tests deliberately drive the app the way a user does — clicking through
 * real navigation rather than calling into the store — because the bugs this
 * suite exists to catch were all in the seams between steps.
 */

async function fillOrganisation(page: Page, orgName: string) {
  await page.goto('/wizard');

  // Size first: naming the organisation collapses the form to a summary card
  await page.getByLabel('Organisation size').selectOption('small');

  const name = page.getByLabel('Organisation name');
  await name.fill(orgName);
  // The name is only committed when the field loses focus
  await name.blur();
}

async function startWizard(page: Page, orgName = 'Sunrise Trust') {
  await fillOrganisation(page, orgName);

  const path = page.getByRole('button', { name: /start with what we do/i });
  // Stays disabled until the organisation has a name
  await expect(path).toBeEnabled();
  await path.click();

  await expect(page.getByRole('heading', { name: /assess technology risk/i })).toBeVisible();
}

async function skipRiskAssessment(page: Page) {
  await page.getByRole('button', { name: /no, skip this/i }).click();
  await expect(page.getByRole('heading', { name: /what does your organisation do/i })).toBeVisible();
}

async function pickFunctions(page: Page, names: string[]) {
  for (const name of names) {
    await page.getByRole('checkbox', { name: new RegExp(name, 'i') }).check();
  }
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.waitForURL('**/wizard/functions/systems');
  await expect(page.getByRole('heading', { name: /what software do you use/i })).toBeVisible();
}

/** The list of systems already added, as opposed to the suggestion chips. */
function addedSystems(page: Page) {
  return page.getByRole('list').filter({ has: page.getByRole('listitem') }).last();
}

async function addSystem(page: Page, name: string) {
  await page.getByLabel('System name').fill(name);
  await page.getByRole('button', { name: /^add system$/i }).click();
  await expect(page.getByRole('heading', { name: /added systems/i })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

test.describe('the wizard', () => {
  test('takes an organisation from nothing to a finished map', async ({ page }) => {
    await startWizard(page);
    await skipRiskAssessment(page);
    await pickFunctions(page, ['Finance']);

    await addSystem(page, 'Xero');

    await page.goto('/wizard/functions/review');
    await expect(page.getByRole('heading', { name: /technology map for sunrise trust/i })).toBeVisible();
    await expect(page.getByText('Xero').first()).toBeVisible();
  });

  test('keeps what was entered when a step is revisited', async ({ page }) => {
    await startWizard(page);
    await skipRiskAssessment(page);
    await pickFunctions(page, ['Finance']);

    await addSystem(page, 'Xero');

    // Leave and come back the way the stepper invites
    await page.goto('/wizard/functions');
    await page.goto('/wizard/functions/systems');

    await expect(page.getByRole('heading', { name: /added systems/i })).toBeVisible();
    await expect(page.getByText('Xero', { exact: true })).toBeVisible();
  });

  test('survives a page reload', async ({ page }) => {
    await startWizard(page);
    await skipRiskAssessment(page);
    await pickFunctions(page, ['Finance']);

    await addSystem(page, 'Xero');

    await page.reload();

    await expect(page.getByRole('heading', { name: /added systems/i })).toBeVisible();
    await expect(page.getByText('Xero', { exact: true })).toBeVisible();
  });

  test('remembers the organisation across a reload', async ({ page }) => {
    await startWizard(page, 'Harbour Advice');

    await page.goto('/wizard');
    await page.reload();

    await expect(page.getByText(/harbour advice/i).first()).toBeVisible();
  });

  test('does not lose a change made immediately before a reload', async ({ page }) => {
    await fillOrganisation(page, 'Quick Typist');

    // No pause: the write is debounced, so this is the race
    await page.reload();

    await expect(page.getByText(/quick typist/i).first()).toBeVisible();
  });

  test('adds a system on the first click, without the form shifting underneath', async ({
    page,
  }) => {
    await startWizard(page);
    await skipRiskAssessment(page);
    await pickFunctions(page, ['Finance']);

    // Xero is in the known tools database, so leaving the name field shows a
    // cost breakdown — which must not move the button being clicked
    await addSystem(page, 'Xero');
  });
});

test.describe('data and integrations steps', () => {
  test('keeps data categories when leaving without pressing Continue', async ({ page }) => {
    await startWizard(page);
    await skipRiskAssessment(page);
    await pickFunctions(page, ['Finance']);

    await addSystem(page, 'Xero');

    await page.goto('/wizard/functions/data');
    await page.getByRole('button', { name: 'Financial Transactions' }).click();
    await page.getByRole('button', { name: /add data category/i }).click();
    await expect(page.getByText(/data categories added/i)).toBeVisible();

    // Navigate away by URL rather than the Continue button, then return
    await page.goto('/wizard/functions/systems');
    await page.goto('/wizard/functions/data');

    await expect(page.getByText(/data categories added/i)).toBeVisible();
  });
});

test.describe('the systems inventory', () => {
  test('edits a system without going back through the wizard', async ({ page }) => {
    await startWizard(page);
    await skipRiskAssessment(page);
    await pickFunctions(page, ['Finance']);

    await addSystem(page, 'Xero');

    await page.goto('/view/systems');
    await expect(page.getByRole('heading', { name: /your systems/i })).toBeVisible();

    await page.getByRole('button', { name: /edit xero/i }).click();
    await page.getByLabel(/^status/i).selectOption('retiring');
    await page.getByRole('button', { name: /save changes/i }).click();

    const statusCell = page.getByRole('cell', { name: 'Retiring' });
    await expect(statusCell).toBeVisible();

    // And it is still retiring after a reload
    await page.reload();
    await expect(statusCell).toBeVisible();
  });

  test('deletes a system once confirmed', async ({ page }) => {
    await startWizard(page);
    await skipRiskAssessment(page);
    await pickFunctions(page, ['Finance']);

    await addSystem(page, 'Xero');

    await page.goto('/view/systems');
    await page.getByRole('button', { name: /delete xero/i }).click();
    await page.getByRole('button', { name: /yes, delete it/i }).click();

    await expect(page.getByRole('heading', { name: /no systems yet/i })).toBeVisible();
  });
});

test.describe('starting fresh', () => {
  test('clears the map on confirmation', async ({ page }) => {
    await startWizard(page);
    await skipRiskAssessment(page);
    await pickFunctions(page, ['Finance']);

    await addSystem(page, 'Xero');

    await page.goto('/wizard');
    await page.getByRole('button', { name: /start fresh/i }).click();
    await page.getByRole('button', { name: /yes, clear everything/i }).click();

    await page.goto('/view/systems');
    await expect(page.getByRole('heading', { name: /no systems yet/i })).toBeVisible();
  });
});
