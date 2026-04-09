"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Circle,
  Inbox,
  Loader2,
  Mails,
  Plus,
  Settings2,
  Mail,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Clock,
} from "lucide-react"
import { mailboxes as mailboxesApi } from "@/lib/api"
import { mapMailboxApi } from "@/lib/mappers"
import type { Mailbox } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ConnectMailboxCta } from "@/components/connect-mailbox-cta"
import { EditMailboxDialog } from "@/components/edit-mailbox-dialog"
import { cn } from "@/lib/utils"

function dispatchInboxMailboxFilter(mailboxId: string) {
  window.dispatchEvent(new CustomEvent("inbox:setMailboxFilter", { detail: { mailboxId } }))
}

const providerLabel: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  imap: "IMAP",
}

function syncStatusMeta(syncStatus: string | undefined): {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
  className?: string
} {
  switch (syncStatus) {
    case "syncing":
      return {
        label: "Syncing",
        variant: "secondary",
        className: "bg-primary/12 text-primary border-primary/20 gap-1",
      }
    case "pending":
      return {
        label: "Awaiting first sync",
        variant: "outline",
        className: "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/8",
      }
    case "error":
    case "cancelled":
      return {
        label: syncStatus === "cancelled" ? "Cancelled" : "Sync issue",
        variant: "destructive",
        className: "gap-1",
      }
    default:
      return {
        label: "Connected",
        variant: "secondary",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
      }
  }
}

export function MailboxesView({
  onAddMailbox,
  onViewChange,
  onOpenInboxWithMailbox,
  mailboxListKey = 0,
}: {
  onAddMailbox?: () => void
  onViewChange: (view: string) => void
  /** Prefer this over dispatching `inbox:setMailboxFilter` when Inbox is not mounted yet. */
  onOpenInboxWithMailbox?: (mailboxId: string) => void
  mailboxListKey?: number
}) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Mailbox | null>(null)

  const refresh = useCallback(() => {
    mailboxesApi
      .list()
      .then((list) => setMailboxes(list.map(mapMailboxApi)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    mailboxesApi
      .list()
      .then((list) => setMailboxes(list.map(mapMailboxApi)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mailboxListKey])

  useEffect(() => {
    const onUpdated = () => refresh()
    window.addEventListener("mailbox:updated", onUpdated)
    return () => window.removeEventListener("mailbox:updated", onUpdated)
  }, [refresh])

  const stats = useMemo(() => {
    const totalUnread = mailboxes.reduce((s, m) => s + (m.unread ?? 0), 0)
    const totalMessages = mailboxes.reduce((s, m) => s + (m.totalEmails ?? 0), 0)
    const syncing = mailboxes.filter((m) => m.syncStatus === "syncing").length
    return { totalUnread, totalMessages, syncing, count: mailboxes.length }
  }, [mailboxes])

  const openInbox = (mailboxId: string) => {
    if (onOpenInboxWithMailbox) {
      onOpenInboxWithMailbox(mailboxId)
    } else {
      dispatchInboxMailboxFilter(mailboxId)
      onViewChange("inbox")
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border/60 bg-gradient-to-b from-muted/25 via-background to-background">
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 shadow-sm">
                <Mails className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.65rem]">
                  Mailboxes
                </h1>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-xl">
                  Connect Gmail, Outlook, or IMAP accounts. Sync stays in the background — open any mailbox in
                  your inbox with one tap.
                </p>
              </div>
            </div>
            {onAddMailbox && (
              <Button
                className="shrink-0 gap-2 rounded-xl font-semibold shadow-sm h-10 px-5"
                onClick={onAddMailbox}
              >
                <Plus className="h-4 w-4" />
                Add mailbox
              </Button>
            )}
          </div>

          {!loading && mailboxes.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/40 px-4 py-3.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </span>
                <span className="font-semibold text-foreground">{stats.count}</span>
                <span className="text-muted-foreground">
                  account{stats.count !== 1 ? "s" : ""} connected
                </span>
              </div>
              <span className="hidden sm:inline h-4 w-px bg-border" aria-hidden />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">{stats.totalUnread}</span>
                unread
                {stats.totalMessages > 0 && (
                  <>
                    <span className="text-border mx-0.5">·</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {stats.totalMessages.toLocaleString()}
                    </span>
                    messages indexed
                  </>
                )}
              </div>
              {stats.syncing > 0 && (
                <>
                  <span className="hidden sm:inline h-4 w-px bg-border" aria-hidden />
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    {stats.syncing} syncing…
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Loading your mailboxes…</p>
            </div>
          ) : mailboxes.length === 0 ? (
            <div className="mx-auto max-w-2xl">
              <ConnectMailboxCta onConnect={onAddMailbox} variant="hero" />
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {mailboxes.map((mb) => {
                const isSyncing = mb.syncStatus === "syncing"
                const isPending = mb.syncStatus === "pending"
                const isError = mb.syncStatus === "error" || mb.syncStatus === "cancelled"
                const provider = providerLabel[mb.provider] ?? mb.provider
                const status = syncStatusMeta(mb.syncStatus)

                return (
                  <li key={mb.id}>
                    <div
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
                        "hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/25 hover:border-primary/20",
                        isError && "border-destructive/25"
                      )}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                        style={{ backgroundColor: isError ? "var(--destructive)" : mb.color }}
                      />
                      <div className="flex flex-col gap-4 p-5 pl-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 gap-3">
                            <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/50 ring-1 ring-border/60">
                              {isSyncing ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              ) : (
                                <Circle
                                  className="h-4 w-4"
                                  fill={isPending ? "transparent" : isError ? "var(--destructive)" : mb.color}
                                  stroke={isPending ? mb.color : isError ? "var(--destructive)" : mb.color}
                                  strokeWidth={isPending ? 2 : 1.5}
                                />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="font-semibold text-foreground truncate text-[15px]">
                                  {mb.name}
                                </h2>
                                <Badge
                                  variant={status.variant}
                                  className={cn(
                                    "text-[10px] font-semibold uppercase tracking-wide shrink-0",
                                    status.className
                                  )}
                                >
                                  {isSyncing && <RefreshCw className="h-3 w-3 animate-spin" />}
                                  {isError && !isSyncing && <AlertCircle className="h-3 w-3" />}
                                  {status.label}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-sm text-muted-foreground truncate">{mb.email}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 font-medium text-foreground/80">
                                  {provider}
                                </span>
                                {mb.unread > 0 && (
                                  <span className="text-primary font-medium">{mb.unread} unread</span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3 shrink-0 opacity-70" />
                                  {mb.lastSync === "Never" ? "Never synced" : `Last sync ${mb.lastSync}`}
                                </span>
                                {mb.totalEmails != null && mb.totalEmails > 0 && (
                                  <span className="tabular-nums">
                                    {mb.totalEmails.toLocaleString()} messages
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="gap-2 rounded-xl shadow-sm"
                            onClick={() => openInbox(mb.id)}
                          >
                            <Inbox className="h-3.5 w-3.5" />
                            Open inbox
                            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2 rounded-xl border-border/80"
                            onClick={() => setEditing(mb)}
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Rename &amp; color
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </ScrollArea>

      {editing && (
        <EditMailboxDialog
          mailbox={editing}
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          onSaved={refresh}
          onDeleted={refresh}
        />
      )}
    </div>
  )
}
