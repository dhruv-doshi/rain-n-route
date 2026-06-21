import { test, expect } from '@playwright/test';

/**
 * Full planner flow E2E tests — all run in mock mode.
 * The webServer env in playwright.config.ts sets NEXT_PUBLIC_USE_MOCK_SERVICES=true,
 * so no real Google API keys are required.
 *
 * Validates: Requirements 1.2, 1.3, 12.2, 13.3, 13.4
 */

test.describe('Planner Flow (mock mode)', () => {
  test('Home page loads with From/To form and no dashboard navigation', async ({ page }) => {
    await page.goto('/');

    // Verify heading is visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Plan your commute')).toBeVisible();

    // Verify From/To form is visible
    await expect(page.getByRole('form', { name: /trip planner/i })).toBeVisible();
    await expect(page.getByPlaceholder('Search starting point…')).toBeVisible();
    await expect(page.getByPlaceholder('Search destination…')).toBeVisible();

    // Verify no dashboard link in header (Requirement 1.6)
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: /dashboard/i })).not.toBeVisible();
  });

  test('/dashboard returns 404', async ({ page }) => {
    const response = await page.goto('/dashboard');

    // Verify HTTP 404 status
    expect(response?.status()).toBe(404);

    // Verify the page shows a not-found indicator
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });

  test('User searches and selects From and To locations via autocomplete', async ({ page }) => {
    await page.goto('/');

    // Type 3+ characters in From field to trigger autocomplete
    const fromInput = page.getByPlaceholder('Search starting point…');
    await fromInput.focus();
    await fromInput.fill('Indi');

    // Wait for suggestions dropdown to appear
    const fromListbox = page.getByRole('listbox', { name: /from suggestions/i });
    await expect(fromListbox).toBeVisible();

    // Select first suggestion
    const firstFromOption = fromListbox.getByRole('option').first();
    await expect(firstFromOption).toBeVisible();
    await firstFromOption.click();

    // Verify the From field shows the selected location (value is set)
    await expect(page.getByText('Indiranagar')).toBeVisible();

    // Type 3+ characters in To field to trigger autocomplete
    const toInput = page.getByPlaceholder('Search destination…');
    await toInput.focus();
    await toInput.fill('Indi');

    // Wait for suggestions dropdown to appear
    const toListbox = page.getByRole('listbox', { name: /to suggestions/i });
    await expect(toListbox).toBeVisible();

    // Select first suggestion
    const firstToOption = toListbox.getByRole('option').first();
    await expect(firstToOption).toBeVisible();
    await firstToOption.click();

    // Verify the To field shows the selected location
    await expect(page.locator('text=Indiranagar').first()).toBeVisible();
  });

  test('User submits and receives multiple route options', async ({ page }) => {
    await page.goto('/');

    // Complete the From/To selection flow
    const fromInput = page.getByPlaceholder('Search starting point…');
    await fromInput.focus();
    await fromInput.fill('Indi');
    const fromListbox = page.getByRole('listbox', { name: /from suggestions/i });
    await expect(fromListbox).toBeVisible();
    await fromListbox.getByRole('option').first().click();

    const toInput = page.getByPlaceholder('Search destination…');
    await toInput.focus();
    await toInput.fill('Indi');
    const toListbox = page.getByRole('listbox', { name: /to suggestions/i });
    await expect(toListbox).toBeVisible();
    await toListbox.getByRole('option').first().click();

    // Click "Plan my trip" button
    await page.getByRole('button', { name: /plan my trip/i }).click();

    // Should navigate to /trip/plan page
    await page.waitForURL('**/trip/plan**');

    // Wait for route cards to render (mock returns car, two_wheeler, transit, walk)
    await expect(page.getByRole('button', { name: /select/i }).first()).toBeVisible({
      timeout: 10000,
    });

    // Verify we have multiple route options displayed
    const selectButtons = page.getByRole('button', { name: /select/i });
    await expect(selectButtons).not.toHaveCount(0);
    const count = await selectButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Route cards display weather enrichment', async ({ page }) => {
    // Navigate directly to a trip plan page with valid coords
    await page.goto('/trip/plan?from=12.9784,77.6408,Indiranagar&to=12.9698,77.7499,Whitefield');

    // Wait for route cards to load
    await expect(page.getByRole('button', { name: /select/i }).first()).toBeVisible({
      timeout: 10000,
    });

    // Weather enrichment is loaded asynchronously — wait for weather risk badge or gear section
    // The WeatherRiskBadge renders a Badge with text like "Low weather risk" or similar
    const weatherIndicator = page.locator('text=/weather risk/i');
    // Wait with extended timeout since weather is fetched in background
    await expect(weatherIndicator.first()).toBeVisible({ timeout: 15000 });
  });

  test('Sort mode change re-orders route cards', async ({ page }) => {
    await page.goto('/trip/plan?from=12.9784,77.6408,Indiranagar&to=12.9698,77.7499,Whitefield');

    // Wait for route cards to load
    await expect(page.getByRole('button', { name: /select/i }).first()).toBeVisible({
      timeout: 10000,
    });

    // Helper to get current order of mode labels in route cards
    const getModeLabels = () =>
      page
        .locator('[class*="CardTitle"] span:last-child')
        .allTextContents()
        .then((labels) => labels.filter((l) => l.trim().length > 0));

    const initialOrder = await getModeLabels();
    expect(initialOrder.length).toBeGreaterThanOrEqual(2);

    // Switch to "Cheapest" sort tab
    await page.getByRole('tab', { name: /cheapest/i }).click();

    // Wait a moment for re-sort to take effect
    await page.waitForTimeout(300);

    const cheapestOrder = await getModeLabels();

    // The ordering should potentially differ (in mock mode, different sort modes
    // reorder cards differently). At minimum verify the tabs work without error.
    expect(cheapestOrder.length).toBeGreaterThanOrEqual(2);

    // Switch to "Eco" sort tab
    await page.getByRole('tab', { name: /eco/i }).click();
    await page.waitForTimeout(300);

    const ecoOrder = await getModeLabels();
    expect(ecoOrder.length).toBeGreaterThanOrEqual(2);

    // Verify that at least one sort mode changes the order compared to fastest
    const orderChanged =
      JSON.stringify(cheapestOrder) !== JSON.stringify(initialOrder) ||
      JSON.stringify(ecoOrder) !== JSON.stringify(initialOrder);
    expect(orderChanged).toBe(true);
  });

  test('User selects a route from the list', async ({ page }) => {
    await page.goto('/trip/plan?from=12.9784,77.6408,Indiranagar&to=12.9698,77.7499,Whitefield');

    // Wait for route cards to load
    await expect(page.getByRole('button', { name: /select/i }).first()).toBeVisible({
      timeout: 10000,
    });

    // Find a "Select" button (not already "Selected") and click it
    const selectButtons = page.getByRole('button', { name: 'Select', exact: true });
    const firstUnselected = selectButtons.first();
    await firstUnselected.click();

    // After clicking, it should show "Selected" state via aria-pressed or text
    // The card gets data-selected attribute and the button text changes to "Selected"
    await expect(page.getByRole('button', { name: 'Selected', exact: true })).toBeVisible();
  });

  test('Mobile map tab switch works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/trip/plan?from=12.9784,77.6408,Indiranagar&to=12.9698,77.7499,Whitefield');

    // Wait for route cards to load
    await expect(page.getByRole('button', { name: /select/i }).first()).toBeVisible({
      timeout: 10000,
    });

    // Verify List and Map tabs are visible on mobile
    const listTab = page.getByRole('tab', { name: /list/i });
    const mapTab = page.getByRole('tab', { name: /map/i });
    await expect(listTab).toBeVisible();
    await expect(mapTab).toBeVisible();

    // List tab should be active by default — route cards visible
    await expect(page.getByRole('button', { name: /select/i }).first()).toBeVisible();

    // Switch to Map tab
    await mapTab.click();

    // Verify the map area becomes visible (the route list is hidden)
    // The map container has aria-label="Map loading" initially or an application role
    const mapArea = page.locator(
      '[role="application"], [aria-label*="map" i], [aria-label="Map loading"]',
    );
    await expect(mapArea.first()).toBeVisible();

    // Switch back to List tab
    await listTab.click();
    await expect(page.getByRole('button', { name: /select/i }).first()).toBeVisible();
  });

  test('Share-trip button exists on trip plan page', async ({ page }) => {
    await page.goto('/trip/plan?from=12.9784,77.6408,Indiranagar&to=12.9698,77.7499,Whitefield');

    // Wait for route cards to load
    await expect(page.getByRole('button', { name: /select/i }).first()).toBeVisible({
      timeout: 10000,
    });

    // Verify the Share button is present
    const shareButton = page.getByRole('button', { name: /share/i });
    await expect(shareButton).toBeVisible();
  });
});
