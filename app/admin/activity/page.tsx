"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Activity, Inbox, Megaphone, RefreshCw, UserPlus } from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminApi, type AdminActivityEvent } from "@/lib/api"
import { cn } from "@/lib/utils"

function relativeTime(ts: string | null | undefined): string {
  if (!ts) return "—"
  const diff = Date.now() - new Date(ts).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return "Just now"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? "Yesterday" : `${days}d ago`
}

function formatDate(ts: string | null | undefined): string {
  if (!ts) return ""
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const eventConfig: Record<string, { icon: typeof Activity; label: string; color: string; dotColor: string }> = {
  user_registered: {
    icon: UserPlus,
    label: "User registered",
    color: "text-emerald-400",
    dotColor: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]",
  },
  mailbox_added: {
    icon: Inbox,
    label: "Mailbox added",
    color: "text-violet-400",
    dotColor: "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.6)]",
  },
  sync_completed: {
    icon: RefreshCw,
    label: "Sync completed",
    color: "text-sky-400",
    dotColor: "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]",
  },
  feedback_submitted: {
    icon: Megaphone,
    label: "Feedback",
    color: "text-amber-400",
    dotColor: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]",
  },
}

function EventRow({ event }: { event: AdminActivityEvent }) {
  const config = eventConfig[event.type] || {
    icon: Activity,
    label: event.type,
    color: "text-slate-400",
    dotColor: "bg-slate-400",
  }
  const Icon = config.icon

  return (
    <div className="group relative flex gap-4 py-4">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] transition-colors group-hover:bg-white/[0.06]")}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <div className="mt-2 w-px flex-1 bg-gradient-to-b from-white/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", config.color)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
            {config.label}
          </span>
          <span className="text-[10px] tabular-nums text-slate-600">{relativeTime(event.timestamp)}</span>
        </div>
        <div className="mt-1.5 text-sm leading-relaxed text-slate-300">
          {event.type === "user_registered" && (
            <>
              <Link href={`/admin/users/${event.user_id}`} className="font-medium text-sky-300 hover:underline">
                {event.user_name || event.user_email}
              </Link>{" "}
              created an account
            </>
          )}
          {event.type === "mailbox_added" && (
            <>
              <Link href={`/admin/users/${event.user_id}`} className="font-medium text-sky-300 hover:underline">
                {event.user_email}
              </Link>{" "}
              connected <span className="text-slate-100">{event.mailbox_email}</span>
            </>
          )}
          {event.type === "sync_completed" && (
            <>
              Mailbox <span className="text-slate-100">{event.mailbox_email}</span> synced
              {event.sync_status && event.sync_status !== "synced" && (
                <span className="ml-1 text-amber-400">({event.sync_status})</span>
              )}
            </>
          )}
          {event.type === "feedback_submitted" && (
            <>
              {event.user_id ? (
                <Link href={`/admin/users/${event.user_id}`} className="font-medium text-sky-300 hover:underline">
                  {event.user_email}
                </Link>
              ) : (
                <span className="font-medium text-slate-200">{event.user_email}</span>
              )}{" "}
              submitted{" "}
              <span className="text-slate-100">{event.category || "general"}</span> feedback
              {event.message_preview && (
                <span className="mt-1 block text-slate-500">&ldquo;{event.message_preview}&rdquo;</span>
              )}
            </>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-slate-600">{formatDate(event.timestamp)}</p>
      </div>
    </div>
  )
}

export default function AdminActivityPage() {
  const [events, setEvents] = useState<AdminActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    adminApi
      .activity(50)
      .then(setEvents)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="border-b border-white/5 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">Monitor</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Activity</h1>
          <p className="mt-1 text-sm text-slate-400">
            Registrations, mailboxes, syncs, and in-app feedback submissions.
          </p>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <Card className="admin-card rounded-xl border-0">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
                <span className="text-sm">Loading events…</span>
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                <Activity className="h-10 w-10 opacity-30" />
                <span>No activity recorded yet.</span>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {events.map((e, i) => (
                  <EventRow key={i} event={e} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
