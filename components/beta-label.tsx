import { cn } from "@/lib/utils"

/** Highlights “Beta” so the version is obvious (amber = pre-release / caution). */
export function BetaLabel({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <span
      className={cn(
        "ml-1 shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 align-middle text-[9px] font-extrabold uppercase leading-none tracking-widest shadow-sm",
        onDark
          ? "border-amber-400/50 bg-amber-500/20 text-amber-100 shadow-amber-950/40 ring-1 ring-amber-400/20"
          : "border-amber-500/55 bg-amber-500/[0.18] text-amber-900 shadow-amber-500/10 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200 dark:shadow-amber-900/20",
        className,
      )}
    >
      Beta
    </span>
  )
}
