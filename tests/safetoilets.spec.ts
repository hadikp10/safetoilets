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

  test("2. Navigation to Login Page renders all authentication options", async ({ page }) => {
    // Navigate to Login Page
    await page.goto("http://localhost:3000/login");
    
    // Verify brand icon & heading
    await expect(page.locator("h1")).toContainText("SafeToilets");
    await expect(page.locator("p.text-xs").first()).toContainText("Crowdsourced clean toilet locator");
    
    // Check Google Auth button is present
    await expect(page.locator("button:has-text('Continue with Google')")).toBeVisible();
    
    // Check Email & Password fields are present
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    
    // Check Toggle button works
    const toggleBtn = page.locator("button:has-text('Need an account? Sign Up')");
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    
    // Verify Full Name input appears in Sign Up mode
    await expect(page.locator("input[placeholder='e.g. John Doe']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toContainText("Create Account");
  });

  test("3. Leaflet map container loads immediately on home page", async ({ page }) => {
    // Check if map container is mounted on load
    await expect(page.locator(".leaflet-container")).toBeVisible();
    
    // Check if CartoDB tile layer attribution is present (Positron/Dark Matter tiles check)
    await expect(page.locator(".leaflet-control-attribution")).toContainText("CARTO");
  });
});
