import { expect, test } from "@playwright/test";

test("write landing and job screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Prove the work. Get paid." })).toBeVisible();
  await page.screenshot({ path: "docs/landing.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jobs");
  await page.getByRole("button", { name: "Load a sample job" }).click();
  await expect(page.getByRole("heading", { name: "Cedar Street kitchen" })).toBeVisible();
  await expect(page.getByAltText("Before photo 1")).toBeVisible();
  await page.screenshot({ path: "docs/job-detail.png" });
});
