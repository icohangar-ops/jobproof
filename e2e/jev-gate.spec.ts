import { expect, test } from "@playwright/test";

test("a primary low score pauses the PDF until override", async ({ page }) => {
  await page.route("**/api/jev", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}") as {
      state?: { photos?: Array<{ id: string; slot: "before" | "after" }> };
    };
    const posted = payload.state ?? { photos: [] };
    const photos = (posted.photos ?? []).map((photo) => ({
      id: photo.id,
      slot: photo.slot,
      role: photo.slot,
      probabilities: { before: 0.7, after: 0.1, detail: 0.1, irrelevant: 0.1 },
      confidence: 0.9,
    }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        source: "jev",
        model: "jev-1.13.0",
        calibrated: true,
        completeness: 2,
        completenessRaw: 1,
        completenessConfidence: 0.91,
        completenessProbabilities: { "0": 0.04, "1": 0.86, "2": 0.06, "3": 0.03, "4": 0.01 },
        enoughForPdf: 0.22,
        sameSite: null,
        photos,
        stateKey: JSON.stringify(posted),
        evaluatedAt: "2026-04-02T19:00:00.000Z",
        authority: "jev",
        appliedPdf: "override",
        overrideReason: "incomplete",
        note: "Completeness is under 3 of 5, so the PDF waits for an override. This is proof completeness, not a safety determination.",
        primary: true,
      }),
    });
  });

  await page.goto("/jobs/new");
  await page.getByLabel("Customer name").fill("Oak Ave bath");
  await page.getByRole("button", { name: "Create job" }).click();
  await expect(page.getByRole("heading", { name: "Oak Ave bath" })).toBeVisible();
  await page.getByLabel("Job notes").fill("Replaced the valve and wiped the cabinet.");
  await page.getByLabel("Before library").setInputFiles("e2e/fixtures/tile.png");

  const download = page.getByRole("button", { name: "Download PDF" });
  await expect(download).toBeDisabled();
  await expect(page.getByRole("region", { name: "Decision aid" }).getByText("Calibrated confidence 91%")).toBeVisible();

  await page.getByRole("button", { name: "Override" }).click();
  await expect(download).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await download.click();
  const file = await downloadPromise;
  expect(file.suggestedFilename()).toContain("JobProof-oak-ave-bath");
});
