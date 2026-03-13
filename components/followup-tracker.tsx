"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlarmClock,
  Send,
  Calendar,
  Bell,
  ArrowRight,
  Loader2,
  Timer,
  ListChecks,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { followUps } from "@/lib/api"
import { mapFollowUpApi, type FollowUpItem } from "@/lib/mappers"
import { emails as emailsApi } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

function formatDueDate(dateStr: string) {
  const due = new Date(dateStr)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays === -1) return "Yesterday"
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`
  if (diffDays <= 7) return `In ${diffDays} days`
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const statusConfig = {
  overdue: {
    label: "Overdue",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    accent: "bg-red-500",
    ring: "ring-red-500/20",
    gradient: "from-red-500 to-rose-600",
    icon: AlertTriangle,
  },
  pending: {
    label: "Pending",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    accent: "bg-amber-500",
    ring: "ring-amber-500/20",
    gradient: "from-amber-500 to-orange-500",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    accent: "bg-emerald-500",
    ring: "ring-emerald-500/20",
    gradient: "from-emerald-500 to-teal-600",
    icon: CheckCircle2,
  },
  snoozed: {
    label: "Snoozed",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    accent: "bg-blue-500",
    ring: "ring-blue-500/20",
    gradient: "from-blue-500 to-indigo-600",
    icon: AlarmClock,
  },
}

type FilterStatus = "all" | "overdue" | "pending" | "completed" | "snoozed"

function StatRing({
  value,
  total,
  label,
  icon: Icon,
  gradient,
  color,
  isActive,
  onClick,
}: {
  value: number
  total: number
  label: string
  icon: React.ElementType
  gradient: string
  color: string
  isActive: boolean
  onClick: () => void
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-2xl px-5 py-4 transition-all duration-300",
        "hover:bg-muted/40 hover:scale-[1.02] active:scale-[0.98]",
        isActive && "bg-muted/50 ring-1 ring-primary/20"
      )}
    >
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32" cy="32" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/40"
          />
          <circle
            cx="32" cy="32" r={radius}
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all duration-700 ease-out", color)}
            style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br", gradient)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </button>
  )
}

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

  const overdueCount = items.filter((i) => getEffectiveStatus(i) === "overdue").length
  const pendingCount = items.filter((i) => getEffectiveStatus(i) === "pending").length
  const completedCount = items.filter((i) => getEffectiveStatus(i) === "completed").length
  const totalCount = items.length

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (filter === "all") return true
      return getEffectiveStatus(item) === filter
    })
    return filtered.sort((a, b) => {
      const statusOrder = { overdue: 0, pending: 1, snoozed: 2, completed: 3 }
      const aStatus = getEffectiveStatus(a) as keyof typeof statusOrder
      const bStatus = getEffectiveStatus(b) as keyof typeof statusOrder
      const orderDiff = (statusOrder[aStatus] ?? 1) - (statusOrder[bStatus] ?? 1)
      if (orderDiff !== 0) return orderDiff
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter])

  const handleToggleComplete = (item: FollowUpItem) => {
    const isCompleted = item.status === "completed"
    const promise = isCompleted
      ? followUps.update(item.id, { status: "pending" })
      : followUps.complete(item.id)
    promise
      .then(() => {
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
    setReplyBody("")
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

  const filterTabs: { key: FilterStatus; label: string; count: number; icon: React.ElementType }[] = [
    { key: "all", label: "All", count: items.length, icon: ListChecks },
    { key: "overdue", label: "Overdue", count: overdueCount, icon: AlertTriangle },
    { key: "pending", label: "Pending", count: pendingCount, icon: Clock },
    { key: "completed", label: "Completed", count: completedCount, icon: CheckCircle2 },
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col">
        {/* Hero Header */}
        <header className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.04] via-orange-500/[0.02] to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/[0.03] rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/[0.03] rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 ring-1 ring-amber-500/10">
                  <Timer className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Follow-up Tracker</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Emails awaiting your action or response</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                {overdueCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-red-400/30 text-red-400 bg-red-400/5 gap-1.5 font-semibold px-3 py-1 cursor-pointer hover:bg-red-400/10 transition-colors"
                    onClick={() => setFilter("overdue")}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {overdueCount} overdue
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="border-amber-400/30 text-amber-400 bg-amber-400/5 gap-1.5 font-semibold px-3 py-1 cursor-pointer hover:bg-amber-400/10 transition-colors"
                  onClick={() => setFilter("pending")}
                >
                  <Clock className="h-3 w-3" />
                  {pendingCount} pending
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Stat Rings */}
        <div className="border-b border-border/50 bg-gradient-to-b from-muted/20 to-transparent">
          <div className="flex items-center justify-center gap-2 px-4 py-3">
            <StatRing
              value={overdueCount}
              total={totalCount}
              label="Overdue"
              icon={AlertTriangle}
              gradient={statusConfig.overdue.gradient}
              color="stroke-red-500"
              isActive={filter === "overdue"}
              onClick={() => setFilter(filter === "overdue" ? "all" : "overdue")}
            />
            <StatRing
              value={pendingCount}
              total={totalCount}
              label="Pending"
              icon={Clock}
              gradient={statusConfig.pending.gradient}
              color="stroke-amber-500"
              isActive={filter === "pending"}
              onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
            />
            <StatRing
              value={completedCount}
              total={totalCount}
              label="Completed"
              icon={CheckCircle2}
              gradient={statusConfig.completed.gradient}
              color="stroke-emerald-500"
              isActive={filter === "completed"}
              onClick={() => setFilter(filter === "completed" ? "all" : "completed")}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-border/50 px-5 py-2.5">
          {filterTabs.map((tab) => {
            const TabIcon = tab.icon
            const active = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <TabIcon className="h-3 w-3" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-semibold",
                    active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Follow-up List */}
        <ScrollArea className="flex-1">
          <div className="p-5 flex flex-col gap-2.5">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-2 border-amber-400/20" />
                  <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Loading follow-ups...</p>
                  <p className="text-xs text-muted-foreground mt-1">Scanning your emails for pending items</p>
                </div>
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl scale-150" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-400/5 ring-1 ring-emerald-400/20">
                    <Sparkles className="h-7 w-7 text-emerald-400" />
                  </div>
                </div>
                <p className="text-base font-semibold text-foreground">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-[260px]">
                  No follow-ups in this category. Great job staying on top of things!
                </p>
              </div>
            )}

            {!loading &&
              filteredItems.map((item, idx) => {
                const effectiveStatus = getEffectiveStatus(item) as keyof typeof statusConfig
                const config = statusConfig[effectiveStatus] ?? statusConfig.pending
                const StatusIcon = config.icon
                const isOverdue = effectiveStatus === "overdue"
                const isCompleted = effectiveStatus === "completed"
                const isSnoozed = effectiveStatus === "snoozed"
                const dueDateFormatted = formatDueDate(item.dueDate)
                const dueDate = new Date(item.dueDate)

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "group overflow-hidden border-border/50 transition-all duration-200",
                      "hover:shadow-lg hover:shadow-primary/5 hover:border-border",
                      isCompleted && "opacity-50 hover:opacity-70",
                      isOverdue && "border-red-500/15"
                    )}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="flex">
                      {/* Accent bar */}
                      <div className={cn("w-1 shrink-0 transition-all duration-200", config.accent, isCompleted && "opacity-50")} />

                      <CardContent className="flex-1 p-0">
                        <div className="flex items-start gap-4 p-4">
                          {/* Checkbox */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleComplete(item) }}
                                className={cn(
                                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                                  isCompleted
                                    ? "border-emerald-400 bg-emerald-400 text-white scale-100"
                                    : cn("border-border/60 hover:border-emerald-400 hover:bg-emerald-400/10 hover:scale-110", isOverdue && "border-red-400/40")
                                )}
                              >
                                {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              {isCompleted ? "Mark as pending" : "Mark as done"}
                            </TooltipContent>
                          </Tooltip>

                          {/* Content */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => navigateToEmail(item.emailId)}
                            role="button"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className={cn(
                                  "text-sm font-semibold leading-snug transition-colors",
                                  isCompleted ? "line-through text-muted-foreground" : "text-foreground group-hover:text-primary"
                                )}>
                                  {item.subject}
                                </h3>
                                <div className="flex items-center gap-2.5 mt-2">
                                  <Avatar className="h-5 w-5 ring-1 ring-border/50">
                                    <AvatarFallback className="text-[8px] font-bold bg-gradient-to-br from-muted to-muted/60 text-muted-foreground">
                                      {getInitials(item.from.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium text-muted-foreground">{item.from.name}</span>
                                  <span className="text-muted-foreground/30">·</span>
                                  <span className="text-xs text-muted-foreground/70">
                                    {item.daysWaiting > 0 ? `${item.daysWaiting}d waiting` : "Today"}
                                  </span>
                                </div>
                              </div>

                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-2 py-0.5 shrink-0 gap-1 font-semibold transition-colors",
                                  config.color, config.border, config.bg
                                )}
                              >
                                <StatusIcon className="h-2.5 w-2.5" />
                                {config.label}
                              </Badge>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                              <div className="flex items-center gap-4 text-xs">
                                <div className={cn(
                                  "flex items-center gap-1.5 font-medium",
                                  isOverdue ? "text-red-400" : "text-muted-foreground"
                                )}>
                                  <Calendar className="h-3 w-3" />
                                  <span>{dueDateFormatted}</span>
                                  {isOverdue && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-400/70 ml-0.5">!</span>
                                  )}
                                </div>
                                {item.autoReminderSent && (
                                  <div className="flex items-center gap-1 text-primary/50">
                                    <Bell className="h-3 w-3" />
                                    <span className="text-[11px]">Reminder sent</span>
                                  </div>
                                )}
                              </div>

                              {!isCompleted && !isSnoozed && (
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-1.5 rounded-lg"
                                        onClick={(e) => { e.stopPropagation(); openSnooze(item) }}
                                      >
                                        <AlarmClock className="h-3.5 w-3.5" />
                                        Snooze
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs">Snooze this follow-up</TooltipContent>
                                  </Tooltip>
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs gap-1.5 rounded-lg shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 transition-all"
                                    onClick={(e) => { e.stopPropagation(); openReply(item) }}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    Reply
                                  </Button>
                                </div>
                              )}

                              {isSnoozed && (
                                <Badge variant="outline" className="text-[10px] text-blue-400/70 border-blue-400/20 bg-blue-500/5 gap-1">
                                  <AlarmClock className="h-2.5 w-2.5" />
                                  Snoozed
                                </Badge>
                              )}

                              <ArrowRight className="h-3.5 w-3.5 text-primary/40 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 ml-2" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                )
              })}
          </div>
        </ScrollArea>

        {/* Snooze Dialog */}
        <Dialog open={snoozeOpen} onOpenChange={setSnoozeOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <AlarmClock className="h-4 w-4 text-blue-400" />
                </div>
                Snooze Follow-up
              </DialogTitle>
              {snoozeItem && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{snoozeItem.subject}</p>
              )}
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2.5 py-2">
              {[
                { h: 4, label: "4 hours", desc: "Later today" },
                { h: 8, label: "8 hours", desc: "This evening" },
                { h: 24, label: "1 day", desc: "Tomorrow" },
                { h: 72, label: "3 days", desc: "Later this week" },
              ].map(({ h, label, desc }) => (
                <Button
                  key={h}
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-0.5 hover:bg-blue-500/5 hover:border-blue-500/20 transition-colors"
                  onClick={() => snoozeFor(h)}
                  disabled={snoozeLoading}
                >
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{desc}</span>
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setSnoozeOpen(false)} className="text-xs">
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reply Dialog */}
        <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                Reply
              </DialogTitle>
              {replyItem && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{replyItem.subject}</p>
              )}
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To</label>
                <Input
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="h-9 text-sm rounded-lg"
                  placeholder="recipient@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subject</label>
                <Input
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="h-9 text-sm rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Message</label>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full h-32 rounded-lg border border-border bg-background text-foreground text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" size="sm" onClick={() => setReplyOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={sendReply}
                className="text-xs gap-1.5 shadow-sm shadow-primary/20"
                disabled={replyLoading || !mailboxId}
              >
                {replyLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3 w-3" />
                    Send Reply
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
