import { expect, test } from "@playwright/test";

test("service times, checkout, and confirmed booking", async ({ page }) => {
  await page.goto("http://127.0.0.1:3403/");
  await expect(page.getByRole("heading", { level: 1, name: "Counsel" })).toBeVisible();
  await page.getByRole("link", { name: /Letter Review/ }).click();
  await page.getByRole("link", { name: /Hold / }).first().click();
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Complete test payment" }).click();
  await expect(page.getByRole("status")).toContainText("Booking confirmed");
});
