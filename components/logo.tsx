import { BadgeCheck } from "lucide-react";
import { cn } from "cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-foreground text-[#f0c27a]">
        <BadgeCheck className="size-5" aria-hidden />
      </span>
      <span className="font-display text-xl leading-none tracking-tight">JobProof</span>
    </span>
  );
}
