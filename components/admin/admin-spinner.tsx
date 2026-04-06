import { cn } from "@/lib/utils"

export function AdminSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-sky-500/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-sky-400 border-r-sky-400/40" />
      </div>
      <p className="text-xs font-medium tracking-wide text-slate-500">Loading</p>
    </div>
  )
}
