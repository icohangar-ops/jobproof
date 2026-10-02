import type { PhotoRole, ProofAid } from "@/lib/jev/types";

const ROLE_LABEL: Record<PhotoRole, "Before" | "After" | "Detail" | "Irrelevant"> = {
  before: "Before",
  after: "After",
  detail: "Detail",
  irrelevant: "Irrelevant",
};

export function roleBadge(role: PhotoRole): "Before" | "After" | "Detail" | "Irrelevant" {
  return ROLE_LABEL[role];
}

export function formatDecisionAid(aid: ProofAid): {
  label: "Decision aid";
  suggestion: string;
  confidenceText: string;
  flags: string;
  authorityText: string;
  disclaimer: string;
} {
  const confidenceText =
    aid.calibrated && aid.completenessConfidence != null
      ? `Calibrated confidence ${Math.round(aid.completenessConfidence * 100)}%. This is a probability, not a certainty.`
      : "Local rules filled in because Jev was not called. This is not a calibrated model score.";
  const enough = `Enough for a customer proof PDF: ${Math.round(aid.enoughForPdf * 100)}% yes`;
  const same = aid.sameSite == null ? null : `Same site as the other photos: ${Math.round(aid.sameSite * 100)}% yes`;
  const counts = aid.photos.reduce(
    (total, photo) => {
      total[photo.role] += 1;
      return total;
    },
    { before: 0, after: 0, detail: 0, irrelevant: 0 },
  );
  const roles = `Before ${counts.before} · After ${counts.after} · Detail ${counts.detail}`;
  return {
    label: "Decision aid",
    suggestion: aid.completeness < 3 ? "Needs more" : `${aid.completeness} of 5`,
    confidenceText,
    flags: [enough, same, roles].filter(Boolean).join(" · "),
    authorityText: aid.note,
    disclaimer:
      "This is a decision aid for contractor proof completeness. It does not see the photos, and it is not a safety or medical determination.",
  };
}

/** Banner text for a thin proof, or for a PDF a person confirmed. */
export function pdfDecisionLine(
  aid: { completeness: number; overrideReason?: ProofAid["overrideReason"] },
  overridden: boolean,
): string | undefined {
  if (aid.completeness >= 3 && !overridden) return undefined;
  const score = `Decision aid: completeness ${aid.completeness} of 5.`;
  const limit = "Contractor proof check only, not a safety determination.";
  if (overridden && aid.overrideReason === "low_confidence") {
    return `${score} A person confirmed this PDF because calibrated confidence was below 70%. ${limit}`;
  }
  if (overridden && aid.completeness < 3) {
    return `${score} The contractor overrode the check. ${limit}`;
  }
  if (overridden) {
    return `${score} A person confirmed this PDF. ${limit}`;
  }
  return `${score} ${limit}`;
}
