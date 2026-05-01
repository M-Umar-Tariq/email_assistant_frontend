"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Send, Loader2, X, Trash2, ArrowRight, MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import smartMailLogo from "@/logo/Smart Mail Logo.png"
import { ai as aiApi, type InboxAiFilters } from "@/lib/api"
import { toast } from "sonner"

export type InboxAiFilterApplied = {
  query: string
  summary: string
  filters: InboxAiFilters
}

type ChatTurn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; reply: string; summary: string; filters: InboxAiFilters; resultCount?: number }

const SUGGESTIONS = [
  "Unread messages from this week with attachments",
  "Emails about the quarterly report or budget",
  "Starred messages from the last 30 days",
  "Everything from a specific sender today",
]

function chipsFor(filters: InboxAiFilters): string[] {
  const out: string[] = []
  if (filters.participants?.length) {
    const join = filters.participants_match === "any" ? " or " : " & "
    out.push(filters.participants.map((p) => p).join(join))
  }
  if (filters.from_email) out.push(`From: ${filters.from_email}`)
  if (filters.subject) out.push(`Subject: ${filters.subject}`)
  if (filters.keywords) out.push(`"${filters.keywords}"`)
  if (filters.keywords_any?.length) {
    out.push(filters.keywords_any.map((p) => `"${p}"`).join(" or "))
  }
  if (filters.label) out.push(`Label: ${filters.label}`)
  if (filters.unread_only) out.push("Unread")
  if (filters.read_only) out.push("Read")
  if (filters.starred_only) out.push("Starred")
  if (filters.attachment_filename) out.push(`Attachment: "${filters.attachment_filename}"`)
  else if (filters.has_attachment === true) out.push("Has attachment")
  else if (filters.has_attachment === false) out.push("No attachment")
  if (filters.date_from || filters.date_to) {
    const fmt = (s?: string) => {
      if (!s) return ""
      try { return new Date(s).toLocaleDateString() } catch { return s }
    }
    out.push(`${fmt(filters.date_from)} – ${fmt(filters.date_to)}`)
  }
  return out
}

export function InboxAiFilterSidebar({
  isOpen,
  onClose,
  onApply,
  activeQuery,
  resultCount,
  /** True while the inbox list is refetching for the active AI filter (slow network). */
  inboxMatchesLoading = false,
  onClear,
}: {
  isOpen: boolean
  onClose: () => void
  onApply: (applied: InboxAiFilterApplied) => void
  /** When set, the sidebar shows the active filter chip. */
  activeQuery?: string | null
  /** Number of emails matching the active AI filter (shown next to the query). */
  resultCount?: number | null
  inboxMatchesLoading?: boolean
  /** Called when the user clears the active AI filter from inside the sidebar. */
  onClear: () => void
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const filterAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 280)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      filterAbortRef.current?.abort()
    }
  }, [])

  // Patch the result count onto the latest assistant turn whenever it updates
  // (e.g. page changes after the initial filter load).
  useEffect(() => {
    if (resultCount == null) return
    setTurns((prev) => {
      const next = [...prev]
      for (let i = next.length - 1; i >= 0; i--) {
        const t = next[i]
        if (t.role === "assistant") {
          if (t.resultCount === resultCount) return prev
          next[i] = { ...t, resultCount }
          return next
        }
      }
      return prev
    })
  }, [resultCount])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [turns, loading])

  const lastAssistantId = (() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role === "assistant") return turns[i].id
    }
    return null
  })()

  const send = async (raw: string) => {
    const q = (raw ?? input).trim()
    if (!q || loading) return
    filterAbortRef.current?.abort()
    const ac = new AbortController()
    filterAbortRef.current = ac
    const userTurn: ChatTurn = { id: `u-${Date.now()}`, role: "user", text: q }
    setTurns((prev) => [...prev, userTurn])
    setInput("")
    setLoading(true)
    try {
      const res = await aiApi.inboxFilter(q, { signal: ac.signal })
      if (filterAbortRef.current !== ac) return
      const filters = res.filters || {}
      const hasFilter =
        Boolean(filters.participants?.length) ||
        Boolean(filters.from_email) ||
        Boolean(filters.subject) ||
        Boolean(filters.keywords) ||
        Boolean(filters.keywords_any?.length) ||
        Boolean(filters.label) ||
        Boolean(filters.date_from) ||
        Boolean(filters.date_to) ||
        filters.unread_only === true ||
        filters.read_only === true ||
        filters.starred_only === true ||
        filters.has_attachment === true ||
        filters.has_attachment === false
      // For conversational replies (no filter), summary is "" — don't fabricate a chip label.
      const summary = res.summary || (hasFilter ? "AI filter" : "")
      const reply = (res.response || "").trim() || summary
      const asstTurn: ChatTurn = { id: `a-${Date.now()}`, role: "assistant", reply, summary, filters }
      // Show the model reply as soon as it arrives; inbox list may still load on slow networks.
      setTurns((prev) => [...prev, asstTurn])
      setLoading(false)
      if (hasFilter) {
        onApply({ query: q, summary, filters })
      }
    } catch (err) {
      if (filterAbortRef.current !== ac) return
      const msg = err instanceof Error ? err.message : "AI filter failed"
      if (msg === "Request cancelled") {
        setLoading(false)
        return
      }
      setTurns((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", reply: msg, summary: msg, filters: {} },
      ])
      toast.error(msg)
      setLoading(false)
    }
  }

  const startNewChat = () => {
    if (loading) return
    setTurns([])
    setInput("")
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <aside
      className="flex h-full min-h-0 w-full max-w-[400px] flex-col bg-background"
      aria-hidden={!isOpen}
    >
        {/* Header — match Email AI Chat panel (light strip, not full primary) */}
        <div className="shrink-0 border-b border-border bg-primary/[0.03]">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Image src={smartMailLogo} alt="Smart Mail Filter" className="h-7 w-7 object-contain" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Smart Mail Filter</h3>
              <p className="text-[10px] text-muted-foreground leading-tight">Filter inbox by what you ask</p>
            </div>
            {turns.length > 0 && (
              <button
                type="button"
                onClick={startNewChat}
                disabled={loading}
                title="Clear this conversation and start fresh"
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                aria-label="New chat"
              >
                <MessageSquarePlus className="h-3 w-3" />
                New chat
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close AI filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {activeQuery && (
            <div className="px-4 pb-3">
              <div className="flex items-start justify-between gap-2 rounded-xl border border-border/60 bg-muted/50 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Active filter
                  </p>
                  <p className="truncate text-xs font-medium text-foreground">{activeQuery}</p>
                  {typeof resultCount === "number" ? (
                    <p className="text-[10px] text-muted-foreground">
                      {resultCount} email{resultCount === 1 ? "" : "s"}
                    </p>
                  ) : inboxMatchesLoading ? (
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                      Loading matches…
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={onClear}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2 py-1 text-[10px] font-medium text-foreground transition hover:bg-muted"
                  aria-label="Clear AI filter"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Body — chat */}
        <div className="relative flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="flex flex-col gap-3 px-4 py-4">
              {turns.length === 0 ? (
                <div className="flex flex-col items-center pt-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
                    <Image
                      src={smartMailLogo}
                      alt=""
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-foreground">Ask in plain words</h4>
                  <p className="mt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                    Describe the emails you want to see. I&apos;ll apply the filter to your inbox.
                  </p>
                  <div className="mt-4 flex w-full flex-col gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="group flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                      >
                        <span className="truncate">{s}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                turns.map((t) =>
                  t.role === "user" ? (
                    <div key={t.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-3 py-2 text-xs leading-snug text-primary-foreground shadow-sm">
                        {t.text}
                      </div>
                    </div>
                  ) : (
                    <div key={t.id} className="flex justify-start">
                      <div className="max-w-[90%] rounded-2xl rounded-tl-md border border-border/60 bg-card px-3 py-2 text-xs leading-snug text-foreground shadow-sm">
                        <p className="whitespace-pre-wrap text-foreground">{t.reply}</p>
                        {chipsFor(t.filters).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 border-t border-border/40 pt-2">
                            {chipsFor(t.filters).map((c, i) => (
                              <span
                                key={i}
                                className="inline-flex max-w-[180px] items-center truncate rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                                title={c}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                        {typeof t.resultCount === "number" ? (
                          <p className="mt-1.5 text-[10px] text-muted-foreground">
                            Found {t.resultCount} email{t.resultCount === 1 ? "" : "s"}.
                          </p>
                        ) : chipsFor(t.filters).length > 0 &&
                          inboxMatchesLoading &&
                          t.id === lastAssistantId ? (
                          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                            Updating your inbox…
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ),
                )
              )}
              {loading && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking…
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="shrink-0 border-t border-border/40 bg-background/95 px-3 py-2.5"
        >
          <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-muted/40 px-2.5 py-1.5 transition focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              rows={1}
              placeholder="e.g. unread invoices from March, or PDFs from finance"
              className="min-h-[28px] max-h-32 w-full resize-none bg-transparent py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground/70"
              disabled={loading}
            />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              disabled={loading || !input.trim()}
              className="h-7 w-7 shrink-0 rounded-lg p-0 text-primary hover:bg-primary/10 disabled:opacity-40"
              aria-label="Run AI filter"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
            Press Enter to apply • Shift+Enter for newline
          </p>
        </form>
    </aside>
  )
}
