"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { analytics, mailboxes as mailboxesApi } from "@/lib/api"
import { mapMailboxApi } from "@/lib/mappers"
import type { Mailbox } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import {
  Mail,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChartIcon,
  TrendingUp,
  Inbox,
  CheckCircle2,
  Loader2,
  XCircle,
  Crown,
  Medal,
  Award,
  Minus,
} from "lucide-react"

const PIE_COLORS = [
  "hsl(199, 89%, 48%)",
  "hsl(162, 63%, 41%)",
  "hsl(38, 92%, 50%)",
  "hsl(330, 81%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(25, 95%, 53%)",
]

const GRADIENT_CONFIGS = [
  { from: "from-blue-500", to: "to-cyan-500", shadow: "shadow-blue-500/20" },
  { from: "from-emerald-500", to: "to-teal-500", shadow: "shadow-emerald-500/20" },
  { from: "from-amber-500", to: "to-orange-500", shadow: "shadow-amber-500/20" },
  { from: "from-purple-500", to: "to-violet-500", shadow: "shadow-purple-500/20" },
]

const SENDER_GRADIENTS = [
  "from-blue-500 to-cyan-600",
  "from-purple-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
]

/* ─── Metric Card ─────────────────────────────────────────────────────── */

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  positive,
  icon: Icon,
  gradient,
  delay = 0,
}: {
  title: string
  value: string
  change: string
  changeLabel: string
  positive: boolean
  icon: React.ElementType
  gradient: (typeof GRADIENT_CONFIGS)[number]
  delay?: number
}) {
  return (
    <Card
      className="relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("absolute inset-0 opacity-[0.03] bg-gradient-to-br", gradient.from, gradient.to)} />
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-[0.06] bg-gradient-to-br transition-opacity group-hover:opacity-[0.1]"
        style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }}
      />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5",
                  positive
                    ? "text-emerald-500 bg-emerald-500/10"
                    : change.startsWith("-")
                      ? "text-red-400 bg-red-400/10"
                      : "text-muted-foreground bg-muted"
                )}
              >
                {positive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : change.startsWith("-") ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                {change}
              </span>
              <span className="text-[11px] text-muted-foreground/70">{changeLabel}</span>
            </div>
          </div>
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105 bg-gradient-to-br",
            gradient.from, gradient.to, gradient.shadow
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Custom Tooltip ──────────────────────────────────────────────────── */

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-sm px-4 py-3 shadow-xl">
        <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{entry.value}</span> {entry.name}
            </p>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-sm px-4 py-3 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
          <p className="text-xs font-semibold text-foreground">{payload[0].name}</p>
        </div>
        <p className="text-lg font-bold text-foreground mt-1">{payload[0].value}%</p>
      </div>
    )
  }
  return null
}

/* ─── Rank Icon ───────────────────────────────────────────────────────── */

function RankIndicator({ rank }: { rank: number }) {
  if (rank === 0) return <Crown className="h-4 w-4 text-amber-400" />
  if (rank === 1) return <Medal className="h-4 w-4 text-slate-400" />
  if (rank === 2) return <Award className="h-4 w-4 text-amber-600" />
  return (
    <span className="text-[11px] font-bold text-muted-foreground/60 w-4 text-center">
      {rank + 1}
    </span>
  )
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export function AnalyticsView() {
  const [overview, setOverview] = useState<{
    total_received: number
    received_change: string
    period_days: number
  } | null>(null)
  const [volume, setVolume] = useState<{ date: string; received: number }[]>([])
  const [topSenders, setTopSenders] = useState<{ name: string; email: string; count: number }[]>([])
  const [categories, setCategories] = useState<{ name: string; value: number; fill?: string }[]>([])
  const [metrics, setMetrics] = useState<{
    total_emails: number
    unread: number
    active_contacts: number
    total_emails_change: string
    unread_change: string
    active_contacts_change: string
  } | null>(null)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const days = 7
    Promise.all([
      analytics.overview(days),
      analytics.volume(days),
      analytics.topSenders(5),
      analytics.categories(),
      analytics.metrics(),
      mailboxesApi.list(),
    ])
      .then(([ov, vol, senders, cats, mets, mbs]) => {
        setOverview(ov)
        setVolume(vol)
        setTopSenders(senders)
        const total = cats.reduce((s, c) => s + c.value, 0)
        setCategories(
          cats.map((c, i) => ({
            ...c,
            fill: PIE_COLORS[i % PIE_COLORS.length],
            value: total ? Math.round((c.value / total) * 100) : 0,
          }))
        )
        setMetrics(mets)
        setMailboxes(mbs.map(mapMailboxApi))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onMailboxUpdated = () => {
      mailboxesApi
        .list()
        .then((mbs) => setMailboxes(mbs.map(mapMailboxApi)))
        .catch(() => {})
    }
    window.addEventListener("mailbox:updated", onMailboxUpdated)
    return () => window.removeEventListener("mailbox:updated", onMailboxUpdated)
  }, [])

  const volumeStats = useMemo(() => {
    const totalEmails = volume.reduce((a, d) => a + d.received, 0)
    const avgPerDay = Math.round(totalEmails / Math.max(volume.length, 1))
    const peakDay = volume.reduce((max, d) => (d.received > max.received ? d : max), volume[0] ?? { date: "—", received: 0 })
    return { totalEmails, avgPerDay, peakDay }
  }, [volume])

  const categoryTotal = useMemo(
    () => categories.reduce((s, c) => s + c.value, 0),
    [categories]
  )

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Hero Header */}
      <header className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.04] via-primary/[0.02] to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.03] rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/[0.02] rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />
        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 shadow-lg shadow-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Analytics</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Email intelligence across all mailboxes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary font-semibold text-xs gap-1.5 px-3 py-1"
              >
                <Clock className="h-3 w-3" />
                Last 7 days
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Received"
              value={overview ? String(overview.total_received) : "0"}
              change={overview?.received_change ?? "—"}
              changeLabel="vs last week"
              positive={!overview?.received_change?.startsWith("-")}
              icon={Mail}
              gradient={GRADIENT_CONFIGS[0]}
              delay={0}
            />
            <MetricCard
              title="Total Emails"
              value={metrics ? String(metrics.total_emails) : "0"}
              change={metrics?.total_emails_change ?? "—"}
              changeLabel="vs last week"
              positive={!metrics?.total_emails_change?.startsWith("-")}
              icon={Inbox}
              gradient={GRADIENT_CONFIGS[1]}
              delay={50}
            />
            <MetricCard
              title="Unread"
              value={metrics ? String(metrics.unread) : "0"}
              change={metrics?.unread_change ?? "—"}
              changeLabel="vs last week"
              positive={metrics?.unread_change?.startsWith("-") || metrics?.unread_change === "0%"}
              icon={Clock}
              gradient={GRADIENT_CONFIGS[2]}
              delay={100}
            />
            <MetricCard
              title="Active Contacts"
              value={metrics ? String(metrics.active_contacts) : "0"}
              change={metrics?.active_contacts_change ?? "—"}
              changeLabel="vs last week"
              positive={!metrics?.active_contacts_change?.startsWith("-")}
              icon={Users}
              gradient={GRADIENT_CONFIGS[3]}
              delay={150}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Volume Chart */}
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-cyan-500/10">
                      <BarChart3 className="h-4 w-4 text-blue-400" />
                    </div>
                    Email Volume
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2.5 py-0.5 border-border/60 text-muted-foreground font-medium"
                  >
                    7 days
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-[38px]">
                  Received emails over the past week
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-3">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volume} barGap={4} barSize={32}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(199, 89%, 48%)" stopOpacity={1} />
                          <stop offset="100%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                        axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                        tickLine={false}
                        dy={8}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        dx={-4}
                      />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                      <Bar dataKey="received" name="Received" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Volume Summary */}
                <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/70 font-medium uppercase">Total</p>
                      <p className="text-sm font-bold text-foreground">{volumeStats.totalEmails}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                      <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/70 font-medium uppercase">Avg/Day</p>
                      <p className="text-sm font-bold text-foreground">{volumeStats.avgPerDay}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/70 font-medium uppercase">Peak</p>
                      <p className="text-sm font-bold text-foreground">
                        {volumeStats.peakDay.received}{" "}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {volumeStats.peakDay.date}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/15 to-violet-500/10">
                      <PieChartIcon className="h-4 w-4 text-purple-400" />
                    </div>
                    Category Breakdown
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2.5 py-0.5 border-border/60 text-muted-foreground font-medium"
                  >
                    {categories.length} categories
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-[38px]">
                  Email distribution by type
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-2">
                <div className="flex items-center gap-6">
                  {/* Donut Chart with Center Label */}
                  <div className="relative flex-shrink-0">
                    <div className="h-[180px] w-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categories}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={82}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                            animationBegin={200}
                            animationDuration={800}
                          >
                            {categories.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.fill ?? PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-foreground">{categoryTotal}%</span>
                      <span className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wider">
                        Total
                      </span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 flex flex-col gap-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.name}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/30 group"
                      >
                        <div
                          className="h-3 w-3 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background transition-transform group-hover:scale-110"
                          style={{ backgroundColor: cat.fill, boxShadow: `0 0 8px ${cat.fill}30` }}
                        />
                        <span className="text-xs text-muted-foreground flex-1 font-medium">{cat.name}</span>
                        <span className="text-xs font-bold text-foreground">{cat.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Senders */}
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/15 to-pink-500/10">
                      <Users className="h-4 w-4 text-rose-400" />
                    </div>
                    Top Senders
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2.5 py-0.5 border-border/60 text-muted-foreground font-medium"
                  >
                    This week
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-[38px]">
                  Most active contacts this week
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex flex-col gap-2">
                  {topSenders.map((sender, i) => {
                    const maxCount = Math.max(...topSenders.map((s) => s.count), 1)
                    const pct = (sender.count / maxCount) * 100
                    return (
                      <div
                        key={sender.email}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-muted/30 group"
                      >
                        <div className="flex items-center justify-center w-5 shrink-0">
                          <RankIndicator rank={i} />
                        </div>
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white shadow-sm bg-gradient-to-br transition-transform group-hover:scale-105",
                            SENDER_GRADIENTS[i % SENDER_GRADIENTS.length]
                          )}
                        >
                          {sender.name
                            ? sender.name.charAt(0).toUpperCase()
                            : sender.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {sender.name || sender.email}
                            </p>
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-2 py-0.5 bg-muted/80 font-semibold shrink-0 ml-2"
                            >
                              {sender.count} emails
                            </Badge>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700 bg-gradient-to-r",
                                SENDER_GRADIENTS[i % SENDER_GRADIENTS.length]
                              )}
                              style={{ width: `${pct}%`, opacity: 0.7 }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {topSenders.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No sender data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mailbox Comparison */}
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10">
                      <Inbox className="h-4 w-4 text-emerald-400" />
                    </div>
                    Mailbox Overview
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2.5 py-0.5 border-border/60 text-muted-foreground font-medium"
                  >
                    {mailboxes.length} connected
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-[38px]">
                  Activity breakdown per connected mailbox
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex flex-col gap-3">
                  {mailboxes.map((mb) => (
                    <div
                      key={mb.id}
                      className="flex items-start gap-4 rounded-xl border border-border/50 p-4 transition-all hover:border-border hover:shadow-sm group"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-sm"
                          style={{
                            background: `linear-gradient(135deg, ${mb.color}, ${mb.color}99)`,
                            boxShadow: `0 4px 12px ${mb.color}30`,
                          }}
                        >
                          {mb.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {mb.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {mb.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {mb.syncStatus === "syncing" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            ) : mb.syncStatus === "error" ? (
                              <XCircle className="h-3.5 w-3.5 text-red-400" />
                            ) : mb.synced ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-amber-400" />
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {mb.syncStatus === "syncing"
                                ? "Syncing..."
                                : mb.syncStatus === "pending"
                                  ? "Pending"
                                  : "Synced"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          {mb.unread > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="h-6 w-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                                <Mail className="h-3 w-3 text-amber-400" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground">{mb.unread}</p>
                                <p className="text-[9px] text-muted-foreground/70 uppercase">Unread</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                              <Clock className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {mb.lastSync}
                              </p>
                              <p className="text-[9px] text-muted-foreground/70 uppercase">Last sync</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {mailboxes.length === 0 && (
                    <div className="text-center py-8">
                      <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No mailboxes connected</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        Connect a mailbox to see analytics
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
