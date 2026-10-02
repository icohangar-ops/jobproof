import type { Job, JobDraft } from "@/lib/types";

export type JobValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validateJobDraft(draft: JobDraft): JobValidation {
  const name = draft.customerName.trim();
  if (!name) {
    return { ok: false, error: "Add a customer name so the proof has a title." };
  }
  if (name.length > 120) {
    return { ok: false, error: "Keep the customer name under 120 characters." };
  }
  if ((draft.address ?? "").trim().length > 200) {
    return { ok: false, error: "Keep the address under 200 characters." };
  }
  if (draft.date && !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
    return { ok: false, error: "Use a real job date." };
  }
  return { ok: true };
}

export function createJobRecord(draft: JobDraft, now = new Date()): Job {
  const validation = validateJobDraft(draft);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  const iso = now.toISOString();
  const date =
    draft.date && /^\d{4}-\d{2}-\d{2}$/.test(draft.date)
      ? draft.date
      : iso.slice(0, 10);
  return {
    id: crypto.randomUUID(),
    customerName: draft.customerName.trim(),
    address: (draft.address ?? "").trim(),
    date,
    notes: "",
    voiceTranscript: "",
    voiceId: null,
    status: "open",
    shareToken: null,
    beforeCount: 0,
    afterCount: 0,
    proofAid: null,
    createdAt: iso,
    updatedAt: iso,
  };
}

export function generateShareToken(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function compareJobs(a: Job, b: Job): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}
