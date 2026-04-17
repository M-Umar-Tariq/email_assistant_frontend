"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "@/lib/gsap-ui"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { BetaLabel } from "@/components/beta-label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import smartMailLogo from "@/logo/Smart Mail Logo.png"

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
          duration: 0.5,
          stagger: 0.09,
          ease: "power2.out",
        })
      }
      if (formCol) {
        gsap.from(formCol.querySelectorAll("[data-auth-reveal]"), {
          opacity: 0,
          y: 18,
          duration: 0.45,
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
    <div ref={pageRef} className="flex min-h-svh bg-background">
      {/* Left panel - branding */}
      <div data-auth-panel="brand" className="hidden w-1/2 flex-col justify-between border-r border-border bg-card p-12 lg:flex">
        <div data-auth-reveal>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Image src={smartMailLogo} alt="Smart Mail AI logo" className="h-9 w-9 object-contain" priority />
            </div>
            <span className="flex items-center text-base font-semibold">
              <span className="text-foreground">Smart Mail </span>
              <span className="text-primary">AI</span>
              <BetaLabel />
            </span>
          </Link>
        </div>

        <div className="max-w-md">
          <h2 data-auth-reveal className="text-3xl font-bold leading-tight text-foreground">
            Welcome back
          </h2>
          <p data-auth-reveal className="mt-4 text-base leading-relaxed text-muted-foreground">
            Continue where you left off: daily briefing, unified inbox across your mailboxes, AI search, compose, assistant, analytics, and calendar—all in
            one workspace.
          </p>

          <div data-auth-reveal className="mt-10 rounded-xl border border-border bg-background/50 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <Image src={smartMailLogo} alt="Smart Mail AI logo" className="h-8 w-8 object-contain" />
              </div>
              <span className="text-sm font-medium text-foreground">Inside the app</span>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>• Briefing and inbox sync from your connected accounts</li>
              <li>• Labels, follow-ups, and meetings from mail context</li>
              <li>• Voice agent and feedback to shape what we build next</li>
            </ul>
          </div>
        </div>

        <p data-auth-reveal className="text-xs text-muted-foreground">
          {"2026 Smart Mail AI Beta. All rights reserved."}
        </p>
      </div>

      {/* Right panel - form */}
      <div data-auth-panel="form" className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div data-auth-reveal className="mb-8 flex flex-col items-center lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <Image src={smartMailLogo} alt="Smart Mail AI logo" className="h-9 w-9 object-contain" priority />
              </div>
              <span className="flex items-center text-base font-semibold">
                <span className="text-foreground">Smart Mail </span>
                <span className="text-primary">AI</span>
                <BetaLabel />
              </span>
            </Link>
          </div>

          <div data-auth-reveal className="mb-8">
            <h1 className="flex flex-wrap items-center gap-x-1 text-2xl font-bold text-foreground">
              <span>Log in to</span>
              <span className="flex items-center">
                <span>Smart Mail </span>
                <span className="text-primary">AI</span>
                <BetaLabel />
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {"Don't have an account?"}{" "}
              <Link href="/signup" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Sign up
              </Link>
            </p>
          </div>

          {/* Login form */}
          <form data-auth-reveal onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@acmecorp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">
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
                  className="h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Log in
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p data-auth-reveal className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="#" className="text-foreground hover:text-primary transition-colors">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-foreground hover:text-primary transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
