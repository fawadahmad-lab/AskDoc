import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[var(--shadow-glow)]",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
        <path
          d="M12 3a9 9 0 1 0 6.9 14.85"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3.2" fill="currentColor" />
        <circle cx="12" cy="12" r="1.2" fill="background" />
      </svg>
    </div>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading text-xl font-semibold tracking-tight", className)}>
      Doc<span className="text-primary">ly</span>
    </span>
  );
}
