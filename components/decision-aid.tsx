"use client";

import { formatDecisionAid } from "@/lib/jev/format";
import type { ProofAid } from "@/lib/jev/types";
import { Button } from "@/components/ui/button";

export function DecisionAid({
  aid,
  override,
  onOverride,
}: {
  aid: ProofAid;
  override: boolean;
  onOverride: (next: boolean) => void;
}) {
  const copy = formatDecisionAid(aid);
  const source =
    aid.source === "jev" && aid.model ? `Jev · ${aid.model}` : aid.source === "jev" ? "Jev" : "Local heuristic";
  const paused = aid.appliedPdf === "override";
  return (
    <section aria-label="Decision aid" className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{copy.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{source}</p>
        </div>
        <p className="font-display text-4xl leading-none">{copy.suggestion}</p>
      </div>
      <p className="mt-3 text-sm leading-6">{copy.confidenceText}</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy.flags}</p>
      <p className="mt-2 text-sm leading-6">{copy.authorityText}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.disclaimer}</p>
      {paused ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="lg" aria-pressed={override} onClick={() => onOverride(!override)}>
            {override ? "Override on" : "Override"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {override ? "You can make the PDF. The file will say a person confirmed it." : "Generate PDF stays paused until you override."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
