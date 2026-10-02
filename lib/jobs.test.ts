import { describe, expect, it } from "vitest";
import { createJobRecord, generateShareToken, validateJobDraft } from "@/lib/jobs";

describe("validateJobDraft", () => {
  it("requires a customer name", () => {
    expect(validateJobDraft({ customerName: "   " })).toEqual({
      ok: false,
      error: "Add a customer name so the proof has a title.",
    });
  });

  it("accepts a name, optional address, and date", () => {
    expect(
      validateJobDraft({
        customerName: "Cedar Street kitchen",
        address: "418 Cedar Street",
        date: "2026-04-02",
      }),
    ).toEqual({ ok: true });
  });
});

describe("createJobRecord", () => {
  it("trims fields and starts the job open", () => {
    const job = createJobRecord(
      {
        customerName: "  Miller Kitchen  ",
        address: " 12 Oak Ave ",
        date: "2026-03-18",
      },
      new Date("2026-03-18T15:04:00.000Z"),
    );
    expect(job.customerName).toBe("Miller Kitchen");
    expect(job.address).toBe("12 Oak Ave");
    expect(job.date).toBe("2026-03-18");
    expect(job.status).toBe("open");
    expect(job.beforeCount).toBe(0);
    expect(job.afterCount).toBe(0);
    expect(job.proofAid).toBeNull();
    expect(job.shareToken).toBeNull();
    expect(job.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("refuses an empty name", () => {
    expect(() => createJobRecord({ customerName: " " })).toThrow(/customer name/i);
  });
});

describe("generateShareToken", () => {
  it("returns a 16-character hex token", () => {
    const token = generateShareToken();
    expect(token).toMatch(/^[0-9a-f]{16}$/);
    expect(generateShareToken()).not.toBe(token);
  });
});
