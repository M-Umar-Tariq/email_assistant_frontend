"use client"

import { useCallback, useEffect, useState } from "react"
import { Circle, Inbox, Loader2, Mails, Plus, Settings2 } from "lucide-react"
import { mailboxes as mailboxesApi } from "@/lib/api"
import { mapMailboxApi } from "@/lib/mappers"
import type { Mailbox } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ConnectMailboxCta } from "@/components/connect-mailbox-cta"
import { EditMailboxDialog } from "@/components/edit-mailbox-dialog"

function dispatchInboxMailboxFilter(mailboxId: string) {
  window.dispatchEvent(new CustomEvent("inbox:setMailboxFilter", { detail: { mailboxId } }))
}

const providerLabel: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  imap: "IMAP",
}

export function MailboxesView({
  onAddMailbox,
  onViewChange,
  mailboxListKey = 0,
}: {
  onAddMailbox?: () => void
  onViewChange: (view: string) => void
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

  const openInbox = (mailboxId: string) => {
    dispatchInboxMailboxFilter(mailboxId)
    onViewChange("inbox")
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mails className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">Mailboxes</h1>
              <p className="text-sm text-muted-foreground">
                Connect accounts, sync mail, and open a mailbox in the inbox.
              </p>
            </div>
          </div>
          {onAddMailbox && (
            <Button className="shrink-0 gap-2 font-semibold shadow-sm" onClick={onAddMailbox}>
              <Plus className="h-4 w-4" />
              Add mailbox
            </Button>
          )}
        </div>
      </header>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 sm:p-6 max-w-3xl">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading mailboxes…</span>
            </div>
          ) : mailboxes.length === 0 ? (
            <ConnectMailboxCta onConnect={onAddMailbox} variant="hero" />
          ) : (
            <ul className="flex flex-col gap-3">
              {mailboxes.map((mb) => {
                const isSyncing = mb.syncStatus === "syncing"
                const isPending = mb.syncStatus === "pending"
                const isError = mb.syncStatus === "error" || mb.syncStatus === "cancelled"
                const provider = providerLabel[mb.provider] ?? mb.provider
                return (
                  <li
                    key={mb.id}
                    className="rounded-xl border border-border/80 bg-card/50 p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center">
                          {isSyncing ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Circle
                              className="h-3.5 w-3.5"
                              fill={isPending ? "transparent" : isError ? "var(--destructive)" : mb.color}
                              stroke={isPending ? mb.color : isError ? "var(--destructive)" : mb.color}
                              strokeWidth={isPending ? 2 : 1.5}
                            />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{mb.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{mb.email}</p>
                          <p className="mt-1 text-xs text-muted-foreground/80">
                            {provider}
                            {mb.unread > 0 ? ` · ${mb.unread} unread` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openInbox(mb.id)}
                        >
                          <Inbox className="h-3.5 w-3.5" />
                          Open inbox
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEditing(mb)}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Manage
                        </Button>
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
