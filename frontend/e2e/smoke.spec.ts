import { test, expect } from "@playwright/test";

test("app loads login page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Mevest/i)).toBeVisible({ timeout: 10000 });
});

test("navigates to auth when not authenticated", async ({ page }) => {
  await page.goto("/");
  // Should show sign-in form when no session
  await expect(page.getByRole("button", { name: /Sign In/i }).first()).toBeVisible({ timeout: 10000 });
});
