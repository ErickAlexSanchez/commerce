import { expect, test } from "@playwright/test";

test("catalog, checkout island, and paid order", async ({ page }) => {
  await page.goto("http://127.0.0.1:3402/");
  await expect(page.getByRole("heading", { level: 1, name: "Vesper" })).toBeVisible();
  await page.getByRole("link", { name: /Aster Signet/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Aster Signet" })).toBeVisible();
  await page.getByRole("link", { name: "Checkout" }).click();
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Complete test payment" }).click();
  await expect(page.getByRole("status")).toContainText("Order paid");
});
