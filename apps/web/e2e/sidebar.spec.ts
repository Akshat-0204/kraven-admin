import { expect, test } from '@playwright/test';

test('protected app redirects unauthenticated visitors to login', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Kraven' })).toBeVisible();
  await expect(page.getByText('Private admin')).toBeVisible();
});
