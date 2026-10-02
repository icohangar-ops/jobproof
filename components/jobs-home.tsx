"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobStore } from "@/components/job-store";
import { paintDemoPhoto } from "@/lib/demo-art";
import { formatLongDate, todayInputValue } from "@/lib/format";
import { savePhoto } from "@/lib/db";
import type { Job } from "@/lib/types";

export function JobsHome() {
  const { ready, jobs, addJob, updateJob } = useJobStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "proofed">("all");
  const [seeding, setSeeding] = useState(false);
  const router = useRouter();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (filter !== "all" && job.status !== filter) return false;
      if (!needle) return true;
      return (
        job.customerName.toLowerCase().includes(needle) ||
        job.address.toLowerCase().includes(needle)
      );
    });
  }, [jobs, query, filter]);

  async function loadSample() {
    setSeeding(true);
    try {
      const job = await addJob({
        customerName: "Cedar Street kitchen",
        address: "418 Cedar Street",
        date: todayInputValue(),
      });
      const noted = await updateJob(job.id, {
        notes:
          "Replaced the cracked backsplash tile beside the sink and resealed the edge. Walked the after photos before leaving.",
        voiceTranscript:
          "Finished the backsplash around three. The crack ran from the outlet toward the sink. New tile matches the field. Silicone needs a day before anyone wipes it.",
      });
      const before = await paintDemoPhoto("before");
      const after = await paintDemoPhoto("after");
      const now = new Date().toISOString();
      await savePhoto({
        id: crypto.randomUUID(),
        jobId: job.id,
        kind: "before",
        blob: before,
        width: 1200,
        height: 900,
        createdAt: now,
      });
      await savePhoto({
        id: crypto.randomUUID(),
        jobId: job.id,
        kind: "after",
        blob: after,
        width: 1200,
        height: 900,
        createdAt: now,
      });
      await updateJob(job.id, {
        beforeCount: 1,
        afterCount: 1,
        notes: noted?.notes ?? job.notes,
        voiceTranscript: noted?.voiceTranscript ?? "",
      });
      router.push(`/jobs/${job.id}`);
    } catch {
      toast.error("Could not load the sample job.");
      setSeeding(false);
    }
  }

  if (!ready) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-live="polite">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <p className="text-sm text-muted-foreground">Opening your job book…</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {jobs.length === 0
              ? "Nothing here yet. A name and a couple of photos is enough."
              : `${jobs.length} on this device`}
          </p>
        </div>
        <Button asChild size="xl">
          <Link href="/jobs/new">
            <Plus />
            New job
          </Link>
        </Button>
      </div>

      {jobs.length > 0 ? (
        <div className="grid gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer or address"
            aria-label="Search jobs"
            className="h-12 px-3 text-base md:text-base"
          />
          <div className="flex gap-2" role="group" aria-label="Filter jobs">
            {(
              [
                ["all", "All"],
                ["open", "Open"],
                ["proofed", "Proofed"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`h-10 rounded-full px-4 text-sm font-medium ${
                  filter === value ? "bg-foreground text-background" : "bg-muted text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card px-5 py-8 text-center">
          <p className="font-display text-3xl">Start with a real job, or a sample.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            The sample is a kitchen backsplash with before and after photos and a short note, so you can make a PDF without leaving the chair.
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <Button asChild size="xl">
              <Link href="/jobs/new">
                <Plus />
                New job
              </Link>
            </Button>
            <Button type="button" size="xl" variant="outline" onClick={loadSample} disabled={seeding}>
              {seeding ? "Building sample…" : "Load a sample job"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No jobs match that search.
            </p>
          ) : (
            <ul className="grid gap-3">
              {visible.map((job) => (
                <li key={job.id}>
                  <JobRow job={job} />
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="outline" size="lg" onClick={loadSample} disabled={seeding} className="justify-self-start">
            {seeding ? "Building sample…" : "Load a sample job"}
          </Button>
        </>
      )}
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:border-foreground/30"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl leading-tight">{job.customerName}</h2>
        <span
          className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            job.status === "proofed"
              ? "bg-[#e5f2eb] text-[#1f5c45]"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {job.status === "proofed" ? "Proofed" : "Open"}
        </span>
      </div>
      {job.address ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          {job.address}
        </p>
      ) : null}
      <p className="mt-2 text-sm">
        {formatLongDate(job.date)}
        <span className="text-muted-foreground">
          {" "}
          · {job.beforeCount} before · {job.afterCount} after
          {job.voiceId || job.voiceTranscript ? " · note" : ""}
          {job.proofAid && job.proofAid.completeness < 3 ? " · Needs more" : ""}
        </span>
      </p>
    </Link>
  );
}
