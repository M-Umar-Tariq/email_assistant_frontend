"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Eye,
  EyeOff,
  Inbox,
  MailOpen,
  Paperclip,
  Shield,
  Star,
  Trash2,
} from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { adminApi, type AdminUserDetail } from "@/lib/api"
import { cn } from "@/lib/utils"

function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function relativeTime(ts: string | null | undefined): string {
  if (!ts) return "Never"
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? "Yesterday" : `${days}d ago`
}

function formatDate(ts: string | null | undefined): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const syncColors: Record<string, string> = {
  synced: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  syncing: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  pending: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  cancelled: "border-amber-500/30 bg-amber-500/10 text-amber-300",
}

const settingLabels: Record<string, string> = {
  daily_briefing: "Daily briefing",
  slack_digest: "Slack digest",
  critical_alerts: "Critical alerts",
  ai_suggestions: "AI suggestions",
  auto_labeling: "Auto-labeling",
  thread_summaries: "Thread summaries",
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : ""
  const [data, setData] = useState<AdminUserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      setData(await adminApi.user(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user")
      setData(null)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const patch = async (body: { disabled?: boolean; is_admin?: boolean }) => {
    if (!id) return
    setSaving(true)
    try {
      const res = await adminApi.patchUser(id, body)
      setData((prev) => (prev ? { ...prev, user: { ...prev.user, ...res.user } } : null))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await adminApi.deleteUser(id)
      router.push("/admin/users")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
      setDeleting(false)
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Nav */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-400 hover:bg-white/5 hover:text-slate-200" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" /> All users
            </Link>
          </Button>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!data && !error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
            <span className="text-sm">Loading profile…</span>
          </div>
        ) : data ? (
          <>
            {/* Profile header */}
            <div className="admin-card flex flex-col gap-6 rounded-2xl p-6 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-cyan-600/20 text-2xl font-bold tracking-tight text-sky-200 ring-1 ring-sky-500/25">
                {initials(data.user.name, data.user.email)}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{data.user.name}</h1>
                  <Badge variant="outline" className={cn("border font-medium", data.user.is_admin ? "border-violet-500/35 bg-violet-500/10 text-violet-200" : "border-slate-600/80 bg-slate-800/60 text-slate-400")}>
                    <Shield className="mr-1 h-3 w-3" />
                    {data.user.is_admin ? "Admin" : "User"}
                  </Badge>
                  <Badge variant="outline" className={cn("border font-medium", data.user.disabled ? "border-red-500/35 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300")}>
                    {data.user.disabled ? "Disabled" : "Active"}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400">{data.user.email}</p>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>Created {formatDate(data.user.created_at)}</span>
                  {data.user.updated_at && <span>Updated {formatDate(data.user.updated_at)}</span>}
                  <span>Timezone: {data.user.timezone || "UTC"}</span>
                </div>
              </div>
            </div>

            {/* Email statistics */}
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Email statistics</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: MailOpen, label: "Read", value: data.email_stats.total_read, bg: "bg-sky-500/15", fg: "text-sky-400" },
                  { icon: EyeOff, label: "Unread", value: data.email_stats.total_unread, bg: "bg-amber-500/15", fg: "text-amber-400" },
                  { icon: Star, label: "Starred", value: data.email_stats.total_starred, bg: "bg-yellow-500/15", fg: "text-yellow-400" },
                  { icon: Paperclip, label: "Attachments", value: data.attachment_count, bg: "bg-slate-500/15", fg: "text-slate-400" },
                ].map(({ icon: Icon, label, value, bg, fg }) => (
                  <Card key={label} className="admin-card admin-card-hover rounded-xl border-0">
                    <CardHeader className="space-y-2 p-4">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", bg)}>
                        <Icon className={cn("h-4 w-4", fg)} />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                      <p className="text-2xl font-bold tabular-nums text-white">{value.toLocaleString()}</p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>

            {/* Account controls */}
            <Card className="admin-card rounded-xl border-0">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-100">Account controls</CardTitle>
                <CardDescription className="text-slate-500">
                  Manage access and permissions for this user.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                      <Eye className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <Label htmlFor="adm-disabled" className="text-slate-200">Disabled</Label>
                      <p className="text-xs text-slate-500">Block login for this account</p>
                    </div>
                  </div>
                  <Switch id="adm-disabled" checked={data.user.disabled ?? false} disabled={saving} onCheckedChange={(v) => patch({ disabled: v })} />
                </div>
                <Separator className="my-5 bg-white/5" />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                      <Shield className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                      <Label htmlFor="adm-role" className="text-slate-200">Admin flag</Label>
                      <p className="text-xs text-slate-500">Grant access to this admin panel</p>
                    </div>
                  </div>
                  <Switch id="adm-role" checked={data.user.is_admin ?? false} disabled={saving} onCheckedChange={(v) => patch({ is_admin: v })} />
                </div>
              </CardContent>
            </Card>

            {/* Mailboxes */}
            <Card className="admin-card rounded-xl border-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-100">Mailboxes</CardTitle>
                  <CardDescription className="text-slate-500">{data.mailboxes.length} connected</CardDescription>
                </div>
                {data.has_agent_profile && (
                  <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-300">
                    <Bot className="mr-1 h-3 w-3" /> AI profile built
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-white/5 bg-slate-950/30 divide-y divide-white/[0.04]">
                  {data.mailboxes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-slate-500">
                      <Inbox className="h-8 w-8 opacity-30" />
                      <span className="text-sm">No mailboxes connected</span>
                    </div>
                  ) : (
                    data.mailboxes.map((m) => (
                      <div key={m.id} className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: m.color || "#3b82f6" }} />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-100">{m.name}</p>
                            <p className="truncate text-xs text-slate-500">{m.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Badge variant="outline" className={cn("border text-xs capitalize", syncColors[m.sync_status] || "border-slate-500/30 text-slate-300")}>
                            {m.sync_status}
                          </Badge>
                          <span className="text-xs text-slate-500">synced {relativeTime(m.last_sync_at)}</span>
                          <span className="tabular-nums text-sm font-medium text-slate-300">
                            {m.email_count} emails
                            {typeof m.unread === "number" && m.unread > 0 && (
                              <span className="ml-1 text-amber-400">({m.unread} unread)</span>
                            )}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User settings */}
            {data.settings && (
              <Card className="admin-card rounded-xl border-0">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-100">User settings</CardTitle>
                  <CardDescription className="text-slate-500">Feature flags and preferences (read-only)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(data.settings).map(([key, value]) => {
                      if (key === "user_id" || key === "updated_at") return null
                      const isToggle = typeof value === "boolean"
                      const displayLabel = settingLabels[key] || key.replace(/_/g, " ")
                      return (
                        <div key={key} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                          <span className="text-sm capitalize text-slate-300">{displayLabel}</span>
                          {isToggle ? (
                            <span className={cn("text-xs font-medium", value ? "text-emerald-400" : "text-slate-500")}>
                              {value ? "On" : "Off"}
                            </span>
                          ) : (
                            <span className="text-sm font-medium tabular-nums text-slate-200">{String(value)}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Danger zone */}
            <Card className="rounded-xl border border-red-500/20 bg-red-500/[0.03]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-red-300">
                  <AlertTriangle className="h-4 w-4" /> Danger zone
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Permanently delete this user and all associated data (emails, mailboxes, attachments, profiles).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showDelete ? (
                  <Button
                    variant="outline"
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    onClick={() => setShowDelete(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete user
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-200">
                      Are you sure? This will permanently remove <strong>{data.user.email}</strong> and{" "}
                      <strong>all their data</strong>. This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        disabled={deleting}
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-500"
                      >
                        {deleting ? "Deleting…" : "Yes, delete permanently"}
                      </Button>
                      <Button variant="ghost" className="text-slate-400 hover:text-slate-200" onClick={() => setShowDelete(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AdminShell>
  )
}
