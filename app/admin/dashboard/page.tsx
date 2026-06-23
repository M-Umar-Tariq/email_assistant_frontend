"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  CalendarDays,
  Database,
  HardDrive,
  Inbox,
  ListTodo,
  Mail,
  Megaphone,
  Paperclip,
  RefreshCw,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { adminApi, type AdminActivityEvent, type AdminStats } from "@/lib/api"
import { cn } from "@/lib/utils"

function relativeTime(ts: string | null | undefined): string {
  if (!ts) return "—"
  const d = new Date(ts)
  const diff = Date.now() - d.getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return "just now"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? "yesterday" : `${days}d ago`
}

const primaryStats: {
  key: "users" | "mailboxes" | "emails_indexed" | "meetings"
  label: string
  icon: LucideIcon
  color: string
}[] = [
  { key: "users", label: "Users", icon: Users, color: "sky" },
  { key: "mailboxes", label: "Mailboxes", icon: Inbox, color: "violet" },
  { key: "emails_indexed", label: "Emails indexed", icon: Mail, color: "amber" },
  { key: "meetings", label: "Meetings", icon: ListTodo, color: "emerald" },
]

const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
  sky: { bg: "bg-sky-500/15", text: "text-sky-300", icon: "text-sky-400" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-300", icon: "text-violet-400" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-300", icon: "text-amber-400" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-300", icon: "text-emerald-400" },
}

const syncColors: Record<string, string> = {
  synced: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  syncing: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  pending: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  cancelled: "border-amber-500/30 bg-amber-500/10 text-amber-300",
}

function SparkLine({ data, tone = "sky" }: { data: { count: number }[]; tone?: "sky" | "violet" }) {
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.count), 1)
  const bar = tone === "violet" ? "bg-violet-400/60" : "bg-sky-400/60"
  return (
    <div className="flex h-10 items-end gap-1">
      {data.map((d, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-t-sm transition-all", bar)}
          style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
          title={`${d.count}`}
        />
      ))}
    </div>
  )
}

function MiniBarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums text-slate-300">
          {value.toLocaleString()}
          <span className="text-slate-600"> ({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

function activityIcon(type: string) {
  switch (type) {
    case "user_registered":
      return <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
    case "mailbox_added":
      return <Inbox className="h-3.5 w-3.5 text-violet-400" />
    case "sync_completed":
      return <RefreshCw className="h-3.5 w-3.5 text-sky-400" />
    case "feedback_submitted":
      return <Megaphone className="h-3.5 w-3.5 text-amber-400" />
    default:
      return <Activity className="h-3.5 w-3.5 text-slate-400" />
  }
}

function activityText(e: AdminActivityEvent) {
  switch (e.type) {
    case "user_registered":
      return (
        <>
          <span className="font-medium text-slate-200">{e.user_name || e.user_email}</span> registered
        </>
      )
    case "mailbox_added":
      return (
        <>
          <span className="font-medium text-slate-200">{e.user_email}</span> added mailbox{" "}
          <span className="text-slate-300">{e.mailbox_email}</span>
        </>
      )
    case "sync_completed":
      return (
        <>
          Sync <span className="text-slate-300">{e.mailbox_email}</span> ({e.sync_status})
        </>
      )
    case "feedback_submitted":
      return (
        <>
          <span className="font-medium text-slate-200">{e.user_email}</span> sent{" "}
          <span className="text-slate-400">{e.category || "general"}</span> feedback
          {e.message_preview && (
            <>
              : <span className="text-slate-500">&ldquo;{e.message_preview}&rdquo;</span>
            </>
          )}
        </>
      )
    default:
      return "Unknown event"
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [activity, setActivity] = useState<AdminActivityEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const reload = useCallback(() => {
    setRefreshing(true)
    setError(null)
    Promise.all([
      adminApi.stats().then(setStats).catch((e) => setError(e instanceof Error ? e.message : "Failed to load")),
      adminApi.activity(15).then(setActivity).catch(() => {}),
    ]).finally(() => setRefreshing(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-white/5 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Overview</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => reload()}
            className="shrink-0 gap-2 border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh data
          </Button>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Primary stat cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {primaryStats.map(({ key, label, icon: Icon, color }) => {
            const c = colorMap[color]
            return (
              <Card key={key} className={cn("admin-card admin-card-hover rounded-xl border-0", !stats && "animate-pulse")}>
                <CardHeader className="space-y-3 pb-2 pt-5">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", c.bg)}>
                    <Icon className={cn("h-5 w-5", c.icon)} aria-hidden />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-white">
                    {stats ? (stats[key] ?? 0).toLocaleString() : "—"}
                  </p>
                </CardHeader>
              </Card>
            )
          })}
        </section>

        {/* Secondary metrics row */}
        {stats && (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { icon: UserPlus, label: "Signups today", value: stats.signups_today, sub: `${stats.signups_week} this week` },
              { icon: Zap, label: "Active sessions", value: stats.active_sessions, sub: "Unexpired tokens" },
              { icon: Paperclip, label: "Attachments", value: stats.attachments, sub: "Stored files" },
              { icon: TrendingUp, label: "AI profiles", value: stats.agent_profiles, sub: "Built by agent" },
              { icon: CalendarDays, label: "Meetings", value: stats.meetings ?? 0, sub: "Calendar events" },
              { icon: Megaphone, label: "Feedback", value: stats.feedback_submissions ?? 0, sub: "User submissions" },
            ].map((m) => (
              <Card key={m.label} className="admin-card rounded-xl border-0">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-1 pt-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                    <m.icon className="h-4 w-4 text-slate-400" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{m.label}</p>
                    <p className="text-xl font-bold tabular-nums text-white">{m.value.toLocaleString()}</p>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <p className="text-xs text-slate-500">{m.sub}</p>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {/* Signup trend */}
          {stats && (
            <Card className="admin-card rounded-xl border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-200">Signups (7 days)</CardTitle>
                <CardDescription className="text-slate-500">{stats.signups_week} this week</CardDescription>
              </CardHeader>
              <CardContent>
                <SparkLine data={stats.daily_signups} tone="sky" />
                <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                  {stats.daily_signups.map((d) => (
                    <span key={d.date}>{d.date.slice(5)}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email volume by day */}
          {stats && stats.daily_email_volume && stats.daily_email_volume.length > 0 && (
            <Card className="admin-card rounded-xl border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-200">Email volume (7 days)</CardTitle>
                <CardDescription className="text-slate-500">By message date (UTC)</CardDescription>
              </CardHeader>
              <CardContent>
                <SparkLine data={stats.daily_email_volume} tone="violet" />
                <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                  {stats.daily_email_volume.map((d) => (
                    <span key={d.date}>{d.date.slice(5)}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sync health */}
          {stats && (
            <Card className="admin-card rounded-xl border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-200">Sync health</CardTitle>
                <CardDescription className="text-slate-500">{stats.mailboxes} mailboxes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(stats.sync_statuses).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge variant="outline" className={cn("border text-xs capitalize", syncColors[status] || "border-slate-500/30 bg-slate-500/10 text-slate-300")}>
                      {status}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums text-slate-200">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Infrastructure */}
          {stats && (
            <Card className="admin-card rounded-xl border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-200">Infrastructure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "MongoDB", ok: stats.mongodb_ok, icon: Database },
                  { name: "Qdrant", ok: stats.qdrant_ok, icon: HardDrive },
                ].map((svc) => (
                  <div key={svc.name} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <svc.icon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-200">{svc.name}</span>
                    </div>
                    <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium", svc.ok ? "text-emerald-300" : "text-red-300")}>
                      <span className={cn("h-2 w-2 rounded-full", svc.ok ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-red-400")} />
                      {svc.ok ? "Connected" : "Down"}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Density & access KPIs */}
        {stats && stats.averages && (
          <Card className="admin-card rounded-xl border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-200">Platform density</CardTitle>
              <CardDescription className="text-slate-500">Averages and account flags across all users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {[
                  { label: "Emails / user", value: String(stats.averages.emails_per_user), sub: "mean indexed" },
                  { label: "Mailboxes / user", value: String(stats.averages.mailboxes_per_user), sub: "mean connected" },
                  { label: "Emails / mailbox", value: String(stats.averages.emails_per_mailbox), sub: "mean load" },
                  {
                    label: "Disabled users",
                    value: (stats.users_disabled ?? 0).toLocaleString(),
                    sub: "cannot sign in",
                    warn: (stats.users_disabled ?? 0) > 0,
                  },
                  {
                    label: "Admin flag",
                    value: (stats.users_admin_flag ?? 0).toLocaleString(),
                    sub: "panel access",
                  },
                  {
                    label: "Calendar conflicts",
                    value: (stats.meetings_conflicting ?? 0).toLocaleString(),
                    sub: "overlapping meetings",
                    warn: (stats.meetings_conflicting ?? 0) > 0,
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className={cn(
                      "rounded-lg border px-3 py-3",
                      k.warn ? "border-amber-500/25 bg-amber-500/[0.06]" : "border-white/5 bg-white/[0.02]",
                    )}
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{k.label}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-white">{k.value}</p>
                    <p className="text-[11px] text-slate-600">{k.sub}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Engagement + feedback */}
        {stats && (
          <div className="grid gap-6 lg:grid-cols-2">
            {stats.engagement && (
              <Card className="admin-card rounded-xl border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-200">Inbox engagement</CardTitle>
                  <CardDescription className="text-slate-500">Read vs unread across indexed mail</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const e = stats.engagement!
                    const base = Math.max(e.read + e.unread, 1)
                    return (
                      <>
                        <MiniBarRow label="Read" value={e.read} total={base} color="bg-sky-500/80" />
                        <MiniBarRow label="Unread" value={e.unread} total={base} color="bg-amber-500/80" />
                        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                          <span className="flex items-center gap-2 text-xs text-slate-400">
                            <Star className="h-3.5 w-3.5 text-yellow-400/90" />
                            Starred
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-slate-200">{e.starred.toLocaleString()}</span>
                        </div>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            <Card className="admin-card rounded-xl border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-200">Feedback</CardTitle>
                <CardDescription className="text-slate-500">Submission categories</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {stats.feedback_by_category &&
                  Object.values(stats.feedback_by_category).reduce((s, v) => s + v, 0) > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Feedback</p>
                    <div className="space-y-2">
                      {Object.entries(stats.feedback_by_category)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, n]) => {
                          const fbTotal = Math.max(
                            Object.values(stats.feedback_by_category || {}).reduce((s, v) => s + v, 0),
                            1,
                          )
                          return (
                            <MiniBarRow
                              key={cat}
                              label={cat}
                              value={n}
                              total={fbTotal}
                              color={cat === "bug" ? "bg-red-500/70" : cat === "idea" ? "bg-violet-500/70" : "bg-slate-500/70"}
                            />
                          )
                        })}
                    </div>
                    <Link href="/admin/feedback" className="mt-3 inline-block text-xs font-medium text-sky-400 hover:text-sky-300">
                      Open feedback inbox →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          {/* Top users */}
          {stats && (
            <Card className="admin-card rounded-xl border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-200">Top users by emails</CardTitle>
                <CardDescription className="text-slate-500">Indexed message count</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.top_users.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-600">No email metadata yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.top_users.map((u, i) => (
                      <li key={u.user_id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06] text-xs font-bold text-slate-400">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/admin/users/${u.user_id}`} className="text-sm font-medium text-sky-300 hover:underline">
                            {u.name}
                          </Link>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-slate-200">{u.email_count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Top mailboxes */}
          {stats && (
            <Card className="admin-card rounded-xl border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-200">Top mailboxes by volume</CardTitle>
                <CardDescription className="text-slate-500">Heaviest indexed accounts</CardDescription>
              </CardHeader>
              <CardContent>
                {!stats.top_mailboxes || stats.top_mailboxes.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-600">No aggregates yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.top_mailboxes.map((m, i) => (
                      <li key={m.id || i} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06] text-xs font-bold text-slate-400">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-200">{m.name}</p>
                          <p className="truncate text-xs text-slate-500">{m.email}</p>
                          {m.user_id ? (
                            <Link href={`/admin/users/${m.user_id}`} className="text-[11px] text-sky-400/90 hover:underline">
                              {m.user_email}
                            </Link>
                          ) : (
                            <span className="text-[11px] text-slate-600">{m.user_email}</span>
                          )}
                        </div>
                        <span className="text-sm font-bold tabular-nums text-slate-200">{m.email_count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {stats.top_mailboxes && stats.top_mailboxes.length > 0 && (
                  <Link href="/admin/mailboxes" className="mt-3 inline-block text-xs font-medium text-sky-400 hover:text-sky-300">
                    Browse all mailboxes →
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent activity */}
          {activity.length > 0 && (
            <Card className="admin-card rounded-xl border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-200">Recent activity</CardTitle>
                  <CardDescription className="text-slate-500">Latest events</CardDescription>
                </div>
                <Link href="/admin/activity" className="text-xs font-medium text-sky-400 hover:text-sky-300">
                  View all →
                </Link>
              </CardHeader>
              <CardContent>
                <ul className="space-y-0">
                  {activity.slice(0, 8).map((e, i) => (
                    <li
                      key={`${e.type}-${e.timestamp}-${i}`}
                      className="flex items-start gap-3 border-b border-white/[0.03] py-2.5 last:border-0"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.04]">
                        {activityIcon(e.type)}
                      </div>
                      <div className="min-w-0 flex-1 text-xs text-slate-400 leading-relaxed">{activityText(e)}</div>
                      <span className="shrink-0 text-[10px] tabular-nums text-slate-600">{relativeTime(e.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
