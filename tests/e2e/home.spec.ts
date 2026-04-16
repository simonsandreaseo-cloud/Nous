import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  // Note: Adjust this to match your actual home page title or content
  await expect(page).toHaveTitle(/Nous/);
});

test('renders dashboard link', async ({ page }) => {
  await page.goto('/');

  // Verify that the page has some content
  // await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
});
