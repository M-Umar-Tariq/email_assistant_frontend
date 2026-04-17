"use client"

import { Loader2, Sparkles } from "lucide-react"
import { useAiChat } from "@/lib/ai-chat-context"
import { cn } from "@/lib/utils"

type Props = {
  activeView: string
  onOpenAssistant: () => void
}

export function AiQueryBackgroundIndicator({ activeView, onOpenAssistant }: Props) {
  const { isQueryLoading } = useAiChat()

  // Full Assistant screen already shows the in-chat typing state; skip duplicate bar.
  if (!isQueryLoading || activeView === "assistant") {
    return null
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-4 left-1/2 z-[101] flex -translate-x-1/2 items-center gap-2.5",
        "rounded-full border border-border/60 bg-background/95 px-4 py-2.5 shadow-lg shadow-black/10 backdrop-blur-md",
        "animate-in fade-in slide-in-from-bottom-2 duration-300"
      )}
    >
      <div className="pointer-events-auto flex items-center gap-2.5">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/20">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <Sparkles className="absolute -right-0.5 -top-0.5 h-3 w-3 text-primary" />
        </div>
        <div className="max-w-[min(90vw,280px)]">
          <p className="text-xs font-semibold text-foreground leading-tight">AI is answering…</p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
            You can keep browsing; the reply will appear in Assistant when ready.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAssistant}
          className="pointer-events-auto shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          Open
        </button>
      </div>
    </div>
  )
}
