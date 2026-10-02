import { includeSameSite } from "@/lib/jev/jobproof";
import type { PhotoRoleAid, ProofReading, ProofState } from "@/lib/jev/types";

/**
 * Local stand-in used when no API key is set or the call fails.
 * It trusts the contractor's before/after slot. It does not see the photo.
 */
export function heuristicRoles(state: ProofState): PhotoRoleAid[] {
  return state.photos.map((photo) => {
    const tiny = photo.width < 48 || photo.height < 48;
    if (tiny) {
      return {
        id: photo.id,
        slot: photo.slot,
        role: "irrelevant",
        probabilities: { before: 0.04, after: 0.03, detail: 0.05, irrelevant: 0.88 },
        confidence: null,
      };
    }
    if (photo.slot === "before") {
      return {
        id: photo.id,
        slot: photo.slot,
        role: "before",
        probabilities: { before: 0.78, after: 0.06, detail: 0.12, irrelevant: 0.04 },
        confidence: null,
      };
    }
    return {
      id: photo.id,
      slot: photo.slot,
      role: "after",
      probabilities: { before: 0.06, after: 0.78, detail: 0.12, irrelevant: 0.04 },
      confidence: null,
    };
  });
}

export function heuristicCompleteness(state: ProofState): number {
  const noteLength = `${state.notes} ${state.voiceTranscript}`.trim().length;
  if (state.beforeCount + state.afterCount === 0) return 1;
  if (state.beforeCount === 0 || state.afterCount === 0) return noteLength >= 24 ? 2 : 1;
  if (noteLength < 12) return 2;
  if (noteLength < 40) return 3;
  if (noteLength < 120) return 4;
  return 5;
}

export function heuristicEnough(completeness: number): number {
  if (completeness >= 5) return 0.9;
  if (completeness >= 4) return 0.82;
  if (completeness >= 3) return 0.71;
  if (completeness === 2) return 0.24;
  return 0.08;
}

export function heuristicSameSite(state: ProofState): number | null {
  if (!includeSameSite(state)) return null;
  const days = new Set(state.photos.map((photo) => photo.createdAt.slice(0, 10)).filter((day) => day.length === 10));
  if (days.size === 1 && (state.jobDate === "" || days.has(state.jobDate))) return 0.74;
  if (days.size >= 3) return 0.28;
  return 0.51;
}

export function heuristicReading(state: ProofState): ProofReading {
  const completeness = heuristicCompleteness(state);
  return {
    source: "heuristic",
    model: null,
    calibrated: false,
    completeness,
    completenessRaw: completeness - 1,
    completenessConfidence: null,
    completenessProbabilities: null,
    enoughForPdf: heuristicEnough(completeness),
    sameSite: heuristicSameSite(state),
    photos: heuristicRoles(state),
  };
}
