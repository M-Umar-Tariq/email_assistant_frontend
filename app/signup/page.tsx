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
  Check,
  Sparkles,
  Rocket,
  Gift,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { BetaLabel } from "@/components/beta-label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import smartMailLogo from "@/logo/Smart Mail Logo.png"

const VALUE_PROPS = [
  "Morning briefing plus inbox across all connected mailboxes",
  "Natural language search over every synced email",
  "Compose, AI assistant, calendar & follow-ups in one app",
  "Voice agent — read, reply, triage hands-free",
]

export default function SignupPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const { register } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const passwordChecks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
  ]

  const strengthScore = passwordChecks.filter((c) => c.met).length
  const strengthMeta =
    password.length === 0
      ? { label: "", color: "bg-muted", width: "w-0" }
      : strengthScore === 1
        ? { label: "Weak", color: "bg-red-500", width: "w-1/3" }
        : strengthScore === 2
          ? { label: "Okay", color: "bg-amber-500", width: "w-2/3" }
          : { label: "Strong", color: "bg-emerald-500", width: "w-full" }

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
      await register(name, email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed")
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
        className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-primary/25 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-[480px] w-[480px] rounded-full bg-sky-500/20 blur-[120px] dark:bg-sky-400/15"
      />

      {/* ─── Left panel: brand / story ─── */}
      <div
        data-auth-panel="brand"
        className="relative hidden w-1/2 flex-col justify-between border-r border-border/60 bg-gradient-to-br from-card/80 via-card/60 to-background/60 p-12 backdrop-blur-xl lg:flex"
      >
        {/* Top: logo + free-during-beta chip */}
        <div className="flex items-start justify-between">
          <div data-auth-reveal>
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-xl bg-primary/15 blur-md opacity-60 transition-opacity duration-500 group-hover:opacity-100" />
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
            className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 xl:flex"
          >
            <Gift className="h-3 w-3" />
            Free during Beta
          </div>
        </div>

        {/* Middle: hero + checklist */}
        <div className="max-w-lg">
          <div
            data-auth-reveal
            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary"
          >
            <Rocket className="h-3 w-3" />
            Join 2,000+ early users
          </div>
          <h2
            data-auth-reveal
            className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground"
          >
            Your email workspace,
            <br />
            <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              one login away.
            </span>
          </h2>
          <p
            data-auth-reveal
            className="mt-4 text-base leading-relaxed text-muted-foreground"
          >
            Connect Gmail, Outlook, or IMAP, then layer a daily briefing,
            unified inbox, AI search, compose tools, analytics, and more —
            free while we&apos;re in Beta.
          </p>

          <div
            data-auth-reveal
            className="mt-8 flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/50 p-5 backdrop-blur-md"
          >
            {VALUE_PROPS.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm shadow-emerald-500/30">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
                <span className="text-[13.5px] leading-relaxed text-foreground/85">
                  {item}
                </span>
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
              No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Powered by GPT & Whisper
            </span>
          </div>

          <p data-auth-reveal className="text-xs text-muted-foreground/80">
            © 2026 Smart Mail AI Beta. All rights reserved.
          </p>
        </div>
      </div>

      {/* ─── Right panel: signup form ─── */}
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
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Log in
              </Link>
            </p>
          </div>

          {/* Signup card */}
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
                htmlFor="name"
                className="text-[13px] font-medium text-foreground"
              >
                Full name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Alex Chen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 rounded-xl border-border/70 bg-background/60 text-foreground placeholder:text-muted-foreground/70 transition-all focus-visible:border-primary/50 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="email"
                className="text-[13px] font-medium text-foreground"
              >
                Work email
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
                {strengthMeta.label && (
                  <span
                    className={`text-[11px] font-semibold ${
                      strengthScore === 3
                        ? "text-emerald-500"
                        : strengthScore === 2
                          ? "text-amber-500"
                          : "text-red-500"
                    }`}
                  >
                    {strengthMeta.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
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

              {password.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-2">
                  {/* Strength bar */}
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strengthMeta.color} ${strengthMeta.width}`}
                    />
                  </div>
                  {/* Checks */}
                  <div className="flex flex-col gap-1">
                    {passwordChecks.map((check) => (
                      <div
                        key={check.label}
                        className="flex items-center gap-2"
                      >
                        <div
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors ${
                            check.met
                              ? "bg-emerald-500 text-white"
                              : "bg-muted/60"
                          }`}
                        >
                          {check.met && (
                            <Check
                              className="h-2.5 w-2.5"
                              strokeWidth={3.5}
                            />
                          )}
                        </div>
                        <span
                          className={`text-[11.5px] transition-colors ${
                            check.met
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  Creating account...
                </span>
              ) : (
                <span className="relative flex items-center gap-2">
                  Create account
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          </form>

          <p
            data-auth-reveal
            className="mt-6 text-center text-[11.5px] leading-relaxed text-muted-foreground"
          >
            By creating an account, you agree to our{" "}
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
