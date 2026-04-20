"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  RefreshCw,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  Inbox,
  Loader2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { emails as emailsApi, type EmailListApi } from "@/lib/api"
import { mapEmailListApi } from "@/lib/mappers"
import type { Email } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type StatusFilter = "pending" | "added" | "dismissed" | "all"

type Counts = { total: number; pending: number; added: number; dismissed: number }

const EMPTY_COUNTS: Counts = { total: 0, pending: 0, added: 0, dismissed: 0 }

const FILTERS: { id: StatusFilter; label: string; description: string }[] = [
  { id: "pending", label: "Pending", description: "Waiting for your approval" },
  { id: "added", label: "Added", description: "Already on your calendar" },
  { id: "dismissed", label: "Dismissed", description: "You chose to ignore these" },
  { id: "all", label: "All", description: "Every meeting Smart Mail AI found" },
]

function formatWhen(startIso?: string | null, endIso?: string | null): string {
  if (!startIso) return "No time detected"
  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) return "No time detected"
  const dateStr = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  const timeStr = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  let out = `${dateStr} · ${timeStr}`
  if (endIso) {
    const end = new Date(endIso)
    if (!Number.isNaN(end.getTime())) {
      out += ` – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
    }
  }
  return out
}

function getInitials(name: string, fallback: string): string {
  const source = name?.trim() || fallback || "?"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export function MeetingRequestsView({
  onOpenEmail,
}: {
  onOpenEmail: (emailId: string) => void
}) {
  const [status, setStatus] = useState<StatusFilter>("pending")
  const [emails, setEmails] = useState<Email[]>([])
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyEmailId, setBusyEmailId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await emailsApi.withMeetings({
        status: status === "all" ? undefined : status,
      })
      setEmails((res.emails as EmailListApi[]).map(mapEmailListApi))
      setCounts({
        total: res.total ?? 0,
        pending: res.pending ?? 0,
        added: res.added ?? 0,
        dismissed: res.dismissed ?? 0,
      })
    } catch (e) {
      setError((e as Error).message || "Failed to load meeting requests")
      setEmails([])
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const refresh = () => load()
    window.addEventListener("meetings:updated", refresh)
    window.addEventListener("email:sync", refresh)
    return () => {
      window.removeEventListener("meetings:updated", refresh)
      window.removeEventListener("email:sync", refresh)
    }
  }, [load])

  const handleAdd = async (email: Email) => {
    setBusyEmailId(email.id)
    try {
      await emailsApi.addMeeting(email.id)
      toast.success("Added to your calendar")
      window.dispatchEvent(new CustomEvent("calendar:updated"))
      window.dispatchEvent(
        new CustomEvent("meetings:updated", {
          detail: { emailId: email.id, action: "added" },
        }),
      )
      await load()
    } catch (e) {
      toast.error((e as Error).message || "Could not add this meeting")
    } finally {
      setBusyEmailId(null)
    }
  }

  const handleDismiss = async (email: Email) => {
    setBusyEmailId(email.id)
    try {
      await emailsApi.dismissMeeting(email.id)
      window.dispatchEvent(
        new CustomEvent("meetings:updated", {
          detail: { emailId: email.id, action: "dismissed" },
        }),
      )
      await load()
    } catch (e) {
      toast.error((e as Error).message || "Could not dismiss")
    } finally {
      setBusyEmailId(null)
    }
  }

  const headline = useMemo(() => {
    if (counts.pending === 0) return "No meetings waiting for approval"
    if (counts.pending === 1) return "1 email has a meeting waiting for your approval"
    return `${counts.pending} emails have meetings waiting for your approval`
  }, [counts.pending])

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-indigo-400">
              <CalendarPlus className="h-5 w-5 shrink-0" />
              <h1 className="text-lg font-semibold text-foreground sm:text-xl">
                Meeting Requests
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {headline}. Smart Mail AI never adds events to your calendar
              automatically — you decide.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 self-start sm:self-auto"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 border-b border-border bg-card/30 px-4 py-3 sm:grid-cols-4 sm:px-6">
        <StatCard
          label="Pending"
          value={counts.pending}
          icon={Clock}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
        <StatCard
          label="Added"
          value={counts.added}
          icon={CalendarCheck}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <StatCard
          label="Dismissed"
          value={counts.dismissed}
          icon={CalendarX}
          color="text-muted-foreground"
          bg="bg-muted/60"
        />
        <StatCard
          label="Total detected"
          value={counts.total}
          icon={CalendarPlus}
          color="text-indigo-400"
          bg="bg-indigo-500/10"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 py-2 sm:px-6">
        {FILTERS.map((f) => {
          const isOn = status === f.id
          const count =
            f.id === "pending"
              ? counts.pending
              : f.id === "added"
                ? counts.added
                : f.id === "dismissed"
                  ? counts.dismissed
                  : counts.total
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatus(f.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isOn
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              title={f.description}
            >
              {f.label}
              <span
                className={cn(
                  "ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums",
                  isOn ? "bg-primary/20 text-primary" : "bg-muted/70 text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* List */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-4 sm:px-6">
          {loading && emails.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : emails.length === 0 ? (
            <EmptyState status={status} />
          ) : (
            <div className="flex flex-col gap-3">
              {emails.map((email) => (
                <MeetingRequestCard
                  key={email.id}
                  email={email}
                  busy={busyEmailId === email.id}
                  onOpen={() => onOpenEmail(email.id)}
                  onAdd={() => handleAdd(email)}
                  onDismiss={() => handleDismiss(email)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  bg: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", bg)}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-base font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}

function MeetingRequestCard({
  email,
  busy,
  onOpen,
  onAdd,
  onDismiss,
}: {
  email: Email
  busy: boolean
  onOpen: () => void
  onAdd: () => void
  onDismiss: () => void
}) {
  const info = email.schedulingInfo
  const statusValue = info?.status ?? "pending"
  const senderName = email.from?.name || email.from?.email || "Unknown"
  const initials = getInitials(email.from?.name || "", email.from?.email || "")

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{senderName}</p>
            {statusValue === "added" && (
              <Badge
                variant="outline"
                className="border-emerald-400/30 bg-emerald-400/5 text-[10px] font-medium text-emerald-500"
              >
                on calendar
              </Badge>
            )}
            {statusValue === "dismissed" && (
              <Badge
                variant="outline"
                className="border-muted-foreground/20 bg-muted/40 text-[10px] font-medium text-muted-foreground"
              >
                dismissed
              </Badge>
            )}
            {statusValue === "pending" && (
              <Badge
                variant="outline"
                className="border-amber-400/30 bg-amber-400/5 text-[10px] font-medium text-amber-500"
              >
                pending
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-foreground/90">{email.subject || "(no subject)"}</p>
          {email.preview && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{email.preview}</p>
          )}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>

      <div className="border-t border-border/60 bg-muted/30 px-4 py-3">
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span className="truncate">{formatWhen(info?.startIso, info?.endIso)}</span>
          </div>
          {info?.location && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-indigo-400" />
              <span className="truncate">{info.location}</span>
            </div>
          )}
          {info?.attendees && info.attendees.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              <span className="truncate">{info.attendees.length} attendees</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Inbox className="h-3.5 w-3.5 text-indigo-400" />
            <span className="truncate">{info?.title || email.subject || "Meeting"}</span>
          </div>
        </div>

        {statusValue === "pending" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-7 gap-1.5 bg-indigo-500 text-xs text-white hover:bg-indigo-600"
              onClick={onAdd}
              disabled={busy}
            >
              {busy ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <CalendarPlus className="h-3 w-3" />
              )}
              Add to my calendar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={onDismiss}
              disabled={busy}
            >
              <X className="h-3 w-3" />
              No, ignore
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={onOpen}
            >
              Open email
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}

        {statusValue === "added" && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            On your calendar. Manage it from the Calendar view.
          </div>
        )}

        {statusValue === "dismissed" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            You chose to ignore this detection.
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={onAdd}
              disabled={busy}
            >
              {busy ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <CalendarPlus className="h-3 w-3" />
              )}
              Add anyway
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ status }: { status: StatusFilter }) {
  const copy = {
    pending: {
      title: "Nothing waiting on you",
      body: "New meetings Smart Mail AI finds in your inbox will show up here before touching your calendar.",
    },
    added: {
      title: "No meetings added yet",
      body: "When you approve a detected meeting, it will appear here and on your Calendar.",
    },
    dismissed: {
      title: "No dismissed meetings",
      body: "Meetings you choose to ignore will collect here.",
    },
    all: {
      title: "No meetings detected yet",
      body: "Sync your mailbox and Smart Mail AI will surface meetings for you to approve.",
    },
  }[status]
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-400/10 text-indigo-400">
        <CalendarPlus className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{copy.title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{copy.body}</p>
    </div>
  )
}
