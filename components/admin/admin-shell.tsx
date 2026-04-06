"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Shield,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminSpinner } from "@/components/admin/admin-spinner"
import { BetaLabel } from "@/components/beta-label"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/mailboxes", label: "Mailboxes", icon: Inbox },
  { href: "/admin/feedback", label: "Feedback", icon: Megaphone },
  { href: "/admin/activity", label: "Activity", icon: Activity },
]

function AccessDenied() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10">
        <Shield className="h-8 w-8 text-amber-400/90" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Admin access required</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          Your account is not authorized for this area. Add your email to{" "}
          <code className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-0.5 font-mono text-xs text-sky-300">
            ADMIN_EMAILS
          </code>{" "}
          in the backend environment, or ask an owner to grant admin on your user.
        </p>
      </div>
      <Button
        variant="outline"
        className="border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white"
        asChild
      >
        <Link href="/app">Back to app</Link>
      </Button>
    </div>
  )
}

function Sidebar({
  pathname,
  user,
  collapsed,
  onCollapse,
  onLogout,
}: {
  pathname: string | null
  user: { email: string }
  collapsed: boolean
  onCollapse: (c: boolean) => void
  onLogout: () => void
}) {
  return (
    <aside
      className={cn(
        "admin-sidebar flex shrink-0 flex-col transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <div className="relative border-b border-white/5 px-3 py-5">
        <Link href="/admin/dashboard" className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-lg shadow-sky-500/20 ring-1 ring-white/10">
            <Mail className="h-4 w-4 text-white" aria-hidden />
          </div>
          {!collapsed && (
            <div className="min-w-0 text-left">
              <span className="flex flex-wrap items-center gap-x-0 text-sm font-semibold tracking-tight text-white">
                <span>Smart Mail </span>
                <span className="text-sky-200">AI</span>
                <BetaLabel onDark />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-sky-400/80">Admin</span>
            </div>
          )}
        </Link>
        {!collapsed && (
          <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Signed in</p>
            <p className="mt-0.5 truncate text-xs text-slate-300">{user.email}</p>
          </div>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-slate-400 shadow-md transition-colors hover:bg-slate-700 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {!collapsed && (
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Navigate</p>
        )}
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "group relative flex items-center rounded-lg text-sm font-medium transition-all",
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                active
                  ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/20"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-lg transition-colors",
                  collapsed ? "h-9 w-9" : "h-8 w-8",
                  active
                    ? "bg-sky-500/20 text-sky-300"
                    : "bg-white/[0.03] text-slate-500 group-hover:text-slate-300"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {!collapsed && <span>{label}</span>}
              {active && !collapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.7)]" />
              )}
              {active && collapsed && (
                <span className="absolute -right-0.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-l-full bg-sky-400" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/5 p-2 space-y-1">
        <Button
          variant="ghost"
          className={cn(
            "h-auto w-full rounded-lg py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-300",
            collapsed ? "justify-center px-0" : "justify-start gap-2"
          )}
          onClick={onLogout}
          title="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </Button>
        <Link
          href="/app"
          title="Open main app"
          className={cn(
            "flex items-center rounded-lg border border-dashed border-slate-700/60 text-xs font-medium text-slate-500 transition-colors hover:border-sky-500/30 hover:text-sky-300",
            collapsed ? "justify-center py-2.5" : "justify-center gap-1.5 py-2.5"
          )}
        >
          {collapsed ? (
            <ExternalLink className="h-3.5 w-3.5" />
          ) : (
            <>
              Open main app
              <ExternalLink className="h-3 w-3 opacity-60" />
            </>
          )}
        </Link>
      </div>
    </aside>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, token, isLoading, logout, refreshUser } = useAuth()
  const [ready, setReady] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!token) {
      setReady(true)
      return
    }
    refreshUser()
      .then(() => setReady(true))
      .catch(() => setReady(true))
  }, [isLoading, token, refreshUser])

  useEffect(() => {
    if (!isLoading && ready && !token) router.replace("/admin")
  }, [isLoading, ready, token, router])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (isLoading || !ready) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <AdminSpinner />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <AdminSpinner />
      </div>
    )
  }

  if (!user?.is_admin) return <AccessDenied />

  return (
    <div className="flex min-h-svh">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="relative">
          <Sidebar
            pathname={pathname}
            user={user}
            collapsed={false}
            onCollapse={() => setMobileOpen(false)}
            onLogout={() => logout()}
          />
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar
          pathname={pathname}
          user={user}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          onLogout={() => logout()}
        />
      </div>

      {/* Main */}
      <main className="relative min-w-0 flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-slate-950/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-slate-300"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex items-center text-sm font-semibold text-white">
            <span>Smart Mail </span>
            <span className="text-sky-200">AI</span>
            <BetaLabel onDark />
          </span>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.35)_0%,transparent_100px)]" />
        <div className="relative px-4 py-6 sm:px-6 md:px-10 md:py-10">{children}</div>
      </main>
    </div>
  )
}
