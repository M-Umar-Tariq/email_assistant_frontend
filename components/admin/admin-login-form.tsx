"use client"

import { useState } from "react"
import { KeyRound, Lock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as api from "@/lib/api"

export function AdminLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.auth.login(email, password)
      if (!res.user.is_admin) {
        api.clearAuth()
        setError("This account does not have admin access.")
        setLoading(false)
        return
      }
      api.setTokens(res.access_token, res.refresh_token, res.user)
      window.location.href = "/admin/dashboard"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      setLoading(false)
    }
  }

  return (
    <div className="admin-glass w-full max-w-md rounded-2xl p-8 shadow-2xl shadow-black/40">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-lg shadow-sky-500/25 ring-1 ring-white/10">
          <Lock className="h-7 w-7 text-white" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Admin sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Use an account in <span className="font-mono text-sky-400/90">ADMIN_EMAILS</span> or with the admin flag.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="admin-email" className="text-slate-200">
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 border-slate-600/80 bg-slate-950/50 pl-10 text-slate-100 placeholder:text-slate-600 focus-visible:ring-sky-500/40"
              placeholder="you@company.com"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password" className="text-slate-200">
            Password
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 border-slate-600/80 bg-slate-950/50 pl-10 text-slate-100 placeholder:text-slate-600 focus-visible:ring-sky-500/40"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full bg-gradient-to-r from-sky-600 to-cyan-600 text-[15px] font-semibold shadow-lg shadow-sky-900/40 transition hover:from-sky-500 hover:to-cyan-500 disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Signing in…
            </span>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    </div>
  )
}
