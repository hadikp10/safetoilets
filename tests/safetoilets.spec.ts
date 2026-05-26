import { test, expect } from "@playwright/test";

test.describe("SafeToilets E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local development server
    await page.goto("http://localhost:3000/");
  });

  test("1. Direct map landing page loads correctly with branding", async ({ page }) => {
    // Verify header branding
    await expect(page.locator("header")).toContainText("SafeToilets");
    
    // Check that Login button is a link that points to /login
    const loginLink = page.locator("header a:has-text('Login')");
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/login");
  });

  test("2. Navigation to Login Page renders Google authentication", async ({ page }) => {
    // Navigate to Login Page
    await page.goto("http://localhost:3000/login");
    
    // Verify brand icon & heading
    await expect(page.locator(".text-4xl")).toContainText("SafeToilets");
    await expect(page.locator("p").first()).toContainText("Help Kerala find clean toilets");
    
    // Check Google Auth button is present
    await expect(page.locator("button:has-text('Continue with Google')")).toBeVisible();
    
    // Check guidelines note is present
    await expect(page.locator("text=By continuing you agree to our community guidelines")).toBeVisible();
    
    // Ensure email/password inputs are NOT present (Google only)
    await expect(page.locator("input[type='email']")).not.toBeVisible();
    await expect(page.locator("input[type='password']")).not.toBeVisible();
  });

  test("3. Leaflet map container loads immediately on home page", async ({ page }) => {
    // Check if map container is mounted on load
    await expect(page.locator(".leaflet-container")).toBeVisible();
    
    // Check if CartoDB tile layer attribution is present (Positron/Dark Matter tiles check)
    await expect(page.locator(".leaflet-control-attribution")).toContainText("CARTO");
  });
});
