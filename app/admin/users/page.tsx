"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Search, UsersRound } from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { adminApi, type AdminUserRow } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function AdminUsersPage() {
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.users({ q: search || undefined, page, limit })
      setRows(res.users)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search, page, limit])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-1 border-b border-white/5 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">Directory</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Users</h1>
              <p className="mt-1 text-sm text-slate-400">
                <span className="font-medium text-slate-300">{total.toLocaleString()}</span> accounts
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
                  placeholder="Search email or name…"
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

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Name</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Mailboxes</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Emails</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-slate-800/80">
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
                      <span className="text-sm">Loading users…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow className="border-slate-800/80">
                  <TableCell colSpan={7} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <UsersRound className="h-10 w-10 opacity-40" />
                      <span>No users match your search.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => (
                  <TableRow
                    key={u.id}
                    className="border-slate-800/80 transition-colors hover:bg-sky-500/[0.04]"
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-sky-300 transition-colors hover:text-sky-200 hover:underline"
                      >
                        {u.email}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-300">{u.name}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-300">{u.mailbox_count}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-300">{u.email_count}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border font-medium",
                          u.is_admin
                            ? "border-violet-500/35 bg-violet-500/10 text-violet-200"
                            : "border-slate-600/80 bg-slate-800/60 text-slate-400"
                        )}
                      >
                        {u.is_admin ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border font-medium",
                          u.disabled
                            ? "border-red-500/35 bg-red-500/10 text-red-300"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        )}
                      >
                        {u.disabled ? "Disabled" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
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
