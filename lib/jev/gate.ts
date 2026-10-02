import { heuristicReading } from "@/lib/jev/fallback";
import { proofStateKey } from "@/lib/jev/jobproof";
import type { ProofAid, ProofReading, ProofState } from "@/lib/jev/types";

/** Below this, a primary Jev score asks a person to confirm the PDF. */
export const CONFIDENCE_MIN = 0.7;

/** Soft-block when the 1–5 completeness score is under this bar. */
export const COMPLETENESS_MIN = 3;

export function envFlag(env: Record<string, string | undefined>, name: string): boolean {
  const value = (env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function applyGate(input: {
  reading: ProofReading;
  primary: boolean;
}): Pick<ProofAid, "appliedPdf" | "authority" | "overrideReason" | "note" | "primary"> {
  const { reading, primary } = input;
  if (!primary) {
    return {
      appliedPdf: "allow",
      authority: "contractor",
      overrideReason: "none",
      primary: false,
      note: "The contractor still chooses when to make the PDF. This result is a decision aid.",
    };
  }
  if (reading.source !== "jev" || !reading.calibrated) {
    return {
      appliedPdf: "allow",
      authority: "contractor",
      overrideReason: "none",
      primary: true,
      note: "Jev was not called, so the PDF stays available. These local rules are not a calibrated score.",
    };
  }
  if (reading.completenessConfidence == null || reading.completenessConfidence < CONFIDENCE_MIN) {
    return {
      appliedPdf: "override",
      authority: "jev",
      overrideReason: "low_confidence",
      primary: true,
      note: "Calibrated confidence is below 0.70, so a person confirms the PDF. This aid does not decide the proof is complete.",
    };
  }
  if (reading.completeness < COMPLETENESS_MIN) {
    return {
      appliedPdf: "override",
      authority: "jev",
      overrideReason: "incomplete",
      primary: true,
      note: "Completeness is under 3 of 5, so the PDF waits for an override. This is proof completeness, not a safety determination.",
    };
  }
  return {
    appliedPdf: "allow",
    authority: "jev",
    overrideReason: "none",
    primary: true,
    note: "JEV_PRIMARY is on and calibrated confidence is at least 0.70. Completeness meets the bar for a customer proof PDF. This is not a claim the work meets a trade or safety standard.",
  };
}

export function composeAid(
  state: ProofState,
  reading: ProofReading,
  primary: boolean,
  evaluatedAt: string,
): ProofAid {
  return {
    ...reading,
    ...applyGate({ reading, primary }),
    stateKey: proofStateKey(state),
    evaluatedAt,
  };
}

export function aidFromHeuristic(
  state: ProofState,
  flags: { primary: boolean },
  evaluatedAt = "",
): ProofAid {
  return composeAid(state, heuristicReading(state), flags.primary, evaluatedAt);
}
