import { aidFromHeuristic } from "@/lib/jev/gate";
import type { ProofAid, ProofState } from "@/lib/jev/types";

function isProofAid(value: unknown): value is ProofAid {
  if (typeof value !== "object" || value === null) return false;
  const aid = value as Partial<ProofAid>;
  return (
    (aid.source === "jev" || aid.source === "heuristic") &&
    typeof aid.completeness === "number" &&
    (aid.appliedPdf === "allow" || aid.appliedPdf === "override") &&
    typeof aid.stateKey === "string" &&
    typeof aid.note === "string" &&
    Array.isArray(aid.photos)
  );
}

/** Ask the app server. A missing key or a failed call uses the local heuristic and does not block the PDF. */
export async function loadProofAid(state: ProofState): Promise<ProofAid> {
  try {
    const response = await fetch("/api/jev", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ state }),
    });
    if (!response.ok) throw new Error(String(response.status));
    const body: unknown = await response.json();
    if (!isProofAid(body)) throw new Error("shape");
    return body;
  } catch {
    return aidFromHeuristic(state, { primary: false }, new Date().toISOString());
  }
}
