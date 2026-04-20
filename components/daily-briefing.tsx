"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { mapBriefingItem, mapEmailListApi } from "@/lib/mappers"
import type { Mailbox, BriefingItem, Email } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import smartMailLogo from "@/logo/Smart Mail Logo.png"
import smartMailLogoWhite from "@/logo/Smart Mail Logo White.png"

const BRIEFING_MEETINGS_REFRESH_MS = 20_000

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
  meeting: { icon: CalendarDays, color: "text-violet-400", bg: "bg-violet-400/10", accent: "border-l-violet-500", label: "Meeting", groupLabel: "Today's Meetings", groupOrder: 2 },
  deadline: { icon: Calendar, color: "text-orange-400", bg: "bg-orange-400/10", accent: "border-l-orange-500", label: "Deadline", groupLabel: "Upcoming Deadlines", groupOrder: 3 },
  vip: { icon: Star, color: "text-primary", bg: "bg-primary/10", accent: "border-l-primary", label: "VIP", groupLabel: "VIP Messages", groupOrder: 4 },
  risk: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-400/10", accent: "border-l-red-500", label: "Risk", groupLabel: "Potential Risks", groupOrder: 5 },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10", accent: "border-l-blue-500", label: "Info", groupLabel: "Recent Updates", groupOrder: 6 },
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

/** Fixes common calendar/title typos for display only */
function normalizeMeetingTitle(title: string): string {
  const t = title.trim()
  if (/^metting$/i.test(t)) return "Meeting"
  return title
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
        "group/stat relative overflow-hidden glass-card glow-ring transition-all duration-300",
        onClick && "cursor-pointer glow-ring-hover hover:-translate-y-1 active:translate-y-0"
      )}
      onClick={onClick}
    >
      <div className={cn("absolute inset-0 opacity-[0.04] transition-opacity duration-300 group-hover/stat:opacity-[0.08]", `bg-gradient-to-br ${gradientFrom} ${gradientTo}`)} />
      <div className={cn("absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-[0.06] blur-2xl transition-all duration-500 group-hover/stat:opacity-[0.12] group-hover/stat:scale-110", `bg-gradient-to-br ${gradientFrom} ${gradientTo}`)} />
      <CardContent className="relative p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4">
          <p className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:text-[11px]">
            {label}
          </p>
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md ring-1 ring-white/10 transition-transform duration-300 group-hover/stat:scale-105 sm:h-10 sm:w-10 sm:shadow-lg dark:ring-white/5",
              `bg-gradient-to-br ${gradientFrom} ${gradientTo}`,
            )}
          >
            <Icon className="h-4 w-4 text-white drop-shadow-sm sm:h-[18px] sm:w-[18px]" />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-3xl">{value}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">today</span>
          </div>
          {totalValue !== undefined && (
            <div className="flex items-baseline justify-end gap-1.5 text-right">
              <span className="text-base font-bold tabular-nums text-muted-foreground/80 sm:text-lg">{totalValue}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">total</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
}: {
  /** Open inbox scoped to the mailbox whose account email matches (from AI snapshot). */
  onOpenMailboxByEmail?: (mailboxEmail: string) => void
} = {}) {
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

function TopSenders({ refreshKey }: { refreshKey: number }) {
  const openSenderInbox = (s: { email: string; name: string }) => {
    window.dispatchEvent(
      new CustomEvent("contacts:showEmailsFrom", {
        detail: { from_email: s.email, from_name: s.name || s.email },
      })
    )
  }
  const [senders, setSenders] = useState<{ email: string; name: string; count: number }[]>([])

  useEffect(() => {
    analyticsApi.topSenders(5).then(setSenders).catch(() => {})
  }, [refreshKey])

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
    <Card className="glass-card border-border/40 glow-ring overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 shadow-sm">
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
              <div key={a.id} className="flex items-start gap-3 py-2.5 group relative">
                <div className="flex flex-col items-center z-10">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 shadow-sm group-hover:scale-105", a.iconBg)}>
                    <Icon className={cn("h-3.5 w-3.5", a.iconColor)} />
                  </div>
                </div>
                {i < activities.length - 1 && (
                  <div className="absolute left-[15px] top-11 w-px h-[calc(100%-24px)] bg-gradient-to-b from-border/50 to-transparent" />
                )}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs text-foreground leading-relaxed">
                    <span className="font-bold">{a.action}</span>{" "}
                    <span className="text-muted-foreground/80">{a.subject}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-semibold">
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

/* ─── Today's meetings (dashboard) ───────────────────────────────────── */

function TodaysMeetingsCard({
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
  let nextTime = ""
  let nextTitle = ""
  if (next) {
    nextTitle = normalizeMeetingTitle(next.title || "Meeting")
    try {
      nextTime = format(parseISO(next.start), "p")
    } catch {
      nextTime = ""
    }
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpenCalendar()
        }
      }}
      className={cn(
        "group/meet relative overflow-hidden cursor-pointer border border-border/50",
        "bg-gradient-to-b from-card via-card to-violet-500/[0.03]",
        "shadow-sm shadow-black/5 dark:shadow-black/20",
        "transition-all duration-300",
        "hover:border-violet-500/25 hover:shadow-md hover:shadow-violet-500/10",
        "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.998]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      onClick={onOpenCalendar}
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 via-purple-500 to-fuchsia-600 opacity-90" />

      {/* Decorative grid */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-32 w-40 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: "12px 12px",
        }}
      />

      <CardContent className="relative p-4 pl-3.5 sm:p-5 sm:pl-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6">
          {/* Left: icon + stats */}
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 blur-md opacity-70 transition-opacity group-hover/meet:opacity-100" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 via-purple-500/15 to-fuchsia-500/10 shadow-inner ring-1 ring-white/10 sm:h-14 sm:w-14 dark:ring-white/5">
                <CalendarDays className="h-6 w-6 text-violet-300 sm:h-7 sm:w-7" strokeWidth={1.5} />
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Today&apos;s schedule
                </span>
                {count > 0 && (
                  <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-300">
                    {count} {count === 1 ? "event" : "events"}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-3xl font-black tabular-nums tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  {count}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  meeting{count !== 1 ? "s" : ""} today
                </span>
              </div>

              {conflicts > 0 && (
                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {conflicts} time conflict{conflicts !== 1 ? "s" : ""} — review in calendar
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: next meeting or empty */}
          <div className="flex min-w-0 flex-1 flex-col justify-center sm:max-w-[min(100%,20rem)] sm:border-l sm:border-border/40 sm:pl-6">
            {next ? (
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3.5 backdrop-blur-sm transition-colors group-hover/meet:bg-muted/50 dark:bg-muted/25">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Next up
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                  {nextTitle}
                </p>
                {nextTime && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300/90">
                    <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    {nextTime}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[5.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-5 text-center">
                <p className="text-sm font-medium text-muted-foreground">No meetings left today</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Open calendar to plan ahead</p>
              </div>
            )}
          </div>
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
      <div className="flex flex-col items-center justify-center py-20 text-center animate-entrance">
        <div className="relative mb-5">
          <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-2xl scale-150 animate-float-slow" />
          <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-emerald-400/5 ring-1 ring-emerald-400/20 shadow-lg shadow-emerald-400/10">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          </div>
        </div>
        <p className="text-lg font-bold text-foreground">All caught up!</p>
        <p className="text-sm text-muted-foreground/70 mt-2 max-w-[260px] leading-relaxed">No pending briefing items. Enjoy your day!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      {groups.map((group) => {
        const GroupIcon = group.config.icon
        return (
          <div key={group.type} className="animate-entrance">
            <div className="flex items-center gap-3 mb-3.5">
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg shadow-sm", group.config.bg)}>
                <GroupIcon className={cn("h-3.5 w-3.5", group.config.color)} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground/80">
                {group.config.groupLabel}
              </h3>
              <div className="flex-1 briefing-section-line" />
              <Badge variant="secondary" className="text-[10px] px-2.5 py-0.5 bg-muted/60 font-bold rounded-full tabular-nums">
                {group.items.length}
              </Badge>
            </div>
            <div className="flex flex-col gap-2.5 briefing-stagger">
              {group.items.map((item) => {
                const config = typeConfig[item.type] || typeConfig.info
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "glass-card border-border/40 transition-all duration-300 cursor-pointer group overflow-hidden",
                      "hover:shadow-lg hover:shadow-primary/5 hover:border-border/70 hover:-translate-y-0.5 active:translate-y-0"
                    )}
                    onClick={() => onItemClick(item)}
                  >
                    <div className="flex">
                      <div className={cn("w-1 shrink-0 transition-all duration-300 group-hover:w-1.5", config.accent)} />
                      <CardContent className="flex-1 p-4">
                        <div className="flex gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <h4 className="text-sm font-bold text-foreground truncate">{item.title}</h4>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] px-2 py-0 shrink-0 font-bold rounded-full",
                                    item.priority === "high"
                                      ? "border-red-400/30 text-red-400 bg-red-400/5"
                                      : item.priority === "medium"
                                        ? "border-amber-400/30 text-amber-400 bg-amber-400/5"
                                        : "border-border/60 text-muted-foreground/70"
                                  )}
                                >
                                  {item.priority}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
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
                            <p className="mt-2 text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              {item.type === "meeting" ? (
                                <span className="text-[10px] font-semibold text-muted-foreground/60 flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded-full">
                                  <CalendarDays className="h-3 w-3" />
                                  Calendar
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-muted-foreground/60 flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded-full">
                                  <Mail className="h-3 w-3" />
                                  {item.emails.length} email{item.emails.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
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
                <p className="text-[10px] text-muted-foreground/60 mb-0.5 font-semibold">Follow-up</p>
                <p className="text-[11px] text-foreground font-semibold truncate">{profile.response_preferences.follow_up_pattern}</p>
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
}: {
  onViewChange: (view: string) => void
  onNavigateInbox?: (filter: InboxFilter) => void
  onNavigateToEmail?: (emailId: string) => void
  /** Opens add-mailbox dialog when user has no accounts */
  onConnectMailbox?: () => void
  /** Open unified inbox filtered to one connected account (dashboard widgets). */
  onOpenInboxWithMailbox?: (mailboxId: string) => void
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
  const [meetingsToday, setMeetingsToday] = useState<{
    count: number
    conflicts: number
    next: BriefingApi["stats"]["next_meeting"]
  }>({ count: 0, conflicts: 0, next: null })

  /** Lightweight: briefing payload only (today's schedule, list items, stats). */
  const refreshBriefingFromApi = useCallback(() => {
    briefingApi
      .get()
      .then((data) => {
        setBriefingItems(data.items.map(mapBriefingItem))
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
  }, [])

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
    const onCalendar = () => refreshBriefingFromApi()
    window.addEventListener("mailbox:updated", onRefresh)
    window.addEventListener("mailbox:sync-complete", onRefresh)
    window.addEventListener("email:sync", onRefresh)
    window.addEventListener("calendar:updated", onCalendar)
    return () => {
      window.removeEventListener("mailbox:updated", onRefresh)
      window.removeEventListener("mailbox:sync-complete", onRefresh)
      window.removeEventListener("email:sync", onRefresh)
      window.removeEventListener("calendar:updated", onCalendar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Poll briefing so Today's schedule updates when meetings end (backend filters by current time). */
  useEffect(() => {
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
    if (item.type === "meeting") {
      onViewChange("calendar")
      if (item.meetingId) {
        queueMicrotask(() =>
          window.dispatchEvent(
            new CustomEvent("calendar:openMeeting", { detail: { id: item.meetingId } })
          )
        )
      }
      return
    }
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

  const noMailboxConnected = !loading && mailboxes.length === 0

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
                      aria-label="Open inbox filtered to today unreplied"
                      onClick={() => handleCardClick("today_unreplied")}
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
          {/* Row 1: Stats */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 briefing-stagger">
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

          {/* Row 2: Today's meetings */}
          <div className="animate-entrance" style={{ animationDelay: "0.08s" }}>
            <TodaysMeetingsCard
              count={meetingsToday.count}
              conflicts={meetingsToday.conflicts}
              next={meetingsToday.next}
              onOpenCalendar={() => onViewChange("calendar")}
            />
          </div>

          {/* Row 3: AI Snapshot */}
          <AiSummaryBanner
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

          {/* Row 3: Analytics strip — 3 equal cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 briefing-stagger">
            <EmailTrendsChart refreshKey={widgetRefreshKey} />
            <TopSenders refreshKey={widgetRefreshKey} />
            <MailboxStatus mailboxes={mailboxes} onOpenInboxWithMailbox={onOpenInboxWithMailbox} />
          </div>

          {/* Row 4: Briefing items + sidebar widgets */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
                    <Image src={smartMailLogo} alt="Today's Briefing" className="h-4 w-4 object-contain" />
                  </div>
                  Today&apos;s Briefing
                </h2>
                <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 border-border/50 text-muted-foreground/70 font-semibold rounded-full tabular-nums">
                  {briefingItems.filter((i) => !dismissedIds.has(i.id)).length} items
                </Badge>
              </div>
              <GroupedBriefingItems
                items={briefingItems}
                dismissedIds={dismissedIds}
                onDismiss={handleDismiss}
                onMarkDone={handleMarkDone}
                onItemClick={handleItemClick}
              />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-5 briefing-stagger">
              <AiProfileWidget />
              <RecentActivityFeed emails={allEmails} />
            </div>
          </div>
        </div>
        )}
      </ScrollArea>
    </div>
  )
}
