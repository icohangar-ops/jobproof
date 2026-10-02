import { expect, test } from "@playwright/test";

test("create a job, add a photo, and download a proof", async ({ page }) => {
  await page.goto("/jobs/new");
  await page.getByLabel("Customer name").fill("Miller Kitchen");
  await page.getByLabel("Address").fill("12 Oak Ave");
  await page.getByRole("button", { name: "Create job" }).click();

  await expect(page.getByRole("heading", { name: "Miller Kitchen" })).toBeVisible();
  await page.getByLabel("Job notes").fill("Replaced the disposal and checked the leak.");
  await page.getByLabel("Before library").setInputFiles("e2e/fixtures/tile.png");
  await expect(page.getByAltText("Before photo 1")).toBeVisible();

  const aid = page.getByRole("region", { name: "Decision aid" });
  await expect(aid).toBeVisible();
  await expect(aid.getByText("Local heuristic")).toBeVisible();
  await expect(aid.getByText("Needs more")).toBeVisible();
  await expect(aid.getByText(/does not see the photos/)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("JobProof-miller-kitchen");

  await page.getByRole("button", { name: "Copy share link" }).click();
  const share = page.getByLabel("Share link");
  await expect(share).toBeVisible();
  const url = await share.inputValue();
  expect(url).toContain("/share/");

  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Miller Kitchen" })).toBeVisible();
  await expect(page.getByText("Replaced the disposal and checked the leak.")).toBeVisible();
  await expect(page.getByAltText("Before photo 1")).toBeVisible();

  await page.goto("/jobs");
  await expect(page.getByRole("link", { name: /Miller Kitchen/ })).toContainText("Needs more");
});
