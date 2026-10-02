import { JevParseError } from "@/lib/jev/parse";
import { choice, noul, score } from "@/lib/jev/questions";
import {
  PHOTO_ROLES,
  type Answer,
  type PhotoRole,
  type PhotoRoleAid,
  type PhotoSlot,
  type ProofPhotoState,
  type ProofReading,
  type ProofState,
  type Question,
  type SystemOneResponse,
} from "@/lib/jev/types";

export const DEFAULT_MODEL = "jev-1.13.0";
export const DEFAULT_URL = "https://thejevai.com/v1/systemone";

const NOTE_LIMIT = 1200;
const PHOTO_LIMIT = 16;
const ADDRESS_MIN = 4;

const ROLE_CRITERIA: Record<PhotoRole, string> = {
  before: "Starting condition. The contractor filed it in the before set, or the metadata fits a before photo.",
  after: "Finished work. The contractor filed it in the after set, or the metadata fits an after photo.",
  detail: "A close-up or extra angle, not the main before or after frame.",
  irrelevant: "Unlikely to help a customer proof: tiny, or not part of the work.",
};

const COMPLETENESS_CRITERIA = [
  "1 — Not a proof: no usable photos",
  "2 — Thin: missing a before or an after, or no note",
  "3 — Usable: at least one before, one after, and a short note",
  "4 — Solid: both sets and a specific note about the work",
  "5 — Ready: both sets, a specific note, and no metadata that looks irrelevant",
];

export function scrubText(value: string, limit = NOTE_LIMIT): string {
  return value
    .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi, "[image omitted]")
    .trim()
    .slice(0, limit);
}

export function includeSameSite(state: Pick<ProofState, "address" | "photos">): boolean {
  return state.address.trim().length >= ADDRESS_MIN && state.photos.length >= 2;
}

function asSlot(value: unknown): PhotoSlot | null {
  return value === "before" || value === "after" ? value : null;
}

function finiteSize(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

export type ProofStateInput = {
  address?: unknown;
  jobDate?: unknown;
  notes?: unknown;
  voiceTranscript?: unknown;
  photos?: unknown;
};

/** Accept a `{ state }` body or the state itself. Drops image fields. */
export function parseProofInput(body: unknown): ProofStateInput | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const source =
    typeof record.state === "object" && record.state !== null && !Array.isArray(record.state)
      ? (record.state as Record<string, unknown>)
      : record;
  if ("blob" in source || "dataUrl" in source || "bytes" in source) return null;
  return {
    address: source.address,
    jobDate: source.jobDate,
    notes: source.notes,
    voiceTranscript: source.voiceTranscript,
    photos: source.photos,
  };
}

export function buildProofState(input: ProofStateInput): ProofState {
  const photos: ProofPhotoState[] = [];
  if (Array.isArray(input.photos)) {
    for (const item of input.photos) {
      if (photos.length >= PHOTO_LIMIT) break;
      if (typeof item !== "object" || item === null) continue;
      const photo = item as Record<string, unknown>;
      const slot = asSlot(photo.slot);
      if (!slot) continue;
      const id = typeof photo.id === "string" && photo.id.trim() ? photo.id.trim().slice(0, 80) : `photo-${photos.length + 1}`;
      const createdAt = typeof photo.createdAt === "string" ? photo.createdAt.trim().slice(0, 40) : "";
      photos.push({
        id,
        slot,
        width: finiteSize(photo.width),
        height: finiteSize(photo.height),
        createdAt,
      });
    }
  }
  const jobDate =
    typeof input.jobDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.jobDate.trim()) ? input.jobDate.trim() : "";
  return {
    address: scrubText(typeof input.address === "string" ? input.address : "", 200),
    jobDate,
    notes: scrubText(typeof input.notes === "string" ? input.notes : ""),
    voiceTranscript: scrubText(typeof input.voiceTranscript === "string" ? input.voiceTranscript : ""),
    beforeCount: photos.filter((photo) => photo.slot === "before").length,
    afterCount: photos.filter((photo) => photo.slot === "after").length,
    photos,
  };
}

export function proofStateKey(state: ProofState): string {
  return JSON.stringify(state);
}

export function proofQuestions(state: ProofState): Record<string, Question> {
  const questions: Record<string, Question> = {};
  state.photos.forEach((photo, index) => {
    questions[`role_${index}`] = choice(
      `What role does photo ${index + 1} play in this customer proof? You only have the slot the contractor picked (${photo.slot}), the pixel size, and the time. You do not see the image. This labels the proof. It is not a judgment of workmanship or safety.`,
      ROLE_CRITERIA,
    );
  });
  questions.completeness = score(
    "How complete is this job as a customer proof PDF? Judge only from counts, notes, and photo metadata. This is contractor proof completeness, not a safety or medical determination.",
    COMPLETENESS_CRITERIA,
  );
  questions.enough_for_pdf = noul(
    "Is this enough for a customer proof PDF? Enough means a before, an after, and a note a customer can read. This is not a promise the work was done correctly.",
    {
      true: "before_count and after_count are both at least 1 and the note or transcript describes the work",
      false: "a side is missing, or there is no note",
    },
  );
  if (includeSameSite(state)) {
    questions.same_site = noul(
      "Do the photo timestamps and the job address look like the same site visit? You do not see the images and you do not have GPS.",
      {
        true: "The photos share the job date and an address is present",
        false: "The timestamps disagree with the job date, or the address is empty",
      },
    );
  }
  return questions;
}

export function buildRequest(state: ProofState, model = DEFAULT_MODEL) {
  return { model, state, questions: proofQuestions(state) };
}

export function completenessFromRaw(raw: number): number {
  if (!Number.isFinite(raw) || raw < -0.49 || raw > 4.49) {
    throw new JevParseError("completeness score is outside 1 to 5");
  }
  return Math.min(5, Math.max(1, Math.round(raw) + 1));
}

function isPhotoRole(value: string): value is PhotoRole {
  return (PHOTO_ROLES as readonly string[]).includes(value);
}

function readRole(answer: Answer | undefined, photo: ProofPhotoState): PhotoRoleAid {
  if (!answer || answer.type !== "choice" || !isPhotoRole(answer.choice)) {
    throw new JevParseError("photo role must be before, after, detail, or irrelevant");
  }
  return {
    id: photo.id,
    slot: photo.slot,
    role: answer.choice,
    probabilities: answer.probabilities,
    confidence: answer.confidence,
  };
}

export function readingFromResponse(parsed: SystemOneResponse, state: ProofState): ProofReading {
  const completeness = parsed.answers.completeness;
  const enough = parsed.answers.enough_for_pdf;
  if (!completeness || completeness.type !== "score") {
    throw new JevParseError("completeness must be a score");
  }
  if (!enough || enough.type !== "noul") throw new JevParseError("enough_for_pdf must be a noul");
  const same = parsed.answers.same_site;
  if (includeSameSite(state)) {
    if (!same || same.type !== "noul") throw new JevParseError("same_site must be a noul");
  }
  return {
    source: "jev",
    model: parsed.model,
    calibrated: true,
    completeness: completenessFromRaw(completeness.score),
    completenessRaw: completeness.score,
    completenessConfidence: completeness.confidence,
    completenessProbabilities: completeness.probabilities,
    enoughForPdf: enough.noul,
    sameSite: same && same.type === "noul" ? same.noul : null,
    photos: state.photos.map((photo, index) => readRole(parsed.answers[`role_${index}`], photo)),
  };
}
