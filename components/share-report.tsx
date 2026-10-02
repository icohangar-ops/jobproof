"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getShare } from "@/lib/db";
import { formatLongDate, formatTimestamp, pdfFilename } from "@/lib/format";
import { downloadBytes } from "@/lib/images";
import { buildJobProofPdf } from "@/lib/pdf";
import type { ShareSnapshot } from "@/lib/types";

export function ShareReport({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<ShareSnapshot | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getShare(token)
      .then((record) => {
        if (!cancelled) setSnapshot(record?.snapshot ?? null);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function download() {
    if (!snapshot) return;
    setBusy(true);
    try {
      const bytes = buildJobProofPdf({
        companyName: snapshot.companyName,
        phone: snapshot.phone,
        email: snapshot.email,
        license: snapshot.license,
        customerName: snapshot.customerName,
        address: snapshot.address,
        jobDate: snapshot.jobDate,
        notes: snapshot.notes,
        voiceTranscript: snapshot.voiceTranscript,
        before: snapshot.before,
        after: snapshot.after,
        generatedAt: snapshot.sharedAt,
      });
      downloadBytes(bytes, pdfFilename(snapshot.customerName, snapshot.jobDate), "application/pdf");
    } catch {
      toast.error("Could not build the PDF from this share.");
    } finally {
      setBusy(false);
    }
  }

  if (snapshot === undefined) {
    return <main className="mx-auto max-w-3xl px-5 py-16 text-sm text-muted-foreground">Opening the proof…</main>;
  }

  if (!snapshot) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-16">
        <Logo />
        <h1 className="mt-8 font-display text-4xl tracking-tight">This proof isn&apos;t on this device</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Demo share links live in the browser that created them. Open the link on that phone or computer, or create the job again there.
        </p>
        <Button asChild size="xl" className="mt-8 w-fit">
          <Link href="/jobs">Open the job book</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <Button type="button" size="xl" onClick={download} disabled={busy}>
          <FileDown />
          {busy ? "Building…" : "Download PDF"}
        </Button>
      </div>
      <p className="mt-10 text-sm font-medium tracking-[0.14em] text-primary uppercase">Proof of work</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">{snapshot.customerName}</h1>
      <p className="mt-3 text-muted-foreground">
        {snapshot.companyName || "JobProof"}
        {snapshot.address ? ` · ${snapshot.address}` : ""}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Job date {formatLongDate(snapshot.jobDate)} · Shared {formatTimestamp(snapshot.sharedAt)}
      </p>
      {snapshot.phone || snapshot.email ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {[snapshot.phone, snapshot.email].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {snapshot.notes ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-card px-4 py-4 leading-7 ring-1 ring-foreground/10">
            {snapshot.notes}
          </p>
        </section>
      ) : null}

      {snapshot.voiceTranscript ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">Voice note</h2>
          <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-card px-4 py-4 leading-7 ring-1 ring-foreground/10">
            {snapshot.voiceTranscript}
          </p>
          {snapshot.voiceDataUrl ? <audio controls src={snapshot.voiceDataUrl} className="mt-3 w-full" /> : null}
        </section>
      ) : null}

      <PhotoSet label="Before" photos={snapshot.before} />
      <PhotoSet label="After" photos={snapshot.after} />

      <p className="mt-12 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        Shared with JobProof. This is a record of work, not an invoice. In demo mode the report is stored on the device that created the link.
      </p>
    </main>
  );
}

function PhotoSet({
  label,
  photos,
}: {
  label: string;
  photos: ShareSnapshot["before"];
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-3xl">{label}</h2>
      {photos.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No {label.toLowerCase()} photos on this proof.</p>
      ) : (
        <ul className="mt-3 grid gap-4">
          {photos.map((photo, index) => (
            <li key={`${label}-${photo.createdAt}-${index}`} className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
              {/* Data URLs from the local share snapshot. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.dataUrl} alt={`${label} photo ${index + 1}`} className="w-full" />
              <p className="px-3 py-2 text-xs text-muted-foreground">{formatTimestamp(photo.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
