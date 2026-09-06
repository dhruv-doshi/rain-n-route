import { test, expect } from '@playwright/test';

test('explore page supports topic deep link and search', async ({ page }) => {
  await page.goto('/explore?topic=transit');
  await expect(page.getByRole('heading', { name: /explore bengaluru/i })).toBeVisible();
  await expect(page.getByLabel(/what to explore/i)).toHaveValue('transit');
  await expect(page.getByText(/namma metro stations and major bmtc interchanges/i)).toBeVisible();

  await page.getByLabel(/search places/i).fill('cubbon park');
  await page.getByRole('option', { name: /place story · cubbon park sits/i }).click();
  await expect(page.getByLabel(/what to explore/i)).toHaveValue('stories');
});

test('explore works without network APIs', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/explore?topic=stories');
  await expect(page.getByLabel(/place story/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /explore bengaluru/i })).toBeVisible();
});
