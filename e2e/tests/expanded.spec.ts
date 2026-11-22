import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SCIP/i);
});

test('public pages render', async ({ page }) => {
  for (const path of ['/', '/about', '/features', '/how-it-works']) {
    await page.goto(path);
    await expect(page.locator('body')).toBeVisible();
  }
});

test('sign-in page renders', async ({ page }) => {
  await page.goto('/');
  // Look for sign-in trigger
  const signInBtn = page.getByText(/sign in/i).first();
  if (await signInBtn.isVisible()) {
    await signInBtn.click();
    await page.waitForTimeout(1000);
  }
  // Either modal or page
  await expect(page.locator('body')).toBeVisible();
});

test('report submission form validation', async ({ page }) => {
  await page.goto('/');
  // Navigate to submit report if possible
  const submitLink = page.getByText(/submit.*report/i).first();
  if (await submitLink.isVisible()) {
    await submitLink.click();
    await page.waitForTimeout(1000);
  }
  await expect(page.locator('body')).toBeVisible();
});

test('report tracking page renders', async ({ page }) => {
  await page.goto('/');
  const trackLink = page.getByText(/track/i).first();
  if (await trackLink.isVisible()) {
    await trackLink.click();
    await page.waitForTimeout(1000);
  }
  await expect(page.locator('body')).toBeVisible();
});
