import type { Metadata } from "next";
import { JobForm } from "@/components/job-form";

export const metadata: Metadata = { title: "New job" };

export default function NewJobPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-4xl tracking-tight">New job</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A name is enough to start. Add the address if the proof should show where the work happened.
        </p>
      </div>
      <JobForm />
    </div>
  );
}
