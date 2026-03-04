"use client"

import { useState, useEffect } from "react"
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
import {
  Mail,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

const PIE_COLORS = ["hsl(199, 89%, 48%)", "hsl(162, 63%, 41%)", "hsl(38, 92%, 50%)", "hsl(330, 81%, 60%)", "hsl(262, 83%, 58%)", "hsl(25, 95%, 53%)"]

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  positive,
  icon: Icon,
}: {
  title: string
  value: string
  change: string
  changeLabel: string
  positive: boolean
  icon: React.ElementType
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  positive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {positive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {change}
              </span>
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-muted-foreground">
            <span style={{ color: entry.color }} className="font-medium">
              {entry.name}:
            </span>{" "}
            {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

 

export function AnalyticsView() {
  const [overview, setOverview] = useState<{ total_received: number; received_change: string; period_days: number } | null>(null)
  const [volume, setVolume] = useState<{ date: string; received: number }[]>([])
  const [topSenders, setTopSenders] = useState<{ name: string; email: string; count: number }[]>([])
  const [categories, setCategories] = useState<{ name: string; value: number; fill?: string }[]>([])
  const [metrics, setMetrics] = useState<{
    total_emails: number; unread: number; active_contacts: number;
    total_emails_change: string; unread_change: string; active_contacts_change: string;
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
          cats.map((c, i) => ({ ...c, fill: PIE_COLORS[i % PIE_COLORS.length], value: total ? Math.round((c.value / total) * 100) : 0 }))
        )
        setMetrics(mets)
        setMailboxes(mbs.map(mapMailboxApi))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onMailboxUpdated = () => {
      mailboxesApi.list().then((mbs) => setMailboxes(mbs.map(mapMailboxApi))).catch(() => {})
    }
    window.addEventListener("mailbox:updated", onMailboxUpdated)
    return () => window.removeEventListener("mailbox:updated", onMailboxUpdated)
  }, [])

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
          <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
          <p className="text-xs text-muted-foreground">Email intelligence across all mailboxes</p>
        </div>
        <Badge variant="outline" className="border-border text-muted-foreground text-xs">
          Last 7 days
        </Badge>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <MetricCard
              title="Total Received"
              value={overview ? String(overview.total_received) : "0"}
              change={overview?.received_change ?? "—"}
              changeLabel="vs last week"
              positive={!(overview?.received_change?.startsWith("-"))}
              icon={Mail}
            />
            <MetricCard
              title="Total Emails"
              value={metrics ? String(metrics.total_emails) : "0"}
              change={metrics?.total_emails_change ?? "—"}
              changeLabel="vs last week"
              positive={!(metrics?.total_emails_change?.startsWith("-"))}
              icon={Mail}
            />
            <MetricCard
              title="Unread"
              value={metrics ? String(metrics.unread) : "0"}
              change={metrics?.unread_change ?? "—"}
              changeLabel="vs last week"
              positive={metrics?.unread_change?.startsWith("-") || metrics?.unread_change === "0%"}
              icon={Clock}
            />
            <MetricCard
              title="Active Contacts"
              value={metrics ? String(metrics.active_contacts) : "0"}
              change={metrics?.active_contacts_change ?? "—"}
              changeLabel="vs last week"
              positive={!(metrics?.active_contacts_change?.startsWith("-"))}
              icon={Users}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            {/* Volume Chart */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Email Volume</CardTitle>
                <p className="text-xs text-muted-foreground">Received vs sent this week</p>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volume} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 14%)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(215, 14%, 50%)", fontSize: 12 }}
                        axisLine={{ stroke: "hsl(220, 14%, 14%)" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "hsl(215, 14%, 50%)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="received" name="Received" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Category Breakdown</CardTitle>
                <p className="text-xs text-muted-foreground">Email distribution by type</p>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill ?? PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
                  {categories.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.fill }} />
                      <span className="text-xs text-muted-foreground">{cat.name}</span>
                      <span className="text-xs font-medium text-foreground">{cat.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            {/* Top Senders */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Top Senders</CardTitle>
                <p className="text-xs text-muted-foreground">Most active contacts this week</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {topSenders.map((sender, i) => (
                    <div key={sender.email} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{sender.name}</p>
                          <p className="text-xs text-muted-foreground">{sender.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">
                        {sender.count} emails
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

 
          </div>

          {/* Mailbox Comparison */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Mailbox Comparison</CardTitle>
              <p className="text-xs text-muted-foreground">Activity breakdown per connected mailbox</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {mailboxes.map((mb) => (
                  <div key={mb.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: mb.color }} />
                      <span className="text-sm font-semibold text-foreground">{mb.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{mb.email}</p>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-lg font-bold text-foreground">{mb.unread}</p>
                        <p className="text-[11px] text-muted-foreground">Unread</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{Math.floor(Math.random() * 50) + 20}</p>
                        <p className="text-[11px] text-muted-foreground">This week</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
