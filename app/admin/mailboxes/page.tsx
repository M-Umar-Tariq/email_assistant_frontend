"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { adminApi, type AdminMailboxRow } from "@/lib/api"
import { cn } from "@/lib/utils"

const syncColors: Record<string, string> = {
  synced: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  syncing: "border-sky-500/30 bg-sky-500/10 text-sky-300 animate-pulse",
  pending: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  cancelled: "border-amber-500/30 bg-amber-500/10 text-amber-300",
}

const filterOptions = ["all", "synced", "syncing", "pending", "error", "cancelled"] as const

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

export default function AdminMailboxesPage() {
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminMailboxRow[]>([])
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.mailboxes({
        q: search || undefined,
        sync_status: filter === "all" ? undefined : filter,
        page,
        limit,
      })
      setRows(res.mailboxes)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search, filter, page, limit])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="border-b border-white/5 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">Infrastructure</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Mailboxes</h1>
          <p className="mt-1 text-sm text-slate-400">
            <span className="font-medium text-slate-300">{total.toLocaleString()}</span> connected across all users
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setPage(1)
                  setFilter(f)
                }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  filter === f
                    ? "border-sky-500/40 bg-sky-500/15 text-sky-200"
                    : "border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <form
            className="flex w-full max-w-sm gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              setSearch(q)
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search email or name…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 border-slate-600/80 bg-slate-950/40 pl-10 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:ring-sky-500/40"
              />
            </div>
            <Button type="submit" size="sm" className="h-10 bg-gradient-to-r from-sky-600 to-cyan-600 font-semibold shadow-lg shadow-sky-900/30 hover:from-sky-500 hover:to-cyan-500">
              Search
            </Button>
          </form>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mailbox</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Owner</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Emails</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Unread</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Last sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-slate-800/80">
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
                      <span className="text-sm">Loading mailboxes…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow className="border-slate-800/80">
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Inbox className="h-10 w-10 opacity-40" />
                      <span>No mailboxes found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((m) => (
                  <TableRow key={m.id} className="border-slate-800/80 transition-colors hover:bg-sky-500/[0.03]">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: m.color || "#3b82f6" }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-100">{m.name}</p>
                          <p className="truncate text-xs text-slate-500">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.user_id ? (
                        <Link href={`/admin/users/${m.user_id}`} className="text-sm text-sky-300 hover:underline">
                          {m.user_email}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border text-xs capitalize", syncColors[m.sync_status] || "border-slate-500/30 text-slate-300")}>
                        {m.sync_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-300">{m.email_count.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-400">{(m.unread ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs text-slate-500">{relativeTime(m.last_sync_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <span className="text-sm tabular-nums text-slate-500">
              Page <span className="font-medium text-slate-300">{page}</span> of {totalPages}
            </span>
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
