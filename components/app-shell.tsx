"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ClipboardList, Plus, Settings } from "lucide-react";
import { Logo } from "@/components/logo";
import { useJobStore } from "@/components/job-store";
import { cn } from "cn";

const links = [
  { href: "/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/jobs/new", label: "New job", icon: Plus },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  compact = false,
}: {
  href: string;
  label: string;
  icon: typeof Plus;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active =
    href === "/jobs"
      ? pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/jobs/new"))
      : pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "flex touch-manipulation items-center gap-3 rounded-xl text-sm font-medium",
        compact ? "h-16 flex-col justify-center gap-1 px-2" : "h-12 px-3",
        active ? "bg-foreground text-background" : "text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </Link>
  );
}

function OfflineNote() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <p className="bg-foreground px-4 py-2 text-center text-sm text-background">
      You&apos;re offline. Jobs already on this device still open.
    </p>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { settings, error } = useJobStore();
  return (
    <div className="min-h-dvh bg-background">
      <div className="md:grid md:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-border bg-card md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:justify-between md:p-4">
          <div>
            <Link href="/" className="mb-8 block rounded-xl px-2 py-1">
              <Logo />
            </Link>
            <nav className="grid gap-1" aria-label="Job book">
              {links.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </nav>
          </div>
          <p className="px-3 text-xs leading-5 text-muted-foreground">
            {settings.companyName || "Your company"}
            <span className="mt-1 block">Demo mode · saved on this device</span>
          </p>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
            <Link href="/">
              <Logo />
            </Link>
            <span className="max-w-[40%] truncate text-xs text-muted-foreground">
              {settings.companyName || "Your company"}
            </span>
          </header>
          <OfflineNote />
          {error ? (
            <p className="mx-4 mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-44 md:px-8 md:py-8 md:pb-16">{children}</div>
        </div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Job book"
      >
        {links.map((link) => (
          <NavLink key={link.href} {...link} compact />
        ))}
      </nav>
    </div>
  );
}
