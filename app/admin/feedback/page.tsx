"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Megaphone, Search } from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { adminApi, type AdminFeedbackRow } from "@/lib/api"
import { cn } from "@/lib/utils"

const categories = ["all", "general", "idea", "bug"] as const

function formatWhen(ts: string | null | undefined): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function preview(msg: string, max = 100): string {
  const t = msg.replace(/\s+/g, " ").trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export default function AdminFeedbackPage() {
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminFeedbackRow[]>([])
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.feedback({
        q: search || undefined,
        category: category === "all" ? undefined : category,
        page,
        limit,
      })
      setRows(res.feedback)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feedback")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search, category, page, limit])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const catStyle: Record<string, string> = {
    bug: "border-red-500/35 bg-red-500/10 text-red-200",
    idea: "border-violet-500/35 bg-violet-500/10 text-violet-200",
    general: "border-slate-500/35 bg-slate-500/10 text-slate-200",
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-1 border-b border-white/5 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">Product</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">User feedback</h1>
              <p className="mt-1 text-sm text-slate-400">
                <span className="font-medium text-slate-300">{total.toLocaleString()}</span> submissions
              </p>
            </div>
            <form
              className="flex w-full max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setPage(1)
                setSearch(q)
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Search message text…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-11 border-slate-600/80 bg-slate-950/40 pl-10 text-slate-100 placeholder:text-slate-600 focus-visible:ring-sky-500/40"
                />
              </div>
              <Button
                type="submit"
                className="h-11 shrink-0 bg-gradient-to-r from-sky-600 to-cyan-600 px-5 font-semibold shadow-lg shadow-sky-900/30 hover:from-sky-500 hover:to-cyan-500"
              >
                Search
              </Button>
            </form>
          </div>
        </header>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setPage(1)
                setCategory(c)
              }}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                category === c
                  ? "border-sky-500/40 bg-sky-500/15 text-sky-200"
                  : "border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
              )}
            >
              {c}
            </button>
          ))}
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
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">When</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">User</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Type</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-slate-800/80">
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow className="border-slate-800/80">
                  <TableCell colSpan={4} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Megaphone className="h-10 w-10 opacity-40" />
                      <span>No feedback matches.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((f) => (
                  <TableRow key={f.id} className="border-slate-800/80 transition-colors hover:bg-sky-500/[0.04]">
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatWhen(f.created_at)}</TableCell>
                    <TableCell>
                      {f.user_id ? (
                        <div className="min-w-0">
                          <Link
                            href={`/admin/users/${f.user_id}`}
                            className="block truncate text-sm font-medium text-sky-300 hover:underline"
                          >
                            {f.user_email}
                          </Link>
                          <p className="truncate text-xs text-slate-500">{f.user_name}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("border text-xs capitalize", catStyle[f.category] || catStyle.general)}
                      >
                        {f.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm leading-relaxed text-slate-300" title={f.message}>
                        {preview(f.message, 140)}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm tabular-nums text-slate-500">
              Page <span className="font-medium text-slate-300">{page}</span> of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
