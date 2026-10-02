"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DecisionAid } from "@/components/decision-aid";
import { PhotoBoard } from "@/components/photo-board";
import { VoiceRecorder } from "@/components/voice-recorder";
import { useJobStore } from "@/components/job-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getVoice,
  listPhotos,
  removePhoto,
  removeVoice,
  savePhoto,
  saveShare,
  saveVoice as putVoice,
} from "@/lib/db";
import { formatLongDate, pdfFilename } from "@/lib/format";
import { blobToDataUrl, compressImageFile, downloadBytes } from "@/lib/images";
import { pdfDecisionLine, roleBadge } from "@/lib/jev/format";
import { buildProofState, proofStateKey } from "@/lib/jev/jobproof";
import { aidFromHeuristic } from "@/lib/jev/gate";
import { loadProofAid } from "@/lib/jev/request";
import type { ProofAid } from "@/lib/jev/types";
import { generateShareToken } from "@/lib/jobs";
import { buildJobProofPdf } from "@/lib/pdf";
import type { Job, PdfPhoto, PhotoRecord, ShareSnapshot } from "@/lib/types";

const field = "h-12 px-3 text-base md:text-base";

export function JobDetail({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { ready, jobs, settings, updateJob, deleteJob } = useJobStore();
  const stored = jobs.find((job) => job.id === jobId);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [transcript, setTranscript] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [remoteAid, setRemoteAid] = useState<ProofAid | null>(null);
  const [override, setOverride] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    async function load() {
      const nextPhotos = await listPhotos(jobId);
      const nextUrls: Record<string, string> = {};
      for (const photo of nextPhotos) {
        const url = URL.createObjectURL(photo.blob);
        nextUrls[photo.id] = url;
        created.push(url);
      }
      const job = stored;
      let voiceUrl: string | null = null;
      let voiceDuration = 0;
      if (job?.voiceId) {
        const voice = await getVoice(job.voiceId);
        if (voice) {
          voiceUrl = URL.createObjectURL(voice.blob);
          created.push(voiceUrl);
          voiceDuration = voice.durationMs;
        }
      }
      if (cancelled) {
        created.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setPhotos(nextPhotos);
      setUrls(nextUrls);
      setAudioUrl(voiceUrl);
      setDurationMs(voiceDuration);
      setLoaded(true);
    }
    if (ready) load().catch(() => setLoaded(true));
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
    // Reload media when the job id becomes available. Edits shouldn't refetch blobs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, ready, stored?.voiceId]);

  useEffect(() => {
    setHydrated(false);
  }, [jobId]);

  useEffect(() => {
    if (!stored) return;
    setNotes(stored.notes);
    setTranscript(stored.voiceTranscript);
    setCustomerName(stored.customerName);
    setAddress(stored.address);
    setDate(stored.date);
    if (stored.shareToken) {
      setShareUrl(`${window.location.origin}/share/${stored.shareToken}`);
    }
    setHydrated(true);
    // Initialize the form from the stored job once it is present.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored?.id]);

  useEffect(() => {
    if (!hydrated || !stored) return;
    if (notes === stored.notes && transcript === stored.voiceTranscript) return;
    const timer = window.setTimeout(() => {
      updateJob(stored.id, { notes, voiceTranscript: transcript }).catch(() => {
        toast.error("Could not save the note.");
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [notes, transcript, stored, updateJob, hydrated]);

  const before = useMemo(() => photos.filter((photo) => photo.kind === "before"), [photos]);
  const after = useMemo(() => photos.filter((photo) => photo.kind === "after"), [photos]);

  const proofState = useMemo(
    () =>
      buildProofState({
        address,
        jobDate: date,
        notes,
        voiceTranscript: transcript,
        photos: photos.map((photo) => ({
          id: photo.id,
          slot: photo.kind,
          width: photo.width,
          height: photo.height,
          createdAt: photo.createdAt,
        })),
      }),
    [address, date, notes, photos, transcript],
  );
  const stateKey = useMemo(() => proofStateKey(proofState), [proofState]);
  const localAid = useMemo(() => aidFromHeuristic(proofState, { primary: false }), [proofState]);
  const persistedAid = stored?.proofAid?.stateKey === stateKey ? stored.proofAid : null;
  const aid = remoteAid?.stateKey === stateKey ? remoteAid : persistedAid ?? localAid;
  const blocked = aid.appliedPdf === "override";
  const roleBadges = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const photo of aid.photos) labels[photo.id] = roleBadge(photo.role);
    return labels;
  }, [aid.photos]);

  useEffect(() => {
    setOverride(false);
  }, [stateKey]);

  useEffect(() => {
    if (!loaded || !hydrated) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      loadProofAid(proofState)
        .then((next) => {
          if (cancelled) return;
          setRemoteAid(next);
          updateJob(jobId, { proofAid: next }).catch(() => undefined);
        })
        .catch(() => undefined);
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [hydrated, jobId, loaded, proofState, updateJob]);

  async function refreshCounts(nextPhotos: PhotoRecord[], patch: Partial<Job> = {}) {
    await updateJob(jobId, {
      ...patch,
      beforeCount: nextPhotos.filter((photo) => photo.kind === "before").length,
      afterCount: nextPhotos.filter((photo) => photo.kind === "after").length,
    });
  }

  async function addPhoto(kind: "before" | "after", file: File) {
    const compressed = await compressImageFile(file);
    const photo: PhotoRecord = {
      id: crypto.randomUUID(),
      jobId,
      kind,
      blob: compressed.blob,
      width: compressed.width,
      height: compressed.height,
      createdAt: new Date().toISOString(),
    };
    await savePhoto(photo);
    const url = URL.createObjectURL(photo.blob);
    const next = [...photos, photo];
    setPhotos(next);
    setUrls((current) => ({ ...current, [photo.id]: url }));
    await refreshCounts(next);
  }

  async function removeOne(id: string) {
    await removePhoto(id);
    const url = urls[id];
    if (url) URL.revokeObjectURL(url);
    const next = photos.filter((photo) => photo.id !== id);
    setPhotos(next);
    setUrls((current) => {
      const copy = { ...current };
      delete copy[id];
      return copy;
    });
    await refreshCounts(next);
  }

  async function toPdfPhotos(kind: "before" | "after"): Promise<PdfPhoto[]> {
    const selected = photos.filter((photo) => photo.kind === kind);
    const result: PdfPhoto[] = [];
    for (const photo of selected) {
      result.push({
        dataUrl: await blobToDataUrl(photo.blob),
        width: photo.width,
        height: photo.height,
        createdAt: photo.createdAt,
      });
    }
    return result;
  }

  async function currentJob(): Promise<Job | undefined> {
    return updateJob(jobId, {
      customerName: customerName.trim() || stored?.customerName || "Job",
      address: address.trim(),
      date,
      notes,
      voiceTranscript: transcript,
    });
  }

  function aidForExport(): ProofAid {
    return aid.stateKey === stateKey ? aid : localAid;
  }

  async function downloadPdf() {
    if (!stored) return;
    const currentAid = aidForExport();
    if (currentAid.appliedPdf === "override" && !override) {
      toast.message("This proof is under the completeness bar. Use Override, then download.");
      return;
    }
    setPdfBusy(true);
    try {
      const job = (await currentJob()) ?? stored;
      const [beforePhotos, afterPhotos] = await Promise.all([toPdfPhotos("before"), toPdfPhotos("after")]);
      const bytes = buildJobProofPdf({
        companyName: settings.companyName,
        phone: settings.phone,
        email: settings.email,
        license: settings.license,
        customerName: job.customerName,
        address: job.address,
        jobDate: job.date,
        notes: job.notes,
        voiceTranscript: job.voiceTranscript,
        before: beforePhotos,
        after: afterPhotos,
        generatedAt: new Date().toISOString(),
        decisionAidLine: pdfDecisionLine(currentAid, override),
      });
      downloadBytes(bytes, pdfFilename(job.customerName, job.date), "application/pdf");
      await updateJob(jobId, { status: "proofed" });
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not build the PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function publishShare() {
    if (!stored) return;
    if (aidForExport().appliedPdf === "override" && !override) {
      toast.message("This proof is under the completeness bar. Use Override, then copy the link.");
      return;
    }
    setShareBusy(true);
    try {
      const job = (await currentJob()) ?? stored;
      const token = job.shareToken ?? generateShareToken();
      const [beforePhotos, afterPhotos] = await Promise.all([toPdfPhotos("before"), toPdfPhotos("after")]);
      let voiceDataUrl: string | null = null;
      if (job.voiceId) {
        const voice = await getVoice(job.voiceId);
        if (voice && voice.blob.size < 2_500_000) {
          voiceDataUrl = await blobToDataUrl(voice.blob);
        }
      }
      const snapshot: ShareSnapshot = {
        companyName: settings.companyName,
        phone: settings.phone,
        email: settings.email,
        license: settings.license,
        customerName: job.customerName,
        address: job.address,
        jobDate: job.date,
        notes: job.notes,
        voiceTranscript: job.voiceTranscript,
        voiceDataUrl,
        before: beforePhotos,
        after: afterPhotos,
        sharedAt: new Date().toISOString(),
      };
      await saveShare({
        token,
        jobId: job.id,
        snapshot,
        createdAt: new Date().toISOString(),
      });
      await updateJob(jobId, { shareToken: token, status: "proofed" });
      const url = `${window.location.origin}/share/${token}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied");
      } catch {
        toast.message("Share link is ready to copy");
      }
    } catch {
      toast.error("Could not create the share link.");
    } finally {
      setShareBusy(false);
    }
  }

  async function saveVoice(blob: Blob, nextDuration: number) {
    if (stored?.voiceId) await removeVoice(stored.voiceId);
    const id = crypto.randomUUID();
    await putVoice({
      id,
      jobId,
      blob,
      durationMs: nextDuration,
      createdAt: new Date().toISOString(),
    });
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(blob));
    setDurationMs(nextDuration);
    await updateJob(jobId, { voiceId: id });
  }

  async function clearVoice() {
    if (stored?.voiceId) await removeVoice(stored.voiceId);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDurationMs(0);
    await updateJob(jobId, { voiceId: null });
  }

  async function saveDetails() {
    if (!customerName.trim()) {
      toast.error("The job needs a customer name.");
      return;
    }
    await updateJob(jobId, {
      customerName: customerName.trim(),
      address: address.trim(),
      date,
    });
    toast.success("Job details saved");
  }

  async function destroy() {
    if (!window.confirm("Delete this job and its photos from this device?")) return;
    await deleteJob(jobId);
    router.push("/jobs");
  }

  if (!ready || !loaded) {
    return <p className="text-sm text-muted-foreground">Opening the job…</p>;
  }

  if (!stored) {
    return (
      <div className="rounded-2xl border border-border bg-card px-5 py-8">
        <h1 className="font-display text-3xl">That job isn&apos;t on this device</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been deleted, or it was created in another browser.</p>
        <Button asChild size="lg" className="mt-5">
          <Link href="/jobs">Back to jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{formatLongDate(stored.date)}</p>
          <h1 className="font-display text-4xl leading-tight tracking-tight">{stored.customerName}</h1>
          {stored.address ? <p className="mt-1 text-muted-foreground">{stored.address}</p> : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {before.length > 0 ? (
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">Before</span>
          ) : null}
          {after.length > 0 ? (
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">After</span>
          ) : null}
          {hydrated && aid.completeness < 3 ? (
            <span className="rounded-full bg-[#f4e6d4] px-3 py-1 text-sm font-medium text-[#8a4b12]">Needs more</span>
          ) : null}
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              stored.status === "proofed" ? "bg-[#e5f2eb] text-[#1f5c45]" : "bg-muted text-muted-foreground"
            }`}
          >
            {stored.status === "proofed" ? "Proofed" : "Open"}
          </span>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-2 gap-2 border-t border-border bg-background/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        {blocked ? (
          <p className="col-span-2 text-center text-xs text-muted-foreground">
            {override ? "Override is on. You can make the PDF." : "Paused until you use Override in the decision aid."}
          </p>
        ) : null}
        <Button type="button" size="xl" onClick={downloadPdf} disabled={pdfBusy || (blocked && !override)}>
          <FileDown />
          {pdfBusy ? "Building…" : "Download PDF"}
        </Button>
        <Button type="button" size="xl" variant="outline" onClick={publishShare} disabled={shareBusy || (blocked && !override)}>
          <Link2 />
          {shareBusy ? "Sharing…" : "Copy share link"}
        </Button>
      </div>

      {shareUrl ? (
        <div className="grid gap-2">
          <Label htmlFor="share-link">Share link</Label>
          <Input id="share-link" readOnly value={shareUrl} aria-label="Share link" className={field} onFocus={(event) => event.currentTarget.select()} />
          <p className="text-xs text-muted-foreground">
            Demo links open in this browser. Copy it again after you add photos so the customer view stays current.
          </p>
        </div>
      ) : null}

      {hydrated ? <DecisionAid aid={aid} override={override} onOverride={setOverride} /> : null}

      <PhotoBoard
        kind="before"
        photos={before}
        urls={urls}
        badges={roleBadges}
        onAdd={(file) => addPhoto("before", file)}
        onRemove={removeOne}
      />
      <PhotoBoard
        kind="after"
        photos={after}
        urls={urls}
        badges={roleBadges}
        onAdd={(file) => addPhoto("after", file)}
        onRemove={removeOne}
      />

      <section className="grid gap-2 rounded-2xl border border-border bg-card p-4">
        <Label htmlFor="notes">Job notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What changed, what you left curing, anything the customer should know."
          className="min-h-32 text-base md:text-base"
        />
        <p className="text-xs text-muted-foreground">Saves on this device as you type.</p>
      </section>

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <h2 className="font-display text-2xl">Voice note</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record with the mic. Type the words underneath — this demo does not turn speech into text for you.
          </p>
        </div>
        <VoiceRecorder audioUrl={audioUrl} durationMs={durationMs} onSave={saveVoice} onClear={clearVoice} />
        <Label htmlFor="transcript">Transcript</Label>
        <Textarea
          id="transcript"
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          placeholder="Type what you said, or skip the mic and write the note here."
          className="min-h-28 text-base md:text-base"
        />
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-2xl">Job details</h2>
        <div className="grid gap-2">
          <Label htmlFor="edit-customer">Customer name</Label>
          <Input id="edit-customer" value={customerName} onChange={(event) => setCustomerName(event.target.value)} className={field} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-address">Address</Label>
          <Input id="edit-address" value={address} onChange={(event) => setAddress(event.target.value)} className={field} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-date">Job date</Label>
          <Input id="edit-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={field} />
        </div>
        <Button type="button" variant="secondary" size="lg" onClick={saveDetails}>
          Save details
        </Button>
      </section>

      <Button type="button" variant="ghost" className="justify-start text-destructive" onClick={destroy}>
        <Trash2 />
        Delete job
      </Button>
    </div>
  );
}
