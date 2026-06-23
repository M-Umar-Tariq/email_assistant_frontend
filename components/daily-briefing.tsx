"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
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
  CalendarDays,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  briefing as briefingApi,
  emails as emailsApi,
  mailboxes as mailboxesApi,
  analytics as analyticsApi,
  agent as agentApi,
  type AgentProfile,
  type BriefingApi,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ConnectMailboxCta } from "@/components/connect-mailbox-cta"
import { mapEmailListApi } from "@/lib/mappers"
import type { Mailbox, Email } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import smartMailLogo from "@/logo/Smart Mail Logo.png"
import smartMailLogoWhite from "@/logo/Smart Mail Logo White.png"

const BRIEFING_MEETINGS_REFRESH_MS = 20_000
const DASHBOARD_CACHE_TTL_MS = 10 * 60 * 1000
const AI_SNAPSHOT_CACHE_TTL_MS = 30 * 60 * 1000

export type InboxFilter =
  | "today"
  | "today_unread"
  | "today_replied"
  | "today_unreplied"
  | "today_high_priority"
  | "high_priority"
  | "total_unread"
  | "total_replied"
  | "total_unreplied"

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

/** Fixes common calendar/title typos for display only */
function normalizeMeetingTitle(title: string): string {
  const t = title.trim()
  if (/^metting$/i.test(t)) return "Meeting"
  return title
}

/* ─── Sub-components ────────────────────────────────────────────────── */

const STAT_METRIC_STYLES = {
  emails: {
    icon: Inbox,
    gradientFrom: "from-blue-500",
    gradientTo: "to-blue-600",
    accent: "border-blue-500/20 bg-blue-500/[0.06] text-blue-600 dark:text-blue-400",
    iconBg: "from-blue-500 to-blue-600",
  },
  unread: {
    icon: MailOpen,
    gradientFrom: "from-amber-500",
    gradientTo: "to-orange-500",
    accent: "border-amber-500/20 bg-amber-500/[0.06] text-amber-600 dark:text-amber-400",
    iconBg: "from-amber-500 to-orange-500",
  },
  replied: {
    icon: Reply,
    gradientFrom: "from-emerald-500",
    gradientTo: "to-teal-600",
    accent: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-600 dark:text-emerald-400",
    iconBg: "from-emerald-500 to-teal-600",
  },
  unreplied: {
    icon: MailX,
    gradientFrom: "from-rose-500",
    gradientTo: "to-red-600",
    accent: "border-rose-500/20 bg-rose-500/[0.06] text-rose-600 dark:text-rose-400",
    iconBg: "from-rose-500 to-red-600",
  },
} as const

type StatMetricKey = keyof typeof STAT_METRIC_STYLES

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
  const Wrapper = onClick ? "button" : "div"
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group/stat relative w-full overflow-hidden rounded-2xl border border-border/50 bg-card/80 text-left shadow-sm transition-all duration-300",
        onClick &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1 bg-gradient-to-b", gradientFrom, gradientTo)} />
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover/stat:opacity-[0.14]",
          `bg-gradient-to-br ${gradientFrom} ${gradientTo}`,
        )}
      />
      <div className="relative flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/15 transition-transform duration-300 group-hover/stat:scale-105",
              `bg-gradient-to-br ${gradientFrom} ${gradientTo}`,
            )}
          >
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-extrabold tabular-nums leading-none tracking-tight text-foreground">{value}</p>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">Today</p>
          </div>
          {totalValue !== undefined && (
            <>
              <div className="mb-1 h-10 w-px shrink-0 bg-border/60" aria-hidden />
              <div className="text-right">
                <p className="text-xl font-bold tabular-nums leading-none text-muted-foreground">{totalValue}</p>
                <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Total</p>
              </div>
            </>
          )}
        </div>
      </div>
    </Wrapper>
  )
}

function InlineStatMetric({
  metricKey,
  label,
  today,
  total,
  onClick,
}: {
  metricKey: StatMetricKey
  label: string
  today: number
  total: number
  onClick?: () => void
}) {
  const style = STAT_METRIC_STYLES[metricKey]
  const Icon = style.icon
  const Wrapper = onClick ? "button" : "div"

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group/metric relative min-w-0 flex-1 overflow-hidden rounded-xl border p-3 text-left transition-all duration-200",
        style.accent,
        onClick &&
          "cursor-pointer hover:brightness-[1.02] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="h-3 w-3 shrink-0 opacity-80" />
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide opacity-90">{label}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xl font-extrabold tabular-nums leading-none">{today}</span>
        <span className="text-[10px] font-medium tabular-nums opacity-70">{total} total</span>
      </div>
    </Wrapper>
  )
}

function MailboxStatsPanel({
  mailbox,
  stats,
  onMetricClick,
}: {
  mailbox: Mailbox
  stats: {
    todayTotal: number
    grandTotal: number
    todayUnread: number
    totalUnread: number
    todayReplied: number
    totalReplied: number
    todayUnreplied: number
    totalUnreplied: number
  }
  onMetricClick: (filter: InboxFilter) => void
}) {
  const accent = mailbox.color || "#64748b"
  const initial = (mailbox.name || mailbox.email || "?").charAt(0).toUpperCase()

  return (
    <div className="group/mailbox relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 shadow-sm transition-all duration-300 hover:border-border/80 hover:shadow-md">
      <div className="absolute left-0 top-0 bottom-0 w-1 opacity-90" style={{ backgroundColor: accent }} />
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.06] blur-3xl"
        style={{ backgroundColor: accent }}
      />
      <div className="relative p-4 pl-3.5 sm:p-5 sm:pl-4">
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md ring-2 ring-background"
            style={{ backgroundColor: accent }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{mailbox.name}</p>
            <p className="truncate text-xs text-muted-foreground">{mailbox.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
          <InlineStatMetric
            metricKey="emails"
            label="Emails"
            today={stats.todayTotal}
            total={stats.grandTotal}
            onClick={() => onMetricClick("today")}
          />
          <InlineStatMetric
            metricKey="unread"
            label="Unread"
            today={stats.todayUnread}
            total={stats.totalUnread}
            onClick={() => onMetricClick("today_unread")}
          />
          <InlineStatMetric
            metricKey="replied"
            label="Replied"
            today={stats.todayReplied}
            total={stats.totalReplied}
            onClick={() => onMetricClick("today_replied")}
          />
          <InlineStatMetric
            metricKey="unreplied"
            label="Unreplied"
            today={stats.todayUnreplied}
            total={stats.totalUnreplied}
            onClick={() => onMetricClick("today_unreplied")}
          />
        </div>
      </div>
    </div>
  )
}

function MailboxStatus({
  mailboxes,
  onOpenInboxWithMailbox,
}: {
  mailboxes: Mailbox[]
  onOpenInboxWithMailbox?: (mailboxId: string) => void
}) {
  if (mailboxes.length === 0) return null
  return (
    <Card className="glass-card border-border/40 glow-ring overflow-hidden">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
            <Inbox className="h-3.5 w-3.5 text-primary" />
          </div>
          Mailbox Status
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-4">
        {mailboxes.map((mb) => (
          <button
            key={mb.id}
            type="button"
            onClick={() => onOpenInboxWithMailbox?.(mb.id)}
            title={onOpenInboxWithMailbox ? `Open inbox for ${mb.name}` : undefined}
            className={cn(
              "flex w-full items-start justify-between gap-4 rounded-xl bg-muted/20 border border-border/30 px-3.5 py-3 text-left transition-all duration-200 hover:bg-muted/40 hover:border-border/50",
              onOpenInboxWithMailbox &&
                "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-3 w-3 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-background" style={{ backgroundColor: mb.color, boxShadow: `0 0 10px ${mb.color}40` }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">{mb.name}</p>
                <p className="text-[11px] text-muted-foreground/70 break-all">{mb.email}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {mb.unread > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-0.5 rounded-full">
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
                <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap font-medium">
                  {mb.syncStatus === "syncing" ? "Syncing..." : mb.syncStatus === "pending" ? "Not synced yet" : mb.lastSync}
                </span>
              </div>
            </div>
          </button>
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

function AiSummaryBanner({
  onOpenMailboxByEmail,
  mailboxScope = "all",
}: {
  /** Open inbox scoped to the mailbox whose account email matches (from AI snapshot). */
  onOpenMailboxByEmail?: (mailboxEmail: string) => void
  mailboxScope?: string
} = {}) {
  const [snapshots, setSnapshots] = useState<MailboxSnapshot[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cacheKey = `smartmail:ai-snapshot:v1:${mailboxScope}`
    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; briefing?: MailboxSnapshot[] }
        if (
          typeof parsed.ts === "number" &&
          Date.now() - parsed.ts < AI_SNAPSHOT_CACHE_TTL_MS &&
          Array.isArray(parsed.briefing)
        ) {
          setSnapshots(parsed.briefing)
          setLoading(false)
          return
        }
      }
    } catch {
      // ignore
    }
    setSnapshots(null)
    setLoading(false)
  }, [mailboxScope])

  const fetchSummary = useCallback(() => {
    setLoading(true)
    setSnapshots(null)
    briefingApi
      .ai({ mailbox_id: mailboxScope !== "all" ? mailboxScope : undefined })
      .then((res) => {
        setSnapshots(res.briefing)
        try {
          if (typeof window !== "undefined") {
            sessionStorage.setItem(
              `smartmail:ai-snapshot:v1:${mailboxScope}`,
              JSON.stringify({ ts: Date.now(), briefing: res.briefing }),
            )
          }
        } catch {
          // quota / private mode
        }
      })
      .catch(() => setSnapshots(null))
      .finally(() => setLoading(false))
  }, [mailboxScope])

  if (!snapshots && !loading) {
    return (
      <div className="relative rounded-2xl overflow-hidden animate-entrance">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-blue-500/20 to-violet-500/20 p-[1px]" />
        <div className="relative m-[1px] rounded-2xl bg-background/90 backdrop-blur-md">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md opacity-60" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-blue-500/15 ring-1 ring-primary/10 sm:h-11 sm:w-11">
                  <Image src={smartMailLogo} alt="AI Snapshot" className="h-5 w-5 object-contain sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">AI Snapshot</h3>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground/80">
                  Get a smart summary of today&apos;s emails
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full shrink-0 gap-2 rounded-xl px-5 shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 sm:w-auto"
              onClick={fetchSummary}
            >
              <Image src={smartMailLogoWhite} alt="" className="h-5 w-5 object-contain" />
              Generate
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden animate-entrance">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/15 via-blue-500/15 to-violet-500/15" />
      <div className="relative m-[1px] rounded-[15px] overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        <div className="relative bg-background/90 backdrop-blur-md">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-blue-500/15">
                <Image src={smartMailLogo} alt="AI Snapshot" className="h-5 w-5 object-contain" />
              </div>
              <h3 className="text-sm font-bold text-foreground">AI Snapshot</h3>
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
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full border-2 border-primary/15" />
                  <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <Image src={smartMailLogo} alt="" className="absolute inset-0 m-auto h-5 w-5 object-contain opacity-70" />
                </div>
                <span className="text-sm text-muted-foreground font-medium">Analyzing today&apos;s emails...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 briefing-stagger">
                {snapshots!.map((mb, idx) => (
                  <div key={idx} className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-border/70 hover:shadow-md hover:shadow-primary/5">
                    <button
                      type="button"
                      onClick={() => onOpenMailboxByEmail?.(mb.mailbox_email)}
                      title={
                        onOpenMailboxByEmail
                          ? `Open inbox for ${mb.mailbox_name}`
                          : undefined
                      }
                      className={cn(
                        "flex w-full items-center gap-2.5 px-4 py-2.5 bg-muted/20 border-b border-border/30 text-left",
                        onOpenMailboxByEmail
                          ? "cursor-pointer hover:bg-muted/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          : "cursor-default"
                      )}
                    >
                      <div className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background" style={{ backgroundColor: mb.color, boxShadow: `0 0 8px ${mb.color}40` }} />
                      <span className="text-sm font-semibold text-foreground">{mb.mailbox_name}</span>
                      <span className="text-[11px] text-muted-foreground/70">({mb.mailbox_email})</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] px-2.5 py-0.5 bg-primary/10 text-primary font-bold rounded-full">
                        {mb.today_count} {mb.today_count === 1 ? "email" : "emails"}
                      </Badge>
                    </button>
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
    </div>
  )
}

/* ─── Email Trends Chart (7 days) ───────────────────────────────────── */

function EmailTrendsChart({ refreshKey, mailboxScope }: { refreshKey: number; mailboxScope: string }) {
  const [volumeData, setVolumeData] = useState<{ date: string; received: number }[]>([])

  useEffect(() => {
    analyticsApi.volume(7, mailboxScope).then(setVolumeData).catch(() => {})
  }, [refreshKey, mailboxScope])

  const maxVal = Math.max(...volumeData.map((d) => d.received), 1)
  const totalEmails = volumeData.reduce((a, d) => a + d.received, 0)
  const avgPerDay = Math.round(totalEmails / Math.max(volumeData.length, 1))

  if (volumeData.length === 0) return null

  return (
    <Card className="glass-card border-border/40 glow-ring overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 shadow-sm">
              <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
            </div>
            Email Volume
          </CardTitle>
          <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 border-border/50 text-muted-foreground/70 font-semibold rounded-full">
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
                    <span className="text-[10px] text-foreground font-bold opacity-0 group-hover:opacity-100 transition-all duration-200 mb-1.5 bg-popover border border-border rounded-lg px-2 py-0.5 shadow-md">
                      {d.received}
                    </span>
                    <div className="relative w-full rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-x-110" style={{ height: barH }}>
                      <div
                        className={cn(
                          "absolute inset-0 transition-all duration-300 rounded-lg",
                          isCurrent
                            ? "bg-gradient-to-t from-primary to-primary/70 shadow-sm shadow-primary/30"
                            : "bg-gradient-to-t from-primary/20 to-primary/8 group-hover:from-primary/40 group-hover:to-primary/20"
                        )}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] mt-2 font-semibold",
                      isCurrent ? "text-primary font-bold" : "text-muted-foreground/70"
                    )}>
                      {d.date}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })()}
        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-3">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span className="font-bold text-foreground tabular-nums">{totalEmails}</span> total
          </span>
          <span><span className="font-bold text-foreground tabular-nums">{avgPerDay}</span> avg/day</span>
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

function TopSenders({ refreshKey, mailboxScope }: { refreshKey: number; mailboxScope: string }) {
  const openSenderInbox = (s: { email: string; name: string }) => {
    window.dispatchEvent(
      new CustomEvent("contacts:showEmailsFrom", {
        detail: { from_email: s.email, from_name: s.name || s.email },
      })
    )
  }
  const [senders, setSenders] = useState<{ email: string; name: string; count: number }[]>([])

  useEffect(() => {
    analyticsApi.topSenders(5, mailboxScope).then(setSenders).catch(() => {})
  }, [refreshKey, mailboxScope])

  if (senders.length === 0) return null

  const maxCount = Math.max(...senders.map((s) => s.count), 1)

  return (
    <Card className="glass-card border-border/40 glow-ring overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 shadow-sm">
            <Users className="h-3.5 w-3.5 text-purple-400" />
          </div>
          Top Senders
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 pb-4">
        {senders.map((s, i) => (
          <button
            key={s.email}
            type="button"
            onClick={() => openSenderInbox(s)}
            title={`Open inbox — emails from ${s.name || s.email}`}
            className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-200 hover:bg-muted/30 group/sender cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-md transition-transform duration-200 group-hover/sender:scale-105 bg-gradient-to-br", senderColors[i % senderColors.length])}>
              {s.name ? s.name.charAt(0).toUpperCase() : s.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-foreground truncate">{s.name || s.email}</p>
                <span className="text-[10px] text-muted-foreground/70 ml-2 shrink-0 font-bold tabular-nums bg-muted/50 px-1.5 py-0.5 rounded">{s.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", senderColors[i % senderColors.length])}
                  style={{ width: `${(s.count / maxCount) * 100}%`, opacity: 0.75 }}
                />
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

/* ─── Today's emails by priority ─────────────────────────────────────── */

const PRIORITY_SECTIONS = [
  {
    key: "high" as const,
    label: "High priority",
    groupLabel: "Needs attention",
    icon: ShieldAlert,
    color: "text-red-400",
    bg: "bg-red-400/10",
    accent: "bg-red-500",
    badge: "border-red-400/30 text-red-400 bg-red-400/5",
  },
  {
    key: "medium" as const,
    label: "Medium priority",
    groupLabel: "Standard",
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    accent: "bg-amber-500",
    badge: "border-amber-400/30 text-amber-400 bg-amber-400/5",
  },
  {
    key: "low" as const,
    label: "Low priority",
    groupLabel: "Routine",
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    accent: "bg-blue-500",
    badge: "border-border/60 text-muted-foreground/70",
  },
]

function TodayEmailsByPriority({
  emails,
  mailboxes,
  onEmailClick,
  onViewAllToday,
}: {
  emails: Email[]
  mailboxes: Mailbox[]
  onEmailClick?: (emailId: string) => void
  onViewAllToday?: () => void
}) {
  const mailboxColor = useMemo(() => {
    const map = new Map<string, string>()
    for (const mb of mailboxes) map.set(mb.id, mb.color)
    return map
  }, [mailboxes])

  const groups = useMemo(() => {
    return PRIORITY_SECTIONS.map((section) => {
      const items = emails
        .filter((e) => (e.priority || "medium") === section.key)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      return { ...section, items }
    })
  }, [emails])

  const total = emails.length

  if (total === 0) {
    return (
      <Card className="glass-card border-border/40 glow-ring overflow-hidden">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
              <Mail className="h-3.5 w-3.5 text-primary" />
            </div>
            Today&apos;s emails
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-8 pt-2">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-400 mb-3" />
            <p className="text-sm font-semibold text-foreground">No emails received today</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">New mail will appear here grouped by AI priority.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-border/40 glow-ring overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
              <Mail className="h-3.5 w-3.5 text-primary" />
            </div>
            Today&apos;s emails
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 border-border/50 text-muted-foreground/70 font-semibold rounded-full tabular-nums">
              {total} today
            </Badge>
            {onViewAllToday && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1" onClick={onViewAllToday}>
                View inbox
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4 space-y-6">
        {groups.map((group) => {
          if (group.items.length === 0) return null
          const GroupIcon = group.icon
          return (
            <div key={group.key}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg shadow-sm", group.bg)}>
                  <GroupIcon className={cn("h-3.5 w-3.5", group.color)} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground/80">
                  {group.label}
                </h3>
                <div className="flex-1 briefing-section-line" />
                <Badge variant="secondary" className="text-[10px] px-2.5 py-0.5 bg-muted/60 font-bold rounded-full tabular-nums">
                  {group.items.length}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 briefing-stagger">
                {group.items.map((email) => (
                  <button
                    key={email.id}
                    type="button"
                    onClick={() => onEmailClick?.(email.id)}
                    className={cn(
                      "group flex w-full text-left rounded-xl border border-border/40 bg-card/50 overflow-hidden",
                      "transition-all duration-200 hover:border-border/70 hover:shadow-md hover:-translate-y-0.5",
                      onEmailClick && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <div className={cn("w-1 shrink-0", group.accent)} />
                    <div className="flex-1 min-w-0 px-3.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm font-semibold truncate", !email.read && "text-foreground", email.read && "text-foreground/80")}>
                            {email.subject || "(No subject)"}
                          </p>
                          <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                            {email.from.name || email.from.email}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {mailboxes.length > 1 && email.mailbox && (
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: mailboxColor.get(email.mailbox) || "#94a3b8" }}
                              title="Mailbox"
                            />
                          )}
                          {!email.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" title="Unread" />
                          )}
                          <span className="text-[10px] text-muted-foreground/60 font-medium tabular-nums whitespace-nowrap">
                            {timeAgo(email.date)}
                          </span>
                        </div>
                      </div>
                      {email.preview && (
                        <p className="text-[11px] text-muted-foreground/70 line-clamp-1 mt-1.5">{email.preview}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

/* ─── Today's meetings (dashboard) ───────────────────────────────────── */

function formatNextMeeting(next: BriefingApi["stats"]["next_meeting"]) {
  if (!next) return { title: "", time: "" }
  const title = normalizeMeetingTitle(next.title || "Meeting")
  let time = ""
  try {
    time = format(parseISO(next.start), "p")
  } catch {
    time = ""
  }
  return { title, time }
}

function MeetingMetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  gradientFrom,
  gradientTo,
  alert = false,
  onClick,
}: {
  label: string
  value: string | number
  sublabel?: string
  icon: React.ElementType
  gradientFrom: string
  gradientTo: string
  alert?: boolean
  onClick?: () => void
}) {
  const Wrapper = onClick ? "button" : "div"
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group/metric relative w-full overflow-hidden rounded-2xl border text-left shadow-sm transition-all duration-300",
        alert
          ? "border-destructive/25 bg-destructive/[0.04]"
          : "border-border/50 bg-card/80",
        onClick &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1 bg-gradient-to-b", gradientFrom, gradientTo)} />
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover/metric:opacity-[0.14]",
          `bg-gradient-to-br ${gradientFrom} ${gradientTo}`,
        )}
      />
      <div className="relative flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/15 transition-transform duration-300 group-hover/metric:scale-105",
              `bg-gradient-to-br ${gradientFrom} ${gradientTo}`,
            )}
          >
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div>
          <p
            className={cn(
              "text-3xl font-extrabold tabular-nums leading-none tracking-tight",
              alert ? "text-destructive" : "text-foreground",
            )}
          >
            {value}
          </p>
          {sublabel && (
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{sublabel}</p>
          )}
        </div>
      </div>
    </Wrapper>
  )
}

function NextMeetingCard({
  next,
  onClick,
}: {
  next: BriefingApi["stats"]["next_meeting"]
  onClick?: () => void
}) {
  const { title, time } = formatNextMeeting(next)
  const Wrapper = onClick ? "button" : "div"

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group/next relative w-full overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] text-left shadow-sm transition-all duration-300",
        onClick &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 via-purple-500 to-fuchsia-600" />
      <div className="relative flex h-full flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Next up</p>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-sm ring-1 ring-white/15">
            <Clock className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        {next ? (
          <>
            <p className="line-clamp-2 text-base font-semibold leading-snug text-foreground">{title}</p>
            {time && (
              <p className="text-sm font-medium text-violet-600 dark:text-violet-300">{time}</p>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col justify-center py-1">
            <p className="text-sm font-medium text-muted-foreground">No meetings left today</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">Open calendar to plan ahead</p>
          </div>
        )}
      </div>
    </Wrapper>
  )
}

function MeetingsOverview({
  count,
  conflicts,
  next,
  onOpenCalendar,
}: {
  count: number
  conflicts: number
  next: BriefingApi["stats"]["next_meeting"]
  onOpenCalendar: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-muted/30 via-card/50 to-violet-500/[0.03] p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2 px-0.5">
        <div className="h-px flex-1 bg-gradient-to-r from-violet-500/30 via-border/50 to-transparent" />
        <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Overview</p>
        <div className="h-px flex-1 bg-gradient-to-l from-violet-500/30 via-border/50 to-transparent" />
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3 briefing-stagger">
        <MeetingMetricCard
          label="Meetings"
          value={count}
          sublabel="Today"
          icon={CalendarDays}
          gradientFrom="from-violet-500"
          gradientTo="to-purple-600"
          onClick={onOpenCalendar}
        />
        <MeetingMetricCard
          label="Conflicts"
          value={conflicts}
          sublabel={conflicts > 0 ? "Needs review" : "All clear"}
          icon={AlertTriangle}
          gradientFrom="from-rose-500"
          gradientTo="to-red-600"
          alert={conflicts > 0}
          onClick={onOpenCalendar}
        />
        <NextMeetingCard next={next} onClick={onOpenCalendar} />
      </div>
      <button
        type="button"
        onClick={onOpenCalendar}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/15 bg-violet-500/[0.06] px-4 py-2.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-500/10 dark:text-violet-300"
      >
        Open calendar
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function InlineMeetingMetric({
  label,
  value,
  detail,
  variant,
  onClick,
}: {
  label: string
  value: string | number
  detail?: string
  variant: "violet" | "rose" | "indigo"
  onClick?: () => void
}) {
  const styles = {
    violet: "border-violet-500/20 bg-violet-500/[0.06] text-violet-600 dark:text-violet-400",
    rose: "border-rose-500/20 bg-rose-500/[0.06] text-rose-600 dark:text-rose-400",
    indigo: "border-indigo-500/20 bg-indigo-500/[0.06] text-indigo-600 dark:text-indigo-400",
  }[variant]

  const Wrapper = onClick ? "button" : "div"

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group/metric relative min-w-0 flex-1 overflow-hidden rounded-xl border p-3 text-left transition-all duration-200",
        styles,
        onClick &&
          "cursor-pointer hover:brightness-[1.02] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25",
      )}
    >
      <p className="mb-2 truncate text-[10px] font-semibold uppercase tracking-wide opacity-90">{label}</p>
      <p className="text-xl font-extrabold tabular-nums leading-none">{value}</p>
      {detail && (
        <p className="mt-1.5 line-clamp-1 text-[10px] font-medium opacity-75">{detail}</p>
      )}
    </Wrapper>
  )
}

function MailboxMeetingsPanel({
  mailbox,
  stats,
  onOpenCalendar,
}: {
  mailbox: Mailbox
  stats: { count: number; conflicts: number; next: BriefingApi["stats"]["next_meeting"] }
  onOpenCalendar: () => void
}) {
  const accent = mailbox.color || "#64748b"
  const initial = (mailbox.name || mailbox.email || "?").charAt(0).toUpperCase()
  const { title, time } = formatNextMeeting(stats.next)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenCalendar}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpenCalendar()
        }
      }}
      className="group/mailbox relative cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-card/70 shadow-sm transition-all duration-300 hover:border-border/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 opacity-90" style={{ backgroundColor: accent }} />
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.06] blur-3xl"
        style={{ backgroundColor: accent }}
      />
      <div className="relative p-4 pl-3.5 sm:p-5 sm:pl-4">
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md ring-2 ring-background"
            style={{ backgroundColor: accent }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{mailbox.name}</p>
            <p className="truncate text-xs text-muted-foreground">{mailbox.email}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover/mailbox:translate-x-0.5 group-hover/mailbox:text-violet-500" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
          <InlineMeetingMetric
            label="Meetings"
            value={stats.count}
            variant="violet"
          />
          <InlineMeetingMetric
            label="Conflicts"
            value={stats.conflicts}
            detail={stats.conflicts > 0 ? "Review in calendar" : undefined}
            variant="rose"
          />
          <InlineMeetingMetric
            label="Next"
            value={stats.next ? (time || "Soon") : "—"}
            detail={stats.next ? title : "No meetings left"}
            variant="indigo"
          />
        </div>
      </div>
    </div>
  )
}

/* ─── AI Personality Profile Widget ──────────────────────────────────── */

function AiProfileWidget({ mailboxScope = "all" }: { mailboxScope?: string }) {
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const profileCacheRef = useRef<Record<string, AgentProfile>>({})
  const scopeKey = mailboxScope || "all"

  const loadProfile = (force = false) => {
    const cached = profileCacheRef.current[scopeKey]
    if (!force && cached) {
      setProfile((prev) => (prev === cached ? prev : cached))
      setLoading(false)
      return Promise.resolve(cached)
    }
    setLoading(true)
    return agentApi
      .profile(mailboxScope)
      .then((p) => {
        setProfile(p)
        profileCacheRef.current[scopeKey] = p
        return p
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setExpanded(false)
    const cached = profileCacheRef.current[scopeKey]
    if (cached) {
      setProfile((prev) => (prev === cached ? prev : cached))
      setLoading(false)
      return
    }
    setProfile((prev) => (prev === null ? prev : null))
    setLoading(true)
    let cancelled = false
    agentApi
      .profile(mailboxScope)
      .then((p) => {
        if (cancelled) return
        profileCacheRef.current[scopeKey] = p
        setProfile(p)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scopeKey])

  const rebuildProfile = useCallback(() => {
    setBuilding(true)
    setLoading(true)
    agentApi
      .buildProfile(mailboxScope)
      .then((p) => {
        setProfile(p)
        profileCacheRef.current[scopeKey] = p
        setExpanded(true)
      })
      .catch(() => {})
      .finally(() => {
        setBuilding(false)
        setLoading(false)
      })
  }, [mailboxScope, scopeKey])

  if (!profile && !loading) {
    return (
      <Card className="glass-card border-purple-500/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.05] via-primary/[0.02] to-transparent" />
        <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <CardContent className="p-5 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/15 rounded-xl blur-md opacity-50" />
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/25 to-purple-500/10 ring-1 ring-purple-500/15 shadow-md shadow-purple-500/10">
                <Brain className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground">AI Personality Profile</h3>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">Email-based personality insights</p>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
            onClick={() => loadProfile(true)}
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
    <Card className="glass-card border-purple-500/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.05] via-primary/[0.02] to-transparent" />
      <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/15 rounded-xl blur-md opacity-40" />
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/25 to-purple-500/10 ring-1 ring-purple-500/15 shadow-sm">
                <Brain className="h-4.5 w-4.5 text-purple-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">AI Profile</h3>
              <p className="text-[10px] text-muted-foreground/70 font-semibold tabular-nums">{profile.email_count_analyzed} emails analyzed</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 transition-all"
            disabled={building}
            onClick={rebuildProfile}
            title="Rebuild profile"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", building && "animate-spin")} />
          </Button>
        </div>

        {profile.personality_traits.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {profile.personality_traits.slice(0, expanded ? undefined : 4).map((t) => (
                <Badge key={t} className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/15 transition-all rounded-full px-2.5">
                  {t}
                </Badge>
              ))}
              {!expanded && profile.personality_traits.length > 4 && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border cursor-pointer hover:border-purple-500/30 transition-all rounded-full px-2.5" onClick={() => setExpanded(true)}>
                  +{profile.personality_traits.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2.5 rounded-xl bg-muted/20 border border-border/30 px-3.5 py-3 transition-all hover:bg-muted/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0 shadow-sm">
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground/70 font-semibold">Communication</p>
              <p className="text-[11px] text-foreground font-semibold truncate">
                {profile.communication_style.tone} &middot; {profile.communication_style.formality}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-muted/20 border border-border/30 px-3.5 py-3 transition-all hover:bg-muted/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 shrink-0 shadow-sm">
              <Briefcase className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground/70 font-semibold">Work Style</p>
              <p className="text-[11px] text-foreground font-semibold truncate">
                {profile.work_patterns.peak_hours}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-muted/20 border border-border/30 px-3.5 py-3 transition-all hover:bg-muted/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0 shadow-sm">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground/70 font-semibold">Response Style</p>
              <p className="text-[11px] text-foreground font-semibold truncate">
                {profile.response_preferences.urgency_handling}
              </p>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 pt-4 border-t border-border/30">
            {profile.key_contacts.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <UserCheck className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.08em]">Key Contacts</p>
                </div>
                <div className="space-y-1.5">
                  {profile.key_contacts.slice(0, 4).map((c) => (
                    <div key={c.email} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/30 transition-all">
                      <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 shadow-sm">
                        <span className="text-[8px] font-bold text-primary">{(c.name || c.email).slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="text-[11px] text-foreground font-semibold truncate">{c.name || c.email}</span>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-auto font-medium">{c.relationship}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.topics_and_interests.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Hash className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.08em]">Topics & Interests</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.topics_and_interests.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] border-border/50 hover:border-primary/30 transition-all rounded-full px-2">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted/20 border border-border/30 p-3">
                <p className="text-[10px] text-muted-foreground/60 mb-0.5 font-semibold">Greeting</p>
                <p className="text-[11px] text-foreground font-semibold truncate">{profile.communication_style.greeting_pattern || "—"}</p>
              </div>
              <div className="rounded-xl bg-muted/20 border border-border/30 p-3">
                <p className="text-[10px] text-muted-foreground/60 mb-0.5 font-semibold">Sign-off</p>
                <p className="text-[11px] text-foreground font-semibold truncate">{profile.communication_style.sign_off_pattern || "—"}</p>
              </div>
              <div className="rounded-xl bg-muted/20 border border-border/30 p-3">
                <p className="text-[10px] text-muted-foreground/60 mb-0.5 font-semibold">Delegation</p>
                <p className="text-[11px] text-foreground font-semibold truncate">{profile.response_preferences.delegation_style}</p>
              </div>
              <div className="rounded-xl bg-muted/20 border border-border/30 p-3">
                <p className="text-[10px] text-muted-foreground/60 mb-0.5 font-semibold">Urgency</p>
                <p className="text-[11px] text-foreground font-semibold truncate">{profile.response_preferences.urgency_handling}</p>
              </div>
            </div>
          </div>
        )}

        <button
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 transition-all py-2 rounded-xl hover:bg-purple-500/5 font-semibold"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "View full profile"}
          <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", expanded && "rotate-180")} />
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
  onConnectMailbox,
  onOpenInboxWithMailbox,
  onOpenCalendarWithMailbox,
  mailboxScope = "all",
  /** When the dashboard is kept mounted but hidden, pause polling timers (sync events still refresh data). */
  visible = true,
}: {
  onViewChange: (view: string) => void
  onNavigateInbox?: (filter: InboxFilter) => void
  onNavigateToEmail?: (emailId: string) => void
  /** Opens add-mailbox dialog when user has no accounts */
  onConnectMailbox?: () => void
  /** Open unified inbox filtered to one connected account (dashboard widgets). */
  onOpenInboxWithMailbox?: (mailboxId: string, filter?: InboxFilter) => void
  /** Open calendar filtered to one mailbox (per-mailbox schedule cards). */
  onOpenCalendarWithMailbox?: (mailboxId: string) => void
  mailboxScope?: string
  visible?: boolean
}) {
  const { user } = useAuth()
  const requestSeqRef = useRef(0)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [stats, setStats] = useState({ unreadTotal: 0, highPriority: 0 })
  const [emailStats, setEmailStats] = useState({
    grandTotal: 0, totalUnread: 0, totalReplied: 0, totalUnreplied: 0,
    todayTotal: 0, todayUnread: 0, todayReplied: 0, todayUnreplied: 0,
    totalRepliesSent: 0, todayRepliesSent: 0,
  })
  const [todayEmails, setTodayEmails] = useState<Email[]>([])
  const [mailboxStats, setMailboxStats] = useState<Record<string, {
    todayTotal: number
    grandTotal: number
    todayUnread: number
    totalUnread: number
    todayReplied: number
    totalReplied: number
    todayUnreplied: number
    totalUnreplied: number
  }>>({})
  const [mailboxMeetingStats, setMailboxMeetingStats] = useState<Record<string, {
    count: number
    conflicts: number
    next: BriefingApi["stats"]["next_meeting"]
  }>>({})
  const [loading, setLoading] = useState(true)
  const [widgetRefreshKey, setWidgetRefreshKey] = useState(0)
  const [meetingsToday, setMeetingsToday] = useState<{
    count: number
    conflicts: number
    next: BriefingApi["stats"]["next_meeting"]
  }>({ count: 0, conflicts: 0, next: null })

  const hasLoadedOnceRef = useRef(false)
  const prevDashboardVisibleRef = useRef(false)
  const isFirstMailboxScopeMountRef = useRef(true)
  const [scopeSwitchBusy, setScopeSwitchBusy] = useState(false)

  /** Lightweight: briefing payload only (today's schedule, list items, stats). */
  const refreshBriefingFromApi = useCallback(() => {
    const seq = ++requestSeqRef.current
    const scopeAtRequest = mailboxScope
    briefingApi
      .get({ mailbox_id: mailboxScope !== "all" ? mailboxScope : undefined })
      .then((data) => {
        if (seq !== requestSeqRef.current || scopeAtRequest !== mailboxScope) return
        setStats({
          unreadTotal: data.stats.unread_total,
          highPriority: data.stats.high_priority,
        })
        setMeetingsToday({
          count: data.stats.meetings_today_count ?? 0,
          conflicts: data.stats.meetings_today_conflicts ?? 0,
          next: data.stats.next_meeting ?? null,
        })
      })
      .catch(() => {})
  }, [mailboxScope])

  const refreshDashboard = useCallback(() => {
    const seq = ++requestSeqRef.current
    const scopeAtRequest = mailboxScope
    const dashboardCacheKey = `smartmail:dashboard:v1:${mailboxScope}`

    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(dashboardCacheKey) : null
      if (raw) {
        const parsed = JSON.parse(raw) as {
          ts: number
          mailboxes?: Mailbox[]
          stats?: { unreadTotal: number; highPriority: number }
          emailStats?: {
            grandTotal: number
            totalUnread: number
            totalReplied: number
            totalUnreplied: number
            todayTotal: number
            todayUnread: number
            todayReplied: number
            todayUnreplied: number
            totalRepliesSent: number
            todayRepliesSent: number
          }
          todayEmails?: Email[]
          meetingsToday?: {
            count: number
            conflicts: number
            next: BriefingApi["stats"]["next_meeting"]
          }
          mailboxStats?: Record<string, {
            todayTotal: number
            grandTotal: number
            todayUnread: number
            totalUnread: number
            todayReplied: number
            totalReplied: number
            todayUnreplied: number
            totalUnreplied: number
          }>
          mailboxMeetingStats?: Record<string, {
            count: number
            conflicts: number
            next: BriefingApi["stats"]["next_meeting"]
          }>
        }
        if (
          typeof parsed.ts === "number" &&
          Date.now() - parsed.ts < DASHBOARD_CACHE_TTL_MS
        ) {
          if (Array.isArray(parsed.mailboxes)) setMailboxes(parsed.mailboxes)
          if (parsed.stats) setStats(parsed.stats)
          if (parsed.emailStats) setEmailStats(parsed.emailStats)
          if (Array.isArray(parsed.todayEmails)) setTodayEmails(parsed.todayEmails)
          if (parsed.meetingsToday) setMeetingsToday(parsed.meetingsToday)
          if (parsed.mailboxStats && typeof parsed.mailboxStats === "object") {
            setMailboxStats(parsed.mailboxStats)
          }
          if (parsed.mailboxMeetingStats && typeof parsed.mailboxMeetingStats === "object") {
            setMailboxMeetingStats(parsed.mailboxMeetingStats)
          }
          setLoading(false)
          setWidgetRefreshKey((k) => k + 1)
        }
      }
    } catch {
      // ignore corrupt cache
    }

    Promise.all([
    briefingApi
        .get({ mailbox_id: mailboxScope !== "all" ? mailboxScope : undefined })
      .then((data) => {
          setStats({
            unreadTotal: data.stats.unread_total,
            highPriority: data.stats.high_priority,
          })
          setMeetingsToday({
            count: data.stats.meetings_today_count ?? 0,
            conflicts: data.stats.meetings_today_conflicts ?? 0,
            next: data.stats.next_meeting ?? null,
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
        .stats(mailboxScope !== "all" ? { mailbox_id: mailboxScope } : undefined)
        .then((s) => {
          setEmailStats({
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
          })
          return s
        })
        .catch(() => null),
      emailsApi
        .list({
          limit: 100,
          inbox_preset: "today",
          ...(mailboxScope !== "all" ? { mailbox_id: mailboxScope } : {}),
        })
        .then((res) => {
          const mapped = (res.emails ?? []).map(mapEmailListApi)
          setTodayEmails(mapped)
          return res
        })
        .catch(() => null),
    ])
      .then(([briefingData, mbList, statsData, listRes]) => {
        if (seq !== requestSeqRef.current || scopeAtRequest !== mailboxScope) return
        if (briefingData && mbList) {
          const unreadMap = new Map(
            briefingData.mailboxes.map((m: { id: string; unread: number }) => [m.id, m.unread ?? 0])
          )
          setMailboxes((prev) => prev.map((mb) => ({ ...mb, unread: unreadMap.get(mb.id) ?? mb.unread })))
        }

        // Unblock the main dashboard as soon as core payloads are ready.
        // Per-mailbox widget details can hydrate in the background.
        setLoading(false)
        setWidgetRefreshKey((k) => k + 1)
        hasLoadedOnceRef.current = true

        try {
          if (
            typeof window !== "undefined" &&
            briefingData &&
            mbList &&
            statsData &&
            listRes
          ) {
            const unreadMap = new Map(
              briefingData.mailboxes.map((m: { id: string; unread: number }) => [m.id, m.unread ?? 0])
            )
            const mailboxesForCache = mbList.map((m) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              provider: "imap" as const,
              color: m.color || "#0ea5e9",
              unread: unreadMap.get(m.id) ?? 0,
              synced: m.sync_status === "synced",
              syncStatus: m.sync_status,
              lastSync: m.last_sync_at ? new Date(m.last_sync_at).toLocaleString() : "Never",
            }))
            sessionStorage.setItem(
              dashboardCacheKey,
              JSON.stringify({
                ts: Date.now(),
                mailboxes: mailboxesForCache,
                stats: {
                  unreadTotal: briefingData.stats.unread_total,
                  highPriority: briefingData.stats.high_priority,
                },
                meetingsToday: {
                  count: briefingData.stats.meetings_today_count ?? 0,
                  conflicts: briefingData.stats.meetings_today_conflicts ?? 0,
                  next: briefingData.stats.next_meeting ?? null,
                },
                emailStats: {
                  grandTotal: statsData.grand_total,
                  totalUnread: statsData.total_unread,
                  totalReplied: statsData.total_replied,
                  totalUnreplied: statsData.total_unreplied,
                  todayTotal: statsData.today_total,
                  todayUnread: statsData.today_unread,
                  todayReplied: statsData.today_replied,
                  todayUnreplied: statsData.today_unreplied,
                  totalRepliesSent: statsData.total_replies_sent ?? 0,
                  todayRepliesSent: statsData.today_replies_sent ?? 0,
                },
                todayEmails: (listRes.emails ?? []).map(mapEmailListApi),
              }),
            )
          }
        } catch {
          // quota / private mode
        }

        if (mbList) {
          const targets = mailboxScope === "all" ? mbList : mbList.filter((mb) => mb.id === mailboxScope)
          Promise.all(
            targets.map(async (mb) => {
              try {
                const s = await emailsApi.stats({ mailbox_id: mb.id })
                return [mb.id, {
                  todayTotal: s.today_total,
                  grandTotal: s.grand_total,
                  todayUnread: s.today_unread,
                  totalUnread: s.total_unread,
                  todayReplied: s.today_replies_sent ?? 0,
                  totalReplied: s.total_replies_sent ?? 0,
                  todayUnreplied: s.today_unreplied,
                  totalUnreplied: s.total_unreplied,
                }] as const
              } catch {
                return [mb.id, {
                  todayTotal: 0,
                  grandTotal: 0,
                  todayUnread: 0,
                  totalUnread: 0,
                  todayReplied: 0,
                  totalReplied: 0,
                  todayUnreplied: 0,
                  totalUnreplied: 0,
                }] as const
              }
            })
          ).then((entries) => {
            if (seq !== requestSeqRef.current || scopeAtRequest !== mailboxScope) return
            const nextStats = Object.fromEntries(entries)
            setMailboxStats(nextStats)
            try {
              const raw = typeof window !== "undefined" ? sessionStorage.getItem(dashboardCacheKey) : null
              if (!raw) return
              const o = JSON.parse(raw) as Record<string, unknown>
              o.mailboxStats = nextStats
              o.ts = Date.now()
              sessionStorage.setItem(dashboardCacheKey, JSON.stringify(o))
            } catch {
              // ignore
            }
          })

          Promise.all(
            targets.map(async (mb) => {
              try {
                const b = await briefingApi.get({ mailbox_id: mb.id })
                return [mb.id, {
                  count: b.stats.meetings_today_count ?? 0,
                  conflicts: b.stats.meetings_today_conflicts ?? 0,
                  next: b.stats.next_meeting ?? null,
                }] as const
              } catch {
                return [mb.id, { count: 0, conflicts: 0, next: null }] as const
              }
            })
          ).then((meetingEntries) => {
            if (seq !== requestSeqRef.current || scopeAtRequest !== mailboxScope) return
            const nextMeetings = Object.fromEntries(meetingEntries)
            setMailboxMeetingStats(nextMeetings)
            try {
              const raw = typeof window !== "undefined" ? sessionStorage.getItem(dashboardCacheKey) : null
              if (!raw) return
              const o = JSON.parse(raw) as Record<string, unknown>
              o.mailboxMeetingStats = nextMeetings
              o.ts = Date.now()
              sessionStorage.setItem(dashboardCacheKey, JSON.stringify(o))
            } catch {
              // ignore
            }
          })
        }
      })
      .finally(() => {
        // Only the latest request may clear loading / scope banner (avoids stuck UI if scope changes mid-flight).
        if (seq !== requestSeqRef.current) return
        setLoading(false)
        setScopeSwitchBusy(false)
      })
  }, [mailboxScope])

  useEffect(() => {
    if (isFirstMailboxScopeMountRef.current) {
      isFirstMailboxScopeMountRef.current = false
      return
    }
    setScopeSwitchBusy(true)
  }, [mailboxScope])

  useEffect(() => {
    refreshDashboard()
  }, [refreshDashboard])

  useEffect(() => {
    const becameVisible = visible && !prevDashboardVisibleRef.current
    prevDashboardVisibleRef.current = visible
    if (!becameVisible || !hasLoadedOnceRef.current) return
    refreshDashboard()
  }, [visible, refreshDashboard])

  useEffect(() => {
    const onRefresh = () => refreshDashboard()
    const onCalendar = () => refreshBriefingFromApi()
    window.addEventListener("mailbox:updated", onRefresh)
    window.addEventListener("mailbox:sync-complete", onRefresh)
    window.addEventListener("email:sync", onRefresh)
    window.addEventListener("folder-counts:refresh", onRefresh)
    window.addEventListener("calendar:updated", onCalendar)
    return () => {
      window.removeEventListener("mailbox:updated", onRefresh)
      window.removeEventListener("mailbox:sync-complete", onRefresh)
      window.removeEventListener("email:sync", onRefresh)
      window.removeEventListener("folder-counts:refresh", onRefresh)
      window.removeEventListener("calendar:updated", onCalendar)
    }
  }, [refreshDashboard, refreshBriefingFromApi])

  /** Poll briefing so Today's schedule updates when meetings end (backend filters by current time). */
  useEffect(() => {
    if (!visible) return
    const tick = () => refreshBriefingFromApi()
    const id = window.setInterval(tick, BRIEFING_MEETINGS_REFRESH_MS)
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") tick()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [refreshBriefingFromApi, visible])

  useEffect(() => {
    if (!visible) return
    const hasSyncing = mailboxes.some((mb) => mb.syncStatus === "syncing" || mb.syncStatus === "pending")
    if (!hasSyncing) return
    const interval = setInterval(() => refreshDashboard(), 5000)
    return () => clearInterval(interval)
  }, [mailboxes, refreshDashboard, visible])

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

  const noMailboxConnected = !loading && mailboxes.length === 0
  const scopedMailboxes = mailboxScope === "all"
    ? mailboxes
    : mailboxes.filter((mb) => mb.id === mailboxScope)

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-150" />
          <div className="relative h-12 w-12 rounded-full border-2 border-primary/15" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <Image src={smartMailLogo} alt="Loading" className="absolute inset-0 m-auto h-5 w-5 object-contain opacity-80" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Loading your briefing</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Preparing your daily overview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {scopeSwitchBusy && (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-border/40 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
          Updating briefing for this mailbox…
        </div>
      )}
      {/* Hero Header */}
      <header className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-primary/[0.02] to-transparent" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/[0.04] rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-blue-500/[0.03] rounded-full translate-y-1/2 blur-3xl animate-float-slow" style={{ animationDelay: "-3s" }} />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-violet-500/[0.03] rounded-full blur-2xl animate-float-slow" style={{ animationDelay: "-1.5s" }} />
        <div className="relative px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-50 animate-float-slow" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/10 shadow-lg shadow-primary/10 ring-1 ring-primary/15 sm:h-14 sm:w-14">
                  <GreetingIcon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-balance text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {greeting},{" "}
                  <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient">
                    {user?.name || "there"}
                  </span>
                </h1>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 w-1 shrink-0 rounded-full bg-primary/40" />
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">{formattedDate}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end sm:gap-2.5 sm:pt-1">
              {noMailboxConnected ? (
                <Badge
                  variant="outline"
                  className="gap-1.5 rounded-full border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300"
                >
                  <Inbox className="h-3 w-3 shrink-0" />
                  No mailbox connected
                </Badge>
              ) : (
                <>
                  {stats.highPriority > 0 && (
                    <button
                      type="button"
                      aria-label="Open inbox filtered to today's high priority emails"
                      onClick={() => handleCardClick("today_high_priority")}
                      className={cn(
                        badgeVariants({ variant: "outline" }),
                        "gap-1.5 rounded-full border-red-400/25 bg-red-400/5 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm shadow-red-400/10 transition-colors hover:bg-red-400/10 dark:text-red-400",
                      )}
                    >
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-50" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                      </span>
                      {stats.highPriority} urgent
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Open inbox: ${stats.unreadTotal} unread`}
                    onClick={() => handleCardClick("total_unread")}
                    className={cn(
                      badgeVariants({ variant: "outline" }),
                      "gap-1.5 rounded-full border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/10 transition-colors hover:bg-primary/10",
                    )}
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    {stats.unreadTotal} unread
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        {noMailboxConnected ? (
          <div className="p-4 pb-8 sm:p-6 sm:pb-6">
            <ConnectMailboxCta onConnect={onConnectMailbox} variant="hero" />
          </div>
        ) : (
        <div className="space-y-5 p-4 pb-24 sm:space-y-6 sm:p-6 sm:pb-20 md:pb-8">
          {/* Row 1: AI Snapshot */}
          <AiSummaryBanner
            mailboxScope={mailboxScope}
            onOpenMailboxByEmail={
              onOpenInboxWithMailbox
                ? (email) => {
                    const e = (email || "").trim().toLowerCase()
                    if (!e) return
                    const m = mailboxes.find((mb) => (mb.email || "").toLowerCase() === e)
                    if (m) onOpenInboxWithMailbox(m.id)
                  }
                : undefined
            }
          />

          {/* Row 1: Stats */}
          <Card className="glass-card border-border/40 glow-ring overflow-hidden animate-entrance">
            <CardHeader className="space-y-3 border-b border-border/40 bg-gradient-to-r from-primary/[0.04] via-transparent to-blue-500/[0.03] pb-4 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Email stats</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {mailboxScope === "all" ? "Combined across all connected mailboxes" : "For the selected mailbox"}
                    </p>
                  </div>
                </div>
                {mailboxScope === "all" && (
                  <Badge variant="secondary" className="w-fit rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-semibold text-primary">
                    All mailboxes
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-muted/30 via-card/50 to-primary/[0.02] p-3 sm:p-4">
                <div className="mb-3 flex items-center gap-2 px-0.5">
                  <div className="h-px flex-1 bg-gradient-to-r from-primary/30 via-border/50 to-transparent" />
                  <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Overview
                  </p>
                  <div className="h-px flex-1 bg-gradient-to-l from-primary/30 via-border/50 to-transparent" />
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 briefing-stagger">
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
              </div>

              {mailboxScope === "all" && mailboxes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-0.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold text-foreground">Per mailbox</p>
                    <span className="text-[11px] text-muted-foreground">· {mailboxes.length} connected</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 briefing-stagger xl:grid-cols-2">
                    {mailboxes.map((mb) => {
                      const s = mailboxStats[mb.id] || {
                        todayTotal: 0,
                        grandTotal: 0,
                        todayUnread: 0,
                        totalUnread: 0,
                        todayReplied: 0,
                        totalReplied: 0,
                        todayUnreplied: 0,
                        totalUnreplied: 0,
                      }
                      return (
                        <MailboxStatsPanel
                          key={mb.id}
                          mailbox={mb}
                          stats={s}
                          onMetricClick={(filter) => onOpenInboxWithMailbox?.(mb.id, filter)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 2: Meetings */}
          <Card className="glass-card border-border/40 glow-ring overflow-hidden animate-entrance" style={{ animationDelay: "0.08s" }}>
            <CardHeader className="space-y-3 border-b border-border/40 bg-gradient-to-r from-violet-500/[0.04] via-transparent to-fuchsia-500/[0.03] pb-4 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/15">
                    <CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Meetings</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {mailboxScope === "all"
                        ? "Today's schedule across all mailboxes"
                        : "Today's schedule for this mailbox"}
                    </p>
                  </div>
                </div>
                {mailboxScope === "all" && (
                  <Badge variant="secondary" className="w-fit rounded-full border border-violet-500/15 bg-violet-500/8 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    All mailboxes
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-5">
              <MeetingsOverview
                count={meetingsToday.count}
                conflicts={meetingsToday.conflicts}
                next={meetingsToday.next}
                onOpenCalendar={() => onViewChange("calendar")}
              />

              {mailboxScope === "all" && mailboxes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-0.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold text-foreground">Per mailbox</p>
                    <span className="text-[11px] text-muted-foreground">· {mailboxes.length} connected</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 briefing-stagger xl:grid-cols-2">
                    {mailboxes.map((mb) => {
                      const m = mailboxMeetingStats[mb.id] || { count: 0, conflicts: 0, next: null }
                      return (
                        <MailboxMeetingsPanel
                          key={mb.id}
                          mailbox={mb}
                          stats={m}
                          onOpenCalendar={() => onOpenCalendarWithMailbox?.(mb.id)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 3: All Analytics in one box */}
          <Card className="glass-card border-border/40 glow-ring overflow-hidden">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-bold text-foreground">All Analytics</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 briefing-stagger">
                <EmailTrendsChart refreshKey={widgetRefreshKey} mailboxScope={mailboxScope} />
                <TopSenders refreshKey={widgetRefreshKey} mailboxScope={mailboxScope} />
                <MailboxStatus mailboxes={scopedMailboxes} onOpenInboxWithMailbox={onOpenInboxWithMailbox} />
              </div>
            </CardContent>
          </Card>

          {/* Row 4: Today's emails by priority + profile */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 briefing-stagger">
            <div className="lg:col-span-8">
              <TodayEmailsByPriority
                emails={todayEmails}
                mailboxes={scopedMailboxes}
                onEmailClick={onNavigateToEmail}
                onViewAllToday={() => handleCardClick("today")}
              />
            </div>
            <div className="lg:col-span-4">
              <AiProfileWidget mailboxScope={mailboxScope} />
            </div>
          </div>
        </div>
        )}
      </ScrollArea>
    </div>
  )
}
