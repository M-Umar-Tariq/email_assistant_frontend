"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Shield } from "lucide-react"
import { BetaLabel } from "@/components/beta-label"
import { AdminLoginForm } from "@/components/admin/admin-login-form"
import { AdminSpinner } from "@/components/admin/admin-spinner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export default function AdminGatePage() {
  const router = useRouter()
  const { token, user, isLoading, refreshUser } = useAuth()
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!token) {
      setVerified(true)
      return
    }
    refreshUser().finally(() => setVerified(true))
  }, [isLoading, token, refreshUser])

  useEffect(() => {
    if (!verified || !token || !user?.is_admin) return
    router.replace("/admin/dashboard")
  }, [verified, token, user, router])

  if (isLoading || (token && !verified)) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <AdminSpinner />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex min-h-svh flex-col lg:flex-row">
        <div className="relative hidden flex-1 flex-col justify-between border-b border-white/5 p-10 lg:flex lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_20%,rgba(14,165,233,0.12),transparent)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-lg shadow-sky-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="flex flex-wrap items-center text-sm font-semibold text-white">
                <span>Smart Mail </span>
                <span className="text-sky-200">AI</span>
                <BetaLabel onDark />
                <span className="ml-1 text-white/90">Admin</span>
              </span>
            </div>
            <h2 className="mt-16 max-w-sm text-3xl font-semibold leading-tight tracking-tight text-white">
              Operations & user management
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Monitor platform health, browse accounts, and adjust access from one place.
            </p>
          </div>
          <p className="relative text-xs text-slate-600">Restricted area · Authorized personnel only</p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-14 sm:px-8">
          <AdminLoginForm />
          <Button variant="link" className="mt-8 gap-1.5 text-slate-500 hover:text-sky-400" asChild>
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!user?.is_admin) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10">
          <Shield className="h-8 w-8 text-amber-400/90" />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-semibold text-slate-100">Admin access required</h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Configure{" "}
            <code className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-0.5 font-mono text-xs text-sky-300">
              ADMIN_EMAILS
            </code>{" "}
            on the server or grant admin on your user.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800"
          asChild
        >
          <Link href="/app">Back to app</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <AdminSpinner />
    </div>
  )
}
