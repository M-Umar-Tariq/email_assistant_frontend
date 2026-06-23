"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "@/lib/gsap-ui"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CalendarCheck,
  Inbox,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { BetaLabel } from "@/components/beta-label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import smartMailLogo from "@/logo/Smart Mail Logo.png"

const FEATURES = [
  { icon: Inbox, title: "Unified inbox", description: "Gmail, Outlook, and IMAP in one place." },
  { icon: Sparkles, title: "Daily briefing", description: "AI-summarized priorities every morning." },
  { icon: Sparkles, title: "AI assistant", description: "Ask questions and approve actions across your mail." },
  { icon: CalendarCheck, title: "Meetings from mail", description: "Detect and confirm invites instantly." },
]

export default function LoginPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useGSAP(
    () => {
      const brand = pageRef.current?.querySelector("[data-auth-panel='brand']")
      const formCol = pageRef.current?.querySelector("[data-auth-panel='form']")
      if (brand) {
        gsap.from(brand.querySelectorAll("[data-auth-reveal]"), {
          opacity: 0,
          x: -18,
          duration: 0.55,
          stagger: 0.08,
          ease: "power2.out",
        })
      }
      if (formCol) {
        gsap.from(formCol.querySelectorAll("[data-auth-reveal]"), {
          opacity: 0,
          y: 18,
          duration: 0.5,
          stagger: 0.07,
          ease: "power2.out",
        })
      }
    },
    { scope: pageRef },
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      setIsLoading(false)
    }
  }

  return (
    <div
      ref={pageRef}
      className="relative flex min-h-svh overflow-hidden bg-background"
    >
      {/* ─── Ambient background: dotted grid + gradient blobs ─── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-primary/25 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-sky-500/20 blur-[140px] dark:bg-sky-400/15"
      />

      {/* ─── Left panel: brand / story ─── */}
      <div
        data-auth-panel="brand"
        className="relative hidden w-1/2 flex-col justify-between border-r border-border/60 bg-gradient-to-br from-card/80 via-card/60 to-background/60 p-12 backdrop-blur-xl lg:flex"
      >
        {/* Top: logo + subtle status chip */}
        <div className="flex items-start justify-between">
          <div data-auth-reveal>
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-xl bg-primary/15 blur-md transition-opacity duration-500 group-hover:opacity-100 opacity-60" />
                <Image
                  src={smartMailLogo}
                  alt="Smart Mail AI logo"
                  className="relative h-9 w-9 object-contain transition-transform duration-300 group-hover:scale-105"
                  priority
                />
              </div>
              <span className="flex items-center text-base font-semibold">
                <span className="text-foreground">Smart Mail </span>
                <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
                  AI
                </span>
                <BetaLabel />
              </span>
            </Link>
          </div>

          <div
            data-auth-reveal
            className="hidden items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-md xl:flex"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            All systems operational
          </div>
        </div>

        {/* Middle: hero text + feature grid */}
        <div className="max-w-lg">
          <div
            data-auth-reveal
            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary"
          >
            <Sparkles className="h-3 w-3" />
            AI-native email workspace
          </div>
          <h2
            data-auth-reveal
            className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground"
          >
            Welcome back.
            <br />
            <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Your inbox is waiting.
            </span>
          </h2>
          <p
            data-auth-reveal
            className="mt-4 text-base leading-relaxed text-muted-foreground"
          >
            Daily briefings, unified sync across every account, AI search,
            compose, and an AI assistant — all in one focused workspace.
          </p>

          <div
            data-auth-reveal
            className="mt-8 grid grid-cols-2 gap-3"
          >
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-background/50 p-3.5 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:bg-background/70 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/15">
                    <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <span className="text-[13px] font-semibold text-foreground">
                    {title}
                  </span>
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: trust row + footer */}
        <div className="flex flex-col gap-4">
          <div
            data-auth-reveal
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              End-to-end encrypted
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Sub-second sync
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Powered by GPT
            </span>
          </div>

          <p data-auth-reveal className="text-xs text-muted-foreground/80">
            © 2026 Smart Mail AI Beta. All rights reserved.
          </p>
        </div>
      </div>

      {/* ─── Right panel: login form ─── */}
      <div
        data-auth-panel="form"
        className="relative flex flex-1 flex-col items-center justify-center px-6 py-12"
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div
            data-auth-reveal
            className="mb-8 flex flex-col items-center lg:hidden"
          >
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <Image
                  src={smartMailLogo}
                  alt="Smart Mail AI logo"
                  className="h-9 w-9 object-contain"
                  priority
                />
              </div>
              <span className="flex items-center text-base font-semibold">
                <span className="text-foreground">Smart Mail </span>
                <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
                  AI
                </span>
                <BetaLabel />
              </span>
            </Link>
          </div>

          <div data-auth-reveal className="mb-8">
            <h1 className="flex flex-wrap items-center gap-x-1 text-[28px] font-bold leading-tight tracking-tight text-foreground">
              <span>Log in to</span>
              <span className="flex items-center">
                <span>Smart Mail </span>
                <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
                  AI
                </span>
                <BetaLabel />
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {"Don't have an account?"}{" "}
              <Link
                href="/signup"
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Login card */}
          <form
            data-auth-reveal
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 p-6 shadow-xl shadow-black/[0.03] backdrop-blur-xl dark:shadow-black/20"
          >
            {error && (
              <div className="animate-in fade-in-0 slide-in-from-top-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-500 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="email"
                className="text-[13px] font-medium text-foreground"
              >
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@acmecorp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-border/70 bg-background/60 text-foreground placeholder:text-muted-foreground/70 transition-all focus-visible:border-primary/50 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-[13px] font-medium text-foreground"
                >
                  Password
                </Label>
                <a
                  href="#"
                  className="text-[11.5px] font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl border-border/70 bg-background/60 pr-10 text-foreground placeholder:text-muted-foreground/70 transition-all focus-visible:border-primary/50 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="group relative mt-2 h-11 w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary to-sky-500 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-80"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {isLoading ? (
                <span className="relative flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Logging in...
                </span>
              ) : (
                <span className="relative flex items-center gap-2">
                  Log in
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          </form>

          <p
            data-auth-reveal
            className="mt-6 text-center text-[11.5px] leading-relaxed text-muted-foreground"
          >
            By continuing, you agree to our{" "}
            <a
              href="#"
              className="font-medium text-foreground/80 underline-offset-2 transition-colors hover:text-primary hover:underline"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="font-medium text-foreground/80 underline-offset-2 transition-colors hover:text-primary hover:underline"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
