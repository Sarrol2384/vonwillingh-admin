import { cn } from "@/lib/utils";

/** Lightweight CSS animated orbs — no WebGL, works everywhere. */
export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden no-print",
        className,
      )}
      aria-hidden
    >
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />
    </div>
  );
}
