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
  { icon: React.ElementType; color: string; bg: string; label: string; groupLabel: string; groupOrder: number }
> = {
  urgent: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", label: "Urgent", groupLabel: "Needs Immediate Attention", groupOrder: 0 },
  followup: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", label: "Follow-up", groupLabel: "Follow-ups Due", groupOrder: 1 },
  deadline: { icon: Calendar, color: "text-orange-400", bg: "bg-orange-400/10", label: "Deadline", groupLabel: "Deadlines", groupOrder: 2 },
  vip: { icon: Star, color: "text-primary", bg: "bg-primary/10", label: "VIP", groupLabel: "VIP", groupOrder: 3 },
  risk: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-400/10", label: "Risk", groupLabel: "Risks", groupOrder: 4 },
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-muted", label: "Info", groupLabel: "Recent Updates", groupOrder: 5 },
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

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  totalValue,
  icon: Icon,
  iconColor,
  onClick,
}: {
  label: string
  value: string | number
  totalValue?: string | number
  icon: React.ElementType
  iconColor: string
  onClick?: () => void
}) {
  return (
    <Card
      className={`bg-card border-border transition-all ${onClick ? "cursor-pointer hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 active:scale-[0.98]" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
          <span className="text-2xl font-bold text-foreground">{value}</span>
            <span className="text-xs text-muted-foreground ml-1.5">today</span>
          </div>
          {totalValue !== undefined && (
            <div className="text-right">
              <span className="text-sm font-semibold text-muted-foreground">{totalValue}</span>
              <span className="text-[10px] text-muted-foreground/70 ml-1">total</span>
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
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Mailbox Status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {mailboxes.map((mb) => (
          <div key={mb.id} className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-2 w-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: mb.color }} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{mb.name}</p>
                <p className="text-xs text-muted-foreground break-all">{mb.email}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {mb.unread > 0 && (
                <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
                  {mb.unread} unread
                </Badge>
              )}
              <div className="flex items-center gap-1.5">
                {mb.syncStatus === "syncing" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : mb.syncStatus === "error" ? (
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                ) : mb.synced ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
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
        <div key={i} className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <p><span className="font-medium text-foreground">{heading}:</span> {rest}</p>
        </div>
      )
    }
    if (isBullet) {
      return (
        <div key={i} className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <p>{text}</p>
        </div>
      )
    }
    return <p key={i}>{cleaned}</p>
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
      <Card className="bg-gradient-to-r from-primary/5 via-primary/[0.03] to-transparent border-primary/20 mb-6 relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Today&apos;s Snapshot</h3>
                <p className="text-xs text-muted-foreground">AI-powered summary of today&apos;s emails per mailbox</p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={fetchSummary}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-r from-primary/5 via-primary/[0.03] to-transparent border-primary/20 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Today&apos;s Snapshot</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setSnapshots(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-3 pl-12">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analyzing today&apos;s emails...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {snapshots!.map((mb, idx) => (
              <div key={idx} className="rounded-lg border border-border/50 bg-card/50 p-3">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: mb.color }} />
                  <span className="text-sm font-medium text-foreground">{mb.mailbox_name}</span>
                  <span className="text-xs text-muted-foreground">({mb.mailbox_email})</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 bg-secondary/50">
                    {mb.today_count} {mb.today_count === 1 ? "email" : "emails"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-1 pl-5">
                  {renderSummaryLines(mb.summary)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ─── Email Trends Chart (7 days) ───────────────────────────────────── */

function EmailTrendsChart({ refreshKey }: { refreshKey: number }) {
  const [volumeData, setVolumeData] = useState<{ date: string; received: number }[]>([])

  useEffect(() => {
    analyticsApi.volume(7).then(setVolumeData).catch(() => {})
  }, [refreshKey])

  const maxVal = Math.max(...volumeData.map((d) => d.received), 1)

  if (volumeData.length === 0) return null

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Email Volume
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">Last 7 days</span>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        {(() => {
          const todayAbbr = new Date().toLocaleDateString("en", { weekday: "short" })
          return (
            <div className="flex items-end justify-between gap-1.5" style={{ height: 96 }}>
              {volumeData.map((d, i) => {
                const barH = Math.max(Math.round((d.received / maxVal) * 80), 4)
                const isCurrent = d.date === todayAbbr
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-medium mb-1">
                      {d.received}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${isCurrent ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/50"}`}
                      style={{ height: barH }}
                    />
                    <span className={`text-[10px] mt-1 ${isCurrent ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {d.date}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })()}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Total: {volumeData.reduce((a, d) => a + d.received, 0)} emails</span>
          <span>Avg: {Math.round(volumeData.reduce((a, d) => a + d.received, 0) / Math.max(volumeData.length, 1))}/day</span>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Top Senders ────────────────────────────────────────────────────── */

function TopSenders({ refreshKey }: { refreshKey: number }) {
  const [senders, setSenders] = useState<{ email: string; name: string; count: number }[]>([])

  useEffect(() => {
    analyticsApi.topSenders(5).then(setSenders).catch(() => {})
  }, [refreshKey])

  if (senders.length === 0) return null

  const maxCount = Math.max(...senders.map((s) => s.count), 1)

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Top Senders
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 pb-4">
        {senders.map((s, i) => (
          <div key={s.email} className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {s.name ? s.name.charAt(0).toUpperCase() : s.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-medium text-foreground truncate">{s.name || s.email}</p>
                <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{s.count} emails</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/50 transition-all"
                  style={{ width: `${(s.count / maxCount) * 100}%` }}
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
      let iconColor: string
      if (e.repliedAt) {
        action = "Replied to"
        icon = Send
        iconColor = "text-emerald-400"
      } else if (e.read) {
        action = "Read"
        icon = Eye
        iconColor = "text-blue-400"
      } else {
        action = "Received"
        icon = Mail
        iconColor = "text-primary"
      }
      return { id: e.id, action, subject: e.subject, from: e.from.name || e.from.email, date: e.date, icon, iconColor }
    })
  }, [emails])

  if (activities.length === 0) return null

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-col">
          {activities.map((a, i) => {
            const Icon = a.icon
            return (
              <div key={a.id} className="flex items-start gap-3 py-2 group">
                <div className="flex flex-col items-center">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className={`h-3 w-3 ${a.iconColor}`} />
                  </div>
                  {i < activities.length - 1 && <div className="w-px h-full bg-border mt-1" />}
                </div>
                <div className="flex-1 min-w-0 -mt-0.5">
                  <p className="text-xs text-foreground">
                    <span className="font-medium">{a.action}</span>{" "}
                    <span className="text-muted-foreground truncate">{a.subject}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400/50 mb-3" />
        <p className="text-sm font-medium text-foreground">All caught up!</p>
        <p className="text-xs text-muted-foreground mt-1">No pending briefing items</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const GroupIcon = group.config.icon
        return (
          <div key={group.type}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className={`flex h-5 w-5 items-center justify-center rounded ${group.config.bg}`}>
                <GroupIcon className={`h-3 w-3 ${group.config.color}`} />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.config.groupLabel}
              </h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary/50">
                {group.items.length}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              {group.items.map((item) => {
                const config = typeConfig[item.type] || typeConfig.info
                return (
                  <Card
                    key={item.id}
                    className="bg-card border-border hover:border-primary/20 transition-all cursor-pointer group"
                    onClick={() => onItemClick(item)}
                  >
                    <CardContent className="p-3.5">
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">{item.title}</h4>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 shrink-0 ${
                                  item.priority === "high"
                                    ? "border-red-400/30 text-red-400"
                                    : item.priority === "medium"
                                      ? "border-amber-400/30 text-amber-400"
                                      : "border-border text-muted-foreground"
                                }`}
                              >
                                {item.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                onClick={(e) => { e.stopPropagation(); onMarkDone(item.id) }}
                                title="Mark as done"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={(e) => { e.stopPropagation(); onDismiss(item.id) }}
                                title="Dismiss"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-[10px] text-muted-foreground">
                              {item.emails.length} email{item.emails.length !== 1 ? "s" : ""}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
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
      <Card className="bg-gradient-to-br from-purple-500/5 via-primary/5 to-transparent border-purple-500/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardContent className="p-4 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">AI Personality Profile</h3>
              <p className="text-[11px] text-muted-foreground">Your email-based personality insights</p>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
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
      <Card className="bg-gradient-to-br from-purple-500/5 via-primary/5 to-transparent border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">AI Personality Profile</h3>
          </div>
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            <span className="text-xs text-muted-foreground">Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (profile && profile.email_count_analyzed === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/5 via-primary/5 to-transparent border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">AI Personality Profile</h3>
          </div>
          <p className="text-xs text-muted-foreground text-center py-3">
            No emails analyzed yet. Sync a mailbox first.
          </p>
          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" disabled={building} onClick={rebuildProfile}>
            <RefreshCw className={`h-3 w-3 ${building ? "animate-spin" : ""}`} />
            Build Profile
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!profile) return null

  return (
    <Card className="bg-gradient-to-br from-purple-500/5 via-primary/5 to-transparent border-purple-500/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardContent className="p-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">AI Profile</h3>
              <p className="text-[10px] text-muted-foreground">{profile.email_count_analyzed} emails analyzed</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            disabled={building}
            onClick={rebuildProfile}
            title="Rebuild profile"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${building ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Personality Traits */}
        {profile.personality_traits.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1.5">
              {profile.personality_traits.slice(0, expanded ? undefined : 4).map((t) => (
                <Badge key={t} className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20">
                  {t}
                </Badge>
              ))}
              {!expanded && profile.personality_traits.length > 4 && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border cursor-pointer hover:border-purple-500/30" onClick={() => setExpanded(true)}>
                  +{profile.personality_traits.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Compact Info Grid */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md bg-card/80 border border-border/50 px-3 py-2">
            <MessageSquare className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Communication</p>
              <p className="text-[11px] text-foreground font-medium truncate">
                {profile.communication_style.tone} &middot; {profile.communication_style.formality}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md bg-card/80 border border-border/50 px-3 py-2">
            <Briefcase className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Work Style</p>
              <p className="text-[11px] text-foreground font-medium truncate">
                {profile.work_patterns.peak_hours}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md bg-card/80 border border-border/50 px-3 py-2">
            <Zap className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Response Style</p>
              <p className="text-[11px] text-foreground font-medium truncate">
                {profile.response_preferences.urgency_handling}
              </p>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-3 space-y-3 pt-3 border-t border-border/50">
            {/* Key Contacts */}
            {profile.key_contacts.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <UserCheck className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Key Contacts</p>
                </div>
                <div className="space-y-1.5">
                  {profile.key_contacts.slice(0, 4).map((c) => (
                    <div key={c.email} className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-primary">{(c.name || c.email).slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="text-[11px] text-foreground font-medium truncate">{c.name || c.email}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{c.relationship}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topics */}
            {profile.topics_and_interests.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Hash className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Topics & Interests</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {profile.topics_and_interests.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] border-border/60">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* More Details */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-card/80 border border-border/50 p-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">Greeting</p>
                <p className="text-[11px] text-foreground font-medium truncate">{profile.communication_style.greeting_pattern || "—"}</p>
              </div>
              <div className="rounded-md bg-card/80 border border-border/50 p-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">Sign-off</p>
                <p className="text-[11px] text-foreground font-medium truncate">{profile.communication_style.sign_off_pattern || "—"}</p>
              </div>
              <div className="rounded-md bg-card/80 border border-border/50 p-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">Delegation</p>
                <p className="text-[11px] text-foreground font-medium truncate">{profile.response_preferences.delegation_style}</p>
              </div>
              <div className="rounded-md bg-card/80 border border-border/50 p-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">Follow-up</p>
                <p className="text-[11px] text-foreground font-medium truncate">{profile.response_preferences.follow_up_pattern}</p>
              </div>
            </div>
          </div>
        )}

        {/* Toggle expand/collapse */}
        <button
          className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors py-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "View full profile"}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
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
  const todayReplied = emailStats.todayReplied
  const todayUnreplied = emailStats.todayUnreplied
  const todayRepliesSent = emailStats.todayRepliesSent
  const totalRepliesSent = emailStats.totalRepliesSent

  const grandTotal = emailStats.grandTotal
  const totalUnread = emailStats.totalUnread
  const totalReplied = emailStats.totalReplied
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
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {greeting}, {user?.name || "there"}
          </h1>
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary">
            <Mail className="mr-1 h-3 w-3" />
            {stats.unreadTotal} unread
          </Badge>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard
              label="Emails"
              value={todayTotal}
              totalValue={grandTotal}
              icon={Inbox}
              iconColor="bg-primary/10 text-primary"
              onClick={() => handleCardClick("today")}
            />
            <StatCard
              label="Unread"
              value={todayUnread}
              totalValue={totalUnread}
              icon={MailOpen}
              iconColor="bg-amber-400/10 text-amber-400"
              onClick={() => handleCardClick("today_unread")}
            />
            <StatCard
              label="Replied"
              value={todayRepliesSent}
              totalValue={totalRepliesSent}
              icon={Reply}
              iconColor="bg-emerald-400/10 text-emerald-400"
              onClick={() => handleCardClick("today_replied")}
            />
            <StatCard
              label="Unreplied"
              value={todayUnreplied}
              totalValue={totalUnreplied}
              icon={MailX}
              iconColor="bg-red-400/10 text-red-400"
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
                <h2 className="text-base font-semibold text-foreground">Today&apos;s Briefing</h2>
                <span className="text-xs text-muted-foreground">
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
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
