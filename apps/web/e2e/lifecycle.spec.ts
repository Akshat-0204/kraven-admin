import { expect, type Page, test } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL_1;
const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD_1;

test.skip(true, 'Lifecycle end-to-end test skipped by request');

test('lead to dashboard lifecycle', async ({ page }) => {
  test.setTimeout(120000);

  const stamp = Date.now();
  const companyName = `Phase 8 Client ${stamp}`;
  const contactName = `Phase 8 Contact ${stamp}`;
  const projectName = `Phase 8 Project ${stamp}`;
  const invoiceNumber = `P8-${stamp}`;

  await page.goto('/');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  const dashboardResponse = page.waitForResponse(
    (response) => response.url().includes('/dashboard/summary') && response.status() === 200
  );
  await page.getByRole('button', { name: 'Log in' }).click();
  await dashboardResponse;
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30000 });

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Leads' }).click();
  await page.getByRole('button', { name: 'New lead' }).click();
  await page.getByLabel('Contact name').fill(contactName);
  await page.getByLabel('Company').fill(companyName);
  await page.getByLabel('Email').fill(`phase8-${stamp}@example.com`);
  await page.getByLabel('Estimated value').fill('12000');
  await page.getByLabel('Status').selectOption('Won');
  await page.getByRole('button', { name: 'Save lead' }).click();
  await expect(page.getByText(companyName)).toBeVisible();

  await page.getByText(companyName).click();
  const convertResponse = page.waitForResponse(
    (response) => response.url().includes('/convert') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Convert to Client' }).click();
  expect((await convertResponse).ok()).toBe(true);
  await expect(page).toHaveURL(/\/clients\/[a-f0-9]+/);

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Clients' }).click();
  await expect(page).toHaveURL('/clients');
  await page.getByPlaceholder('Search by company, contact, email').fill(companyName);
  await expect(page.getByRole('heading', { name: companyName, level: 2 })).toBeVisible();

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Projects' }).click();
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Project name').fill(projectName);
  await page.getByLabel('Find client').fill(companyName);
  await selectOptionContaining(page, 'Client', companyName);
  await page.getByLabel('Project value').fill('12000');
  await page.getByLabel('Status').selectOption('In Progress');
  await page.getByLabel('Progress').fill('40');
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByText(projectName)).toBeVisible();

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Invoices / Payments' }).click();
  await page.getByRole('button', { name: 'New invoice' }).click();
  await selectOptionContaining(page, 'Client', companyName);
  await selectOptionContaining(page, 'Project', projectName);
  await page.getByLabel('Invoice number').fill(invoiceNumber);
  await page.getByLabel('Amount').fill('12000');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await expect(page.getByText(invoiceNumber)).toBeVisible();

  const invoiceRow = page.getByRole('row').filter({ hasText: invoiceNumber });
  await invoiceRow.getByRole('button', { name: 'Pay' }).click();
  await page.getByLabel('Amount').fill('4000');
  await page.getByLabel('Method').fill('Bank transfer');
  await page.getByLabel('Transaction reference').fill(`TXN-${stamp}`);
  await page.getByRole('button', { name: 'Record' }).click();
  await expect(invoiceRow).toContainText('Partially Paid');

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Dashboard' }).click();
  expect((await page.waitForResponse((response) => response.url().includes('/dashboard/summary'))).ok()).toBe(true);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30000 });
  await page.locator('aside').getByPlaceholder('Search leads, clients, projects, invoices').fill(companyName);
  await expect(page.getByRole('link', { name: new RegExp(companyName) }).first()).toBeVisible();
});

async function selectOptionContaining(page: Page, label: string, text: string) {
  const select = page.getByLabel(label, { exact: true });
  await expect
    .poll(async () => (await select.locator('option').allTextContents()).some((option) => option.includes(text)))
    .toBe(true);
  const value = await select.locator('option').filter({ hasText: text }).first().getAttribute('value');
  expect(value).toBeTruthy();
  await select.selectOption(value!);
}
