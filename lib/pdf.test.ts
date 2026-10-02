import { describe, expect, it } from "vitest";
import { buildJobProofPdf } from "@/lib/pdf";
import type { JobProofPdfInput } from "@/lib/types";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function sample(overrides: Partial<JobProofPdfInput> = {}): JobProofPdfInput {
  return {
    companyName: "Harbor Lane Services",
    phone: "555-0148",
    email: "jobs@harborlane.example",
    license: "Lic. HL-204",
    customerName: "Cedar Street kitchen",
    address: "418 Cedar Street",
    jobDate: "2026-04-02",
    notes: "Resealed the sink edge after the tile set.",
    voiceTranscript: "Silicone needs a full day before anyone wipes it.",
    before: [],
    after: [],
    generatedAt: "2026-04-02T19:30:00.000Z",
    ...overrides,
  };
}

describe("buildJobProofPdf", () => {
  it("writes a branded proof with the job note", () => {
    const bytes = buildJobProofPdf(sample(), { compress: false });
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw.startsWith("%PDF")).toBe(true);
    expect(raw).toContain("Harbor Lane Services");
    expect(raw).toContain("Cedar Street kitchen");
    expect(raw).toContain("Resealed the sink edge after the tile set.");
    expect(raw).toContain("Silicone needs a full day before anyone wipes it.");
    expect(raw).toContain("PROOF OF WORK");
  });

  it("embeds before and after photos", () => {
    const photo = {
      dataUrl: TINY_PNG,
      width: 1,
      height: 1,
      createdAt: "2026-04-02T19:00:00.000Z",
    };
    const bytes = buildJobProofPdf(
      sample({ before: [photo], after: [photo], notes: "", voiceTranscript: "" }),
      { compress: true },
    );
    expect(bytes.byteLength).toBeGreaterThan(800);
    expect(Buffer.from(bytes.subarray(0, 4)).toString()).toBe("%PDF");
  });

  it("badges a thin proof and an overridden proof", () => {
    const bytes = buildJobProofPdf(
      sample({
        decisionAidLine:
          "Decision aid: completeness 2 of 5. The contractor overrode the check. Contractor proof check only, not a safety determination.",
      }),
      { compress: false },
    );
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("Decision aid: completeness 2 of 5.");
    expect(raw).toContain("The contractor overrode the check.");
    expect(raw).toContain("not a safety");
    expect(raw).toContain("determination.");
    expect(raw).not.toContain("guaranteed");
  });

  it("still builds a proof when the company name is blank", () => {
    const bytes = buildJobProofPdf(sample({ companyName: "  " }), { compress: false });
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("JobProof");
  });
});
