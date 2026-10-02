import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5">
      <Logo />
      <h1 className="mt-8 font-display text-4xl tracking-tight">You&apos;re offline</h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        Jobs already saved on this device still open. This screen is the fallback when a new page hasn&apos;t been cached yet.
      </p>
      <Button asChild size="xl" className="mt-8 w-fit">
        <Link href="/jobs">Try the job book</Link>
      </Button>
    </main>
  );
}
