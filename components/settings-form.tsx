"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useJobStore } from "@/components/job-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const field = "h-12 px-3 text-base md:text-base";

export function SettingsForm() {
  const { ready, settings, updateSettings } = useJobStore();
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [license, setLicense] = useState(settings.license);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setPhone(settings.phone);
    setEmail(settings.email);
    setLicense(settings.license);
  }, [settings]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!companyName.trim()) {
      toast.error("Add a company name for the PDF header.");
      return;
    }
    setPending(true);
    try {
      await updateSettings({
        id: "company",
        companyName: companyName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        license: license.trim(),
      });
      toast.success("Company details saved on this device");
    } catch {
      toast.error("Could not save settings.");
    } finally {
      setPending(false);
    }
  }

  if (!ready) return <p className="text-sm text-muted-foreground">Opening settings…</p>;

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Settings</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          This name goes on every JobProof PDF and share page. Nothing here is sent to a server in demo mode.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="companyName">Company name</Label>
        <Input
          id="companyName"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          className={field}
          autoComplete="organization"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={field}
          inputMode="tel"
          autoComplete="tel"
          placeholder="Optional"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={field}
          autoComplete="email"
          placeholder="Optional"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="license">License or tagline</Label>
        <Input
          id="license"
          value={license}
          onChange={(event) => setLicense(event.target.value)}
          className={field}
          placeholder="Optional line under the job date"
        />
      </div>
      <Button type="submit" size="xl" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save company"}
      </Button>
    </form>
  );
}
