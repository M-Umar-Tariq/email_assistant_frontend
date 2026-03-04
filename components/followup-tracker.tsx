"use client"

import { useState, useEffect } from "react"
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlarmClock,
  Send,
  Calendar,
  Sparkles,
  Bell,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { followUps } from "@/lib/api"
import { mapFollowUpApi, type FollowUpItem } from "@/lib/mappers"
import { emails as emailsApi } from "@/lib/api"
import { toast } from "sonner"

const CACHE_TTL_MS = 60_000
let FOLLOWUPS_CACHE: { items: FollowUpItem[]; timestamp: number } | null = null

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const statusConfig = {
  overdue: { label: "Overdue", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", icon: AlertTriangle },
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: Clock },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: CheckCircle2 },
  snoozed: { label: "Snoozed", color: "text-muted-foreground", bg: "bg-muted", border: "border-border", icon: AlarmClock },
}

type FilterStatus = "all" | "overdue" | "pending" | "completed" | "snoozed"

export function FollowupTracker() {
  const [filter, setFilter] = useState<FilterStatus>("all")
  const [items, setItems] = useState<FollowUpItem[]>([])
  const [loading, setLoading] = useState(true)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyItem, setReplyItem] = useState<FollowUpItem | null>(null)
  const [replyTo, setReplyTo] = useState("")
  const [replySubject, setReplySubject] = useState("")
  const [replyBody, setReplyBody] = useState("")
  const [mailboxId, setMailboxId] = useState<string | null>(null)
  const [replyLoading, setReplyLoading] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [snoozeItem, setSnoozeItem] = useState<FollowUpItem | null>(null)
  const [snoozeLoading, setSnoozeLoading] = useState(false)

  useEffect(() => {
    const cached = FOLLOWUPS_CACHE
    const now = Date.now()
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      setItems(cached.items)
      setLoading(false)
      return
    }
    followUps
      .autoToday()
      .catch(() => {})
      .finally(() => {
        followUps
          .list()
          .then((list) => {
            const mapped = list.map(mapFollowUpApi)
            setItems(mapped)
            FOLLOWUPS_CACHE = { items: mapped, timestamp: Date.now() }
          })
          .catch(() => {})
          .finally(() => setLoading(false))
      })
  }, [])

  useEffect(() => {
    const onMailboxUpdated = () => {
      FOLLOWUPS_CACHE = null
    }
    window.addEventListener("mailbox:updated", onMailboxUpdated)
    return () => window.removeEventListener("mailbox:updated", onMailboxUpdated)
  }, [])

  const getEffectiveStatus = (item: FollowUpItem) => {
    const s = item.status
    if (s === "completed" || s === "snoozed") return s
    const due = new Date(item.dueDate)
    if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now() && s !== "overdue") {
      return "overdue"
    }
    return s
  }

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true
    return getEffectiveStatus(item) === filter
  })

  const overdueCount = items.filter((i) => getEffectiveStatus(i) === "overdue").length
  const pendingCount = items.filter((i) => getEffectiveStatus(i) === "pending").length
  const completedCount = items.filter((i) => getEffectiveStatus(i) === "completed").length

  const handleToggleComplete = (item: FollowUpItem) => {
    const isCompleted = item.status === "completed"
    const promise = isCompleted
      ? followUps.update(item.id, { status: "pending" })
      : followUps.complete(item.id)
    promise
      .then((updated) => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: (isCompleted ? "pending" : "completed") }
              : i
          )
        )
        FOLLOWUPS_CACHE = { items: FOLLOWUPS_CACHE?.items ? prevMerge(FOLLOWUPS_CACHE.items, item.id, isCompleted ? "pending" : "completed") : [], timestamp: Date.now() }
      })
      .catch(() => {})
  }

  function prevMerge(list: FollowUpItem[], id: string, status: string): FollowUpItem[] {
    return list.map((i) => (i.id === id ? { ...i, status } : i))
  }

  const navigateToEmail = (emailId: string, reply?: boolean) => {
    window.dispatchEvent(
      new CustomEvent("followups:navigate", {
        detail: { emailId, action: reply ? "reply" : undefined },
      })
    )
  }

  const openReply = (item: FollowUpItem) => {
    setReplyItem(item)
    setReplyTo(item.from.email || "")
    const prefix = item.subject?.startsWith("Re: ") ? "" : "Re: "
    setReplySubject(`${prefix}${item.subject || ""}`)
    setReplyBody(item.suggestedAction || "")
    setReplyOpen(true)
    setMailboxId(null)
    setReplyLoading(true)
    emailsApi
      .get(item.emailId)
      .then((detail) => {
        setMailboxId(detail.mailbox_id)
      })
      .catch(() => {})
      .finally(() => setReplyLoading(false))
  }

  const sendReply = () => {
    if (!replyItem || !mailboxId) return
    setReplyLoading(true)
    emailsApi
      .reply(replyItem.emailId, { mailbox_id: mailboxId, to: replyTo ? [replyTo] : [], subject: replySubject, body: replyBody })
      .then(() => {
        toast.success("Reply sent")
        setReplyOpen(false)
        setReplyItem(null)
        setReplyBody("")
      })
      .catch((err) => {
        toast.error(err?.message ?? "Failed to send")
      })
      .finally(() => setReplyLoading(false))
  }

  const openSnooze = (item: FollowUpItem) => {
    setSnoozeItem(item)
    setSnoozeOpen(true)
  }

  const snoozeFor = (hours: number) => {
    if (!snoozeItem) return
    setSnoozeLoading(true)
    emailsApi
      .snooze(snoozeItem.emailId, hours)
      .then(() => followUps.update(snoozeItem.id, { status: "snoozed" }))
      .then(() => {
        setItems((prev) => prev.map((i) => (i.id === snoozeItem.id ? { ...i, status: "snoozed" } : i)))
        toast.success(`Snoozed for ${hours}h`)
        setSnoozeOpen(false)
        setSnoozeItem(null)
      })
      .catch((err) => {
        toast.error(err?.message ?? "Failed to snooze")
      })
      .finally(() => setSnoozeLoading(false))
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10">
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Follow-up Tracker</h1>
            <p className="text-xs text-muted-foreground">Emails awaiting your action or response</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-red-400/30 text-red-400 text-xs">
            {overdueCount} overdue
          </Badge>
          <Badge variant="outline" className="border-amber-400/30 text-amber-400 text-xs">
            {pendingCount} pending
          </Badge>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 border-b border-border p-4">
        <Card className="bg-red-400/5 border-red-400/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-400/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{overdueCount}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-400/5 border-amber-400/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-400/5 border-emerald-400/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border px-4 py-2">
        {(["all", "overdue", "pending", "completed"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors capitalize ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {f === "all" ? "All" : statusConfig[f].label}
          </button>
        ))}
      </div>

      {/* Follow-up list */}
      <ScrollArea className="flex-1">
        <div className="p-4 flex flex-col gap-3">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {!loading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No follow-ups in this category</p>
              <p className="text-xs mt-1">You{"'"}re all caught up</p>
            </div>
          )}

          {!loading &&
            filteredItems.map((item) => {
              const effectiveStatus = getEffectiveStatus(item) as keyof typeof statusConfig
              const config = statusConfig[effectiveStatus] ?? statusConfig.pending
              const StatusIcon = config.icon
              const dueDate = new Date(item.dueDate)
              const isOverdue = effectiveStatus === "overdue"
              const isCompleted = effectiveStatus === "completed"

              return (
                <Card
                  key={item.id}
                  className={`${config.border} ${isCompleted ? "opacity-60" : ""} transition-all`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(item) }}
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isCompleted
                            ? "border-emerald-400 bg-emerald-400 text-primary-foreground"
                            : `${config.border} hover:border-emerald-400`
                        }`}
                      >
                        {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>

                      <div className="flex-1 min-w-0" onClick={() => navigateToEmail(item.emailId)} role="button">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className={`text-sm font-semibold ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {item.subject}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                                  {getInitials(item.from.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">{item.from.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.daysWaiting > 0 ? `${item.daysWaiting}d waiting` : "Today"}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${config.color} border-current/20 shrink-0`}>
                            <StatusIcon className="h-2.5 w-2.5 mr-1" />
                            {config.label}
                          </Badge>
                        </div>

                        <div className="mt-2 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2">
                          <Sparkles className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-xs text-foreground/80">{item.suggestedAction}</span>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className={isOverdue ? "text-red-400 font-medium" : ""}>
                                Due {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            {item.autoReminderSent && (
                              <div className="flex items-center gap-1 text-primary/60">
                                <Bell className="h-3 w-3" />
                                <span>Reminder sent</span>
                              </div>
                            )}
                          </div>

                          {!isCompleted && (
                            <div className="flex items-center gap-1.5">
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1" onClick={(e) => { e.stopPropagation(); openSnooze(item) }}>
                                <AlarmClock className="h-3 w-3" />
                                Snooze
                              </Button>
                              <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1" onClick={(e) => { e.stopPropagation(); openReply(item) }}>
                                <Send className="h-3 w-3" />
                                Reply
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </ScrollArea>
      <Dialog open={snoozeOpen} onOpenChange={setSnoozeOpen}>
        <DialogContent className="p-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Snooze</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {[4, 8, 24, 72].map((h) => (
              <Button key={h} variant="outline" size="sm" className="h-8 text-xs" onClick={() => snoozeFor(h)} disabled={snoozeLoading}>
                {h}h
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSnoozeOpen(false)} className="h-8 text-xs">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="p-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Reply</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12">To</span>
              <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12">Subject</span>
              <Input value={replySubject} onChange={(e) => setReplySubject(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Type your reply..." className="w-full h-28 rounded-md border bg-background text-foreground text-sm p-2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReplyOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button size="sm" onClick={sendReply} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90" disabled={replyLoading || !mailboxId}>
              {replyLoading ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
