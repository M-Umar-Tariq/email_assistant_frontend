"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Clock,
  Calendar,
  Star,
  ShieldAlert,
  Info,
  ArrowRight,
  Mail,
  MailOpen,
  MailX,
  Reply,
  Inbox,
  CheckCircle2,
  XCircle,
  Sparkles,
  X,
  Check,
  Users,
  BarChart3,
  Activity,
  Eye,
  Send,
  Loader2,
  Brain,
  RefreshCw,
  MessageSquare,
  Briefcase,
  UserCheck,
  Hash,
  Zap,
  ChevronDown,
  TrendingUp,
  Sun,
  Moon,
  Sunset,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  briefing as briefingApi,
  emails as emailsApi,
  mailboxes as mailboxesApi,
  analytics as analyticsApi,
  agent as agentApi,
  type AgentProfile,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { mapBriefingItem, mapEmailListApi } from "@/lib/mappers"
import type { Mailbox, BriefingItem, Email } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export type InboxFilter =
  | "today"
  | "today_unread"
  | "today_replied"
  | "today_unreplied"
  | "total_unread"
  | "total_replied"
  | "total_unreplied"

const typeConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; accent: string; label: string; groupLabel: string; groupOrder: number }
> = {
  urgent: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", accent: "border-l-red-500", label: "Urgent", groupLabel: "Needs Immediate Attention", groupOrder: 0 },
  followup: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", accent: "border-l-amber-500", label: "Follow-up", groupLabel: "Follow-ups Due", groupOrder: 1 },
  deadline: { icon: Calendar, color: "text-orange-400", bg: "bg-orange-400/10", accent: "border-l-orange-500", label: "Deadline", groupLabel: "Upcoming Deadlines", groupOrder: 2 },
  vip: { icon: Star, color: "text-primary", bg: "bg-primary/10", accent: "border-l-primary", label: "VIP", groupLabel: "VIP Messages", groupOrder: 3 },
  risk: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-400/10", accent: "border-l-red-500", label: "Risk", groupLabel: "Potential Risks", groupOrder: 4 },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10", accent: "border-l-blue-500", label: "Info", groupLabel: "Recent Updates", groupOrder: 5 },
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getGreetingIcon(hour: number) {
  if (hour < 12) return Sun
  if (hour < 17) return Sunset
  return Moon
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  totalValue,
  icon: Icon,
  gradientFrom,
  gradientTo,
  onClick,
}: {
  label: string
  value: string | number
  totalValue?: string | number
  icon: React.ElementType
  gradientFrom: string
  gradientTo: string
  onClick?: () => void
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/50 transition-all duration-300",
        onClick && "cursor-pointer hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
      )}
      onClick={onClick}
    >
      <div className={cn("absolute inset-0 opacity-[0.03]", `bg-gradient-to-br ${gradientFrom} ${gradientTo}`)} />
      <CardContent className="relative p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", `bg-gradient-to-br ${gradientFrom} ${gradientTo}`)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
            <span className="text-[10px] font-medium text-muted-foreground/70 uppercase">today</span>
          </div>
          {totalValue !== undefined && (
            <div className="text-right flex items-baseline gap-1">
              <span className="text-base font-semibold text-muted-foreground/80">{totalValue}</span>
              <span className="text-[9px] font-medium text-muted-foreground/50 uppercase">total</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function MailboxStatus({ mailboxes }: { mailboxes: Mailbox[] }) {
  if (mailboxes.length === 0) return null
  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
            <Inbox className="h-3.5 w-3.5 text-primary" />
          </div>
          Mailbox Status
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-4">
        {mailboxes.map((mb) => (
          <div key={mb.id} className="flex items-start justify-between gap-4 rounded-lg bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background" style={{ backgroundColor: mb.color, boxShadow: `0 0 8px ${mb.color}40` }} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight">{mb.name}</p>
                <p className="text-[11px] text-muted-foreground break-all">{mb.email}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {mb.unread > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5">
                  {mb.unread} unread
                </Badge>
              )}
              <div className="flex items-center gap-1.5">
                {mb.syncStatus === "syncing" ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                ) : mb.syncStatus === "error" ? (
                  <XCircle className="h-3 w-3 text-red-400" />
                ) : mb.synced ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Clock className="h-3 w-3 text-amber-400" />
                )}
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {mb.syncStatus === "syncing" ? "Syncing..." : mb.syncStatus === "pending" ? "Not synced yet" : mb.lastSync}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/* ─── AI Summary Banner ─────────────────────────────────────────────── */

type MailboxSnapshot = {
  mailbox_name: string
  mailbox_email: string
  color: string
  today_count: number
  summary: string
}

function renderSummaryLines(summary: string | string[]) {
  const text = Array.isArray(summary) ? summary.join("\n") : String(summary ?? "")
  return text.split("\n").filter(Boolean).map((line, i) => {
    const cleaned = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim()
    if (!cleaned) return null
    const isBullet = cleaned.startsWith("- ") || cleaned.startsWith("• ")
    const text = isBullet ? cleaned.slice(2) : cleaned
    const colonIdx = text.indexOf(":")
    if (isBullet && colonIdx > 0 && colonIdx < 40) {
      const heading = text.slice(0, colonIdx)
      const rest = text.slice(colonIdx + 1).trim()
      return (
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className="text-primary/70 mt-0.5 text-[10px]">&#9679;</span>
          <p className="text-[13px] leading-relaxed"><span className="font-medium text-foreground">{heading}:</span> <span className="text-muted-foreground">{rest}</span></p>
        </div>
      )
    }
    if (isBullet) {
      return (
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className="text-primary/70 mt-0.5 text-[10px]">&#9679;</span>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{text}</p>
        </div>
      )
    }
    return <p key={i} className="text-[13px] leading-relaxed text-muted-foreground py-0.5">{cleaned}</p>
  })
}

function AiSummaryBanner() {
  const [snapshots, setSnapshots] = useState<MailboxSnapshot[] | null>(null)
  const [loading, setLoading] = useState(false)
  const fetchSummary = useCallback(() => {
    setLoading(true)
    setSnapshots(null)
    briefingApi
      .ai()
      .then((res) => setSnapshots(res.briefing))
      .catch(() => setSnapshots(null))
      .finally(() => setLoading(false))
  }, [])

  if (!snapshots && !loading) {
    return (
      <div className="relative mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] via-primary/[0.02] to-transparent p-[1px] overflow-hidden">
        <div className="rounded-[11px] bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">AI Snapshot</h3>
                <p className="text-xs text-muted-foreground">Get a smart summary of today&apos;s emails</p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5 rounded-lg shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
              onClick={fetchSummary}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mb-6 rounded-xl border border-primary/20 overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
      <div className="relative bg-gradient-to-r from-primary/[0.04] to-transparent">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">AI Snapshot</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={() => setSnapshots(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-3 py-6 justify-center">
              <div className="relative">
                <div className="h-8 w-8 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
              <span className="text-sm text-muted-foreground">Analyzing today&apos;s emails...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {snapshots!.map((mb, idx) => (
                <div key={idx} className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden transition-all hover:border-border">
                  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-muted/20 border-b border-border/30">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-offset-1 ring-offset-background" style={{ backgroundColor: mb.color, boxShadow: `0 0 6px ${mb.color}30` }} />
                    <span className="text-sm font-medium text-foreground">{mb.mailbox_name}</span>
                    <span className="text-[11px] text-muted-foreground">({mb.mailbox_email})</span>
                    <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0.5 bg-primary/10 text-primary font-semibold">
                      {mb.today_count} {mb.today_count === 1 ? "email" : "emails"}
                    </Badge>
                  </div>
                  <div className="px-4 py-3 space-y-0.5">
                    {renderSummaryLines(mb.summary)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Email Trends Chart (7 days) ───────────────────────────────────── */

function EmailTrendsChart({ refreshKey }: { refreshKey: number }) {
  const [volumeData, setVolumeData] = useState<{ date: string; received: number }[]>([])

  useEffect(() => {
    analyticsApi.volume(7).then(setVolumeData).catch(() => {})
  }, [refreshKey])

  const maxVal = Math.max(...volumeData.map((d) => d.received), 1)
  const totalEmails = volumeData.reduce((a, d) => a + d.received, 0)
  const avgPerDay = Math.round(totalEmails / Math.max(volumeData.length, 1))

  if (volumeData.length === 0) return null

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10">
              <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
            </div>
            Email Volume
          </CardTitle>
          <Badge variant="outline" className="text-[10px] px-2 py-0 border-border/60 text-muted-foreground font-medium">
            7 days
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-3 pb-4">
        {(() => {
          const todayAbbr = new Date().toLocaleDateString("en", { weekday: "short" })
          return (
            <div className="flex items-end justify-between gap-2" style={{ height: 100 }}>
              {volumeData.map((d, i) => {
                const barH = Math.max(Math.round((d.received / maxVal) * 80), 4)
                const isCurrent = d.date === todayAbbr
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <span className="text-[10px] text-foreground font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 mb-1.5 bg-popover border border-border rounded px-1.5 py-0.5 shadow-sm">
                      {d.received}
                    </span>
                    <div className="relative w-full rounded-md overflow-hidden" style={{ height: barH }}>
                      <div
                        className={cn(
                          "absolute inset-0 transition-all duration-300 rounded-md",
                          isCurrent
                            ? "bg-gradient-to-t from-primary to-primary/70"
                            : "bg-gradient-to-t from-primary/25 to-primary/10 group-hover:from-primary/40 group-hover:to-primary/20"
                        )}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] mt-1.5 font-medium",
                      isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                    )}>
                      {d.date}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })()}
        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-3">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span className="font-medium text-foreground">{totalEmails}</span> total
          </span>
          <span><span className="font-medium text-foreground">{avgPerDay}</span> avg/day</span>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Top Senders ────────────────────────────────────────────────────── */

const senderColors = [
  "from-primary to-blue-600",
  "from-purple-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
]

function TopSenders({ refreshKey }: { refreshKey: number }) {
  const [senders, setSenders] = useState<{ email: string; name: string; count: number }[]>([])

  useEffect(() => {
    analyticsApi.topSenders(5).then(setSenders).catch(() => {})
  }, [refreshKey])

  if (senders.length === 0) return null

  const maxCount = Math.max(...senders.map((s) => s.count), 1)

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10">
            <Users className="h-3.5 w-3.5 text-purple-400" />
          </div>
          Top Senders
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pb-4">
        {senders.map((s, i) => (
          <div key={s.email} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/30">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white bg-gradient-to-br", senderColors[i % senderColors.length])}>
              {s.name ? s.name.charAt(0).toUpperCase() : s.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-foreground truncate">{s.name || s.email}</p>
                <span className="text-[10px] text-muted-foreground ml-2 shrink-0 font-medium">{s.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500 bg-gradient-to-r", senderColors[i % senderColors.length])}
                  style={{ width: `${(s.count / maxCount) * 100}%`, opacity: 0.7 }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/* ─── Recent Activity Feed ───────────────────────────────────────────── */

function RecentActivityFeed({ emails }: { emails: Email[] }) {
  const activities = useMemo(() => {
    const sorted = [...emails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)
    return sorted.map((e) => {
      let action: string
      let icon: React.ElementType
      let iconBg: string
      let iconColor: string
      if (e.repliedAt) {
        action = "Replied"
        icon = Send
        iconBg = "bg-emerald-500/10"
        iconColor = "text-emerald-400"
      } else if (e.read) {
        action = "Read"
        icon = Eye
        iconBg = "bg-blue-500/10"
        iconColor = "text-blue-400"
      } else {
        action = "Received"
        icon = Mail
        iconBg = "bg-primary/10"
        iconColor = "text-primary"
      }
      return { id: e.id, action, subject: e.subject, from: e.from.name || e.from.email, date: e.date, icon, iconBg, iconColor }
    })
  }, [emails])

  if (activities.length === 0) return null

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-col">
          {activities.map((a, i) => {
            const Icon = a.icon
            return (
              <div key={a.id} className="flex items-start gap-3 py-2 group relative">
                <div className="flex flex-col items-center z-10">
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors", a.iconBg)}>
                    <Icon className={cn("h-3.5 w-3.5", a.iconColor)} />
                  </div>
                </div>
                {i < activities.length - 1 && (
                  <div className="absolute left-[13px] top-9 w-px h-[calc(100%-20px)] bg-border/60" />
                )}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs text-foreground leading-relaxed">
                    <span className="font-semibold">{a.action}</span>{" "}
                    <span className="text-muted-foreground">{a.subject}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-medium">
                    {a.from} &middot; {timeAgo(a.date)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Grouped Briefing Items ─────────────────────────────────────────── */

function GroupedBriefingItems({
  items,
  dismissedIds,
  onDismiss,
  onMarkDone,
  onItemClick,
}: {
  items: BriefingItem[]
  dismissedIds: Set<string>
  onDismiss: (id: string) => void
  onMarkDone: (id: string) => void
  onItemClick: (item: BriefingItem) => void
}) {
  const visibleItems = items.filter((item) => !dismissedIds.has(item.id))

  const groups = useMemo(() => {
    const map = new Map<string, BriefingItem[]>()
    for (const item of visibleItems) {
      const key = item.type
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries())
      .map(([type, groupItems]) => ({
        type,
        config: typeConfig[type] || typeConfig.info,
        items: groupItems,
      }))
      .sort((a, b) => a.config.groupOrder - b.config.groupOrder)
  }, [visibleItems])

  if (visibleItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-400/5 ring-1 ring-emerald-400/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <p className="text-base font-semibold text-foreground">All caught up!</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-[240px]">No pending briefing items. Enjoy your day!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const GroupIcon = group.config.icon
        return (
          <div key={group.type}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", group.config.bg)}>
                <GroupIcon className={cn("h-3.5 w-3.5", group.config.color)} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {group.config.groupLabel}
              </h3>
              <div className="flex-1 h-px bg-border/50" />
              <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-muted/80 font-semibold">
                {group.items.length}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              {group.items.map((item) => {
                const config = typeConfig[item.type] || typeConfig.info
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "border-border/50 transition-all duration-200 cursor-pointer group overflow-hidden",
                      "hover:shadow-md hover:shadow-primary/5 hover:border-border"
                    )}
                    onClick={() => onItemClick(item)}
                  >
                    <div className="flex">
                      <div className={cn("w-1 shrink-0", config.accent)} />
                      <CardContent className="flex-1 p-3.5">
                        <div className="flex gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <h4 className="text-sm font-semibold text-foreground truncate">{item.title}</h4>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 shrink-0 font-semibold",
                                    item.priority === "high"
                                      ? "border-red-400/40 text-red-400 bg-red-400/5"
                                      : item.priority === "medium"
                                        ? "border-amber-400/40 text-amber-400 bg-amber-400/5"
                                        : "border-border text-muted-foreground"
                                  )}
                                >
                                  {item.priority}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                  onClick={(e) => { e.stopPropagation(); onMarkDone(item.id) }}
                                  title="Mark as done"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                  onClick={(e) => { e.stopPropagation(); onDismiss(item.id) }}
                                  title="Dismiss"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                            <div className="mt-2.5 flex items-center gap-3">
                              <span className="text-[10px] font-medium text-muted-foreground/70 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {item.emails.length} email{item.emails.length !== 1 ? "s" : ""}
                              </span>
                              <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── AI Personality Profile Widget ──────────────────────────────────── */

function AiProfileWidget() {
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const loadProfile = useCallback(() => {
    setLoading(true)
    agentApi
      .profile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const rebuildProfile = useCallback(() => {
    setBuilding(true)
    agentApi
      .buildProfile()
      .then((p) => {
        setProfile(p)
        setExpanded(true)
      })
      .catch(() => {})
      .finally(() => setBuilding(false))
  }, [])

  if (!profile && !loading) {
    return (
      <Card className="border-purple-500/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.04] via-primary/[0.02] to-transparent" />
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
        <CardContent className="p-4 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">AI Personality Profile</h3>
              <p className="text-[11px] text-muted-foreground">Email-based personality insights</p>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full gap-1.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-lg shadow-md shadow-purple-500/20"
            onClick={loadProfile}
          >
            <Brain className="h-3.5 w-3.5" />
            Load Profile
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-purple-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.04] to-transparent" />
        <CardContent className="p-4 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">AI Profile</h3>
          </div>
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="relative">
              <div className="h-6 w-6 rounded-full border-2 border-purple-400/20" />
              <div className="absolute inset-0 h-6 w-6 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
            </div>
            <span className="text-xs text-muted-foreground">Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (profile && profile.email_count_analyzed === 0) {
    return (
      <Card className="border-purple-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.04] to-transparent" />
        <CardContent className="p-4 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">AI Profile</h3>
          </div>
          <p className="text-xs text-muted-foreground text-center py-3">
            No emails analyzed yet. Sync a mailbox first.
          </p>
          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs rounded-lg border-purple-500/20 hover:bg-purple-500/5" disabled={building} onClick={rebuildProfile}>
            <RefreshCw className={cn("h-3 w-3", building && "animate-spin")} />
            Build Profile
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!profile) return null

  return (
    <Card className="border-purple-500/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.04] via-primary/[0.02] to-transparent" />
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">AI Profile</h3>
              <p className="text-[10px] text-muted-foreground font-medium">{profile.email_count_analyzed} emails analyzed</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-purple-500/10"
            disabled={building}
            onClick={rebuildProfile}
            title="Rebuild profile"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", building && "animate-spin")} />
          </Button>
        </div>

        {profile.personality_traits.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1.5">
              {profile.personality_traits.slice(0, expanded ? undefined : 4).map((t) => (
                <Badge key={t} className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/15 transition-colors">
                  {t}
                </Badge>
              ))}
              {!expanded && profile.personality_traits.length > 4 && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border cursor-pointer hover:border-purple-500/30 transition-colors" onClick={() => setExpanded(true)}>
                  +{profile.personality_traits.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2.5 rounded-lg bg-card/80 border border-border/40 px-3 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 shrink-0">
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Communication</p>
              <p className="text-[11px] text-foreground font-medium truncate">
                {profile.communication_style.tone} &middot; {profile.communication_style.formality}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-card/80 border border-border/40 px-3 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 shrink-0">
              <Briefcase className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Work Style</p>
              <p className="text-[11px] text-foreground font-medium truncate">
                {profile.work_patterns.peak_hours}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-card/80 border border-border/40 px-3 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Response Style</p>
              <p className="text-[11px] text-foreground font-medium truncate">
                {profile.response_preferences.urgency_handling}
              </p>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 pt-3 border-t border-border/40">
            {profile.key_contacts.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <UserCheck className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Key Contacts</p>
                </div>
                <div className="space-y-1.5">
                  {profile.key_contacts.slice(0, 4).map((c) => (
                    <div key={c.email} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/30 transition-colors">
                      <div className="h-5 w-5 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-primary">{(c.name || c.email).slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="text-[11px] text-foreground font-medium truncate">{c.name || c.email}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">{c.relationship}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.topics_and_interests.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Hash className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Topics & Interests</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {profile.topics_and_interests.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] border-border/60 hover:border-primary/30 transition-colors">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-card/80 border border-border/40 p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5 font-medium">Greeting</p>
                <p className="text-[11px] text-foreground font-medium truncate">{profile.communication_style.greeting_pattern || "—"}</p>
              </div>
              <div className="rounded-lg bg-card/80 border border-border/40 p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5 font-medium">Sign-off</p>
                <p className="text-[11px] text-foreground font-medium truncate">{profile.communication_style.sign_off_pattern || "—"}</p>
              </div>
              <div className="rounded-lg bg-card/80 border border-border/40 p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5 font-medium">Delegation</p>
                <p className="text-[11px] text-foreground font-medium truncate">{profile.response_preferences.delegation_style}</p>
              </div>
              <div className="rounded-lg bg-card/80 border border-border/40 p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5 font-medium">Follow-up</p>
                <p className="text-[11px] text-foreground font-medium truncate">{profile.response_preferences.follow_up_pattern}</p>
              </div>
            </div>
          </div>
        )}

        <button
          className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors py-1.5 rounded-lg hover:bg-purple-500/5"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "View full profile"}
          <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", expanded && "rotate-180")} />
        </button>
      </CardContent>
    </Card>
  )
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export function DailyBriefing({
  onViewChange,
  onNavigateInbox,
  onNavigateToEmail,
}: {
  onViewChange: (view: string) => void
  onNavigateInbox?: (filter: InboxFilter) => void
  onNavigateToEmail?: (emailId: string) => void
}) {
  const { user } = useAuth()
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [briefingItems, setBriefingItems] = useState<BriefingItem[]>([])
  const [stats, setStats] = useState({ unreadTotal: 0, highPriority: 0 })
  const [emailStats, setEmailStats] = useState({
    grandTotal: 0, totalUnread: 0, totalReplied: 0, totalUnreplied: 0,
    todayTotal: 0, todayUnread: 0, todayReplied: 0, todayUnreplied: 0,
    totalRepliesSent: 0, todayRepliesSent: 0,
  })
  const [allEmails, setAllEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [widgetRefreshKey, setWidgetRefreshKey] = useState(0)

  const refreshDashboard = useCallback(() => {
    Promise.all([
    briefingApi
      .get()
      .then((data) => {
          setBriefingItems(data.items.map(mapBriefingItem))
          setStats({
            unreadTotal: data.stats.unread_total,
            highPriority: data.stats.high_priority,
          })
          return data
        })
        .catch(() => null),
      mailboxesApi
        .list()
        .then((list) => {
        setMailboxes(
            list.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            provider: "imap" as const,
            color: m.color || "#0ea5e9",
              unread: 0,
              synced: m.sync_status === "synced",
              syncStatus: m.sync_status,
              lastSync: m.last_sync_at ? new Date(m.last_sync_at).toLocaleString() : "Never",
            }))
          )
          return list
        })
        .catch(() => null),
      emailsApi
        .stats()
        .then((s) => setEmailStats({
          grandTotal: s.grand_total,
          totalUnread: s.total_unread,
          totalReplied: s.total_replied,
          totalUnreplied: s.total_unreplied,
          todayTotal: s.today_total,
          todayUnread: s.today_unread,
          todayReplied: s.today_replied,
          todayUnreplied: s.today_unreplied,
          totalRepliesSent: s.total_replies_sent ?? 0,
          todayRepliesSent: s.today_replies_sent ?? 0,
        }))
        .catch(() => {}),
      emailsApi
        .list({ limit: 50 })
        .then((list) => setAllEmails(list.map(mapEmailListApi)))
        .catch(() => {}),
    ])
      .then(([briefingData, mbList]) => {
        if (briefingData && mbList) {
          const unreadMap = new Map(
            briefingData.mailboxes.map((m: { id: string; unread: number }) => [m.id, m.unread ?? 0])
          )
          setMailboxes((prev) => prev.map((mb) => ({ ...mb, unread: unreadMap.get(mb.id) ?? mb.unread })))
        }
      })
      .finally(() => { setLoading(false); setWidgetRefreshKey((k) => k + 1) })
  }, [])

  useEffect(() => {
    refreshDashboard()
  }, [refreshDashboard])

  useEffect(() => {
    const onRefresh = () => refreshDashboard()
    window.addEventListener("mailbox:updated", onRefresh)
    window.addEventListener("mailbox:sync-complete", onRefresh)
    window.addEventListener("email:sync", onRefresh)
    return () => {
      window.removeEventListener("mailbox:updated", onRefresh)
      window.removeEventListener("mailbox:sync-complete", onRefresh)
      window.removeEventListener("email:sync", onRefresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const hasSyncing = mailboxes.some((mb) => mb.syncStatus === "syncing" || mb.syncStatus === "pending")
    if (!hasSyncing) return
    const interval = setInterval(() => refreshDashboard(), 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailboxes])

  const todayTotal = emailStats.todayTotal
  const todayUnread = emailStats.todayUnread
  const todayUnreplied = emailStats.todayUnreplied
  const todayRepliesSent = emailStats.todayRepliesSent
  const totalRepliesSent = emailStats.totalRepliesSent

  const grandTotal = emailStats.grandTotal
  const totalUnread = emailStats.totalUnread
  const totalUnreplied = emailStats.totalUnreplied

  const handleCardClick = (filter: InboxFilter) => {
    if (onNavigateInbox) {
      onNavigateInbox(filter)
    } else {
      onViewChange("inbox")
    }
  }

  const handleItemClick = (item: BriefingItem) => {
    if (item.emails.length > 0 && onNavigateToEmail) {
      onNavigateToEmail(item.emails[0])
    } else if (onNavigateInbox) {
      onNavigateInbox("today")
    } else {
      onViewChange("inbox")
    }
  }

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id))
  }

  const handleMarkDone = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id))
  }

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const GreetingIcon = getGreetingIcon(hour)
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your briefing...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Hero Header */}
      <header className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.04] via-primary/[0.02] to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.03] rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
                <GreetingIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  {greeting}, <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{user?.name || "there"}</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {stats.highPriority > 0 && (
                <Badge variant="outline" className="border-red-400/30 text-red-400 bg-red-400/5 gap-1 font-semibold">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.highPriority} urgent
                </Badge>
              )}
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 gap-1 font-semibold">
                <Mail className="h-3 w-3" />
                {stats.unreadTotal} unread
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Emails"
              value={todayTotal}
              totalValue={grandTotal}
              icon={Inbox}
              gradientFrom="from-blue-500"
              gradientTo="to-blue-600"
              onClick={() => handleCardClick("today")}
            />
            <StatCard
              label="Unread"
              value={todayUnread}
              totalValue={totalUnread}
              icon={MailOpen}
              gradientFrom="from-amber-500"
              gradientTo="to-orange-500"
              onClick={() => handleCardClick("today_unread")}
            />
            <StatCard
              label="Replied"
              value={todayRepliesSent}
              totalValue={totalRepliesSent}
              icon={Reply}
              gradientFrom="from-emerald-500"
              gradientTo="to-teal-600"
              onClick={() => handleCardClick("today_replied")}
            />
            <StatCard
              label="Unreplied"
              value={todayUnreplied}
              totalValue={totalUnreplied}
              icon={MailX}
              gradientFrom="from-rose-500"
              gradientTo="to-red-600"
              onClick={() => handleCardClick("today_unreplied")}
            />
          </div>

          {/* AI Summary */}
          <AiSummaryBanner />

          {/* Main Grid: 3 columns */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: Grouped Briefing Items (2 cols) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Today&apos;s Briefing
                </h2>
                <span className="text-xs text-muted-foreground font-medium">
                  {briefingItems.filter((i) => !dismissedIds.has(i.id)).length} items
                </span>
              </div>
              <GroupedBriefingItems
                items={briefingItems}
                dismissedIds={dismissedIds}
                onDismiss={handleDismiss}
                onMarkDone={handleMarkDone}
                onItemClick={handleItemClick}
              />
            </div>

            {/* Right Column: Widgets */}
            <div className="flex flex-col gap-4">
              <AiProfileWidget />
              <MailboxStatus mailboxes={mailboxes} />
              <EmailTrendsChart refreshKey={widgetRefreshKey} />
              <TopSenders refreshKey={widgetRefreshKey} />
              <RecentActivityFeed emails={allEmails} />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
