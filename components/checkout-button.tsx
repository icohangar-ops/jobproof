"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CheckoutButton({
  plan,
  children,
  variant = "default",
}: {
  plan: "pro" | "lifetime";
  children: React.ReactNode;
  variant?: "default" | "outline";
}) {
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await response.json()) as { status?: string; url?: string };
      if (data.status === "coming_soon" || !data.url) {
        toast.message("Checkout coming soon", {
          description: "Stripe keys are not set. The demo on this device is free to click through.",
        });
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Checkout could not start. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" size="xl" className="w-full" variant={variant} disabled={pending} onClick={start}>
      {pending ? "Starting checkout…" : children}
    </Button>
  );
}

export function CheckoutStatus() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/checkout")
      .then((response) => response.json())
      .then((data: { configured?: boolean }) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false));
  }, []);

  if (configured !== false) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Checkout coming soon — this demo runs without Stripe keys. Jobs, photos, PDFs, and share links work on this device.
    </p>
  );
}
