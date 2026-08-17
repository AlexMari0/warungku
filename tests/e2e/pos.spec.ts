import { test, expect } from '@playwright/test';

test.describe('POS Kasir Digital UI Verification', () => {
  test('should load home page and navigate to POS successfully', async ({ page }) => {
    // Navigate to local dev server
    await page.goto('/');

    // 1. Handle Login (Wait for URL to be /login since we are redirected)
    await expect(page).toHaveURL(/\/login/);
    
    // Wait for hydration
    await page.waitForLoadState('networkidle');

    // Fill credentials using generic test account
    await page.fill('input[type="email"]', 'test_1779208029340@warungku.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    
    // Click submit
    await page.click('button[type="submit"]');

    // 2. Wait for redirect to home
    await expect(page).toHaveURL('http://localhost:3000/');

    // Wait for the app shell and logo text to be visible
    const title = page.locator('text=WarungKu').first();
    await expect(title).toBeVisible();

    // Click the "Kasir Digital" menu item on the Sidebar
    const posLink = page.locator('a:has-text("Kasir Digital")').first();
    await expect(posLink).toBeVisible();
    await posLink.click();

    // Verify the URL navigates to /pos
    await expect(page).toHaveURL(/\/pos/);

    // Verify the POS layout has loaded (keranjang / cart section)
    const cartHeader = page.locator('text=Keranjang').first();
    await expect(cartHeader).toBeVisible();
  });
});
