"use client"

import Link from "next/link"
import { useState } from "react"
import { Mail, ArrowRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

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
    <div className="flex min-h-svh bg-background">
      {/* Left panel - branding */}
      <div className="hidden w-1/2 flex-col justify-between border-r border-border bg-card p-12 lg:flex">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold text-foreground">MailMind</span>
          </Link>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-foreground">
            Welcome back
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Your AI email assistant is ready. Pick up where you left off with your daily briefing, inbox, and intelligent search.
          </p>

          <div className="mt-10 rounded-xl border border-border bg-background/50 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Today{"'"}s quick look</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Unread emails</span>
                <span className="text-sm font-semibold text-foreground">25</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Action required</span>
                <span className="text-sm font-semibold text-red-400">4 urgent</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Briefing ready</span>
                <span className="text-sm font-semibold text-emerald-400">Yes</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {"2026 MailMind. All rights reserved."}
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-base font-semibold text-foreground">MailMind</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Log in to MailMind</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {"Don't have an account?"}{" "}
              <Link href="/signup" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Sign up
              </Link>
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="flex flex-col gap-2.5">
            <Button
              variant="outline"
              className="h-11 w-full border-border bg-secondary text-foreground hover:bg-secondary/80 gap-3 text-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
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
