"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJobStore } from "@/components/job-store";
import { todayInputValue } from "@/lib/format";
import { validateJobDraft } from "@/lib/jobs";

const control = "h-12 px-3 text-base md:text-base";

export function JobForm() {
  const router = useRouter();
  const { addJob } = useJobStore();
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(todayInputValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const draft = { customerName, address, date };
    const validation = validateJobDraft(draft);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const job = await addJob(draft);
      router.push(`/jobs/${job.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create that job.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="customerName">Customer name</Label>
        <Input
          id="customerName"
          name="customerName"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          placeholder="Cedar Street kitchen"
          autoComplete="name"
          className={control}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="address">
          Address <span className="font-normal text-muted-foreground">optional</span>
        </Label>
        <Input
          id="address"
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="418 Cedar Street"
          autoComplete="street-address"
          className={control}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="date">Job date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className={control}
          required
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="xl" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Create job"}
      </Button>
    </form>
  );
}
