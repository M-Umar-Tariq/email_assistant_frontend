"use client"

import { useEffect, useRef, useState } from "react"
import { Mail, Loader2, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { mailboxes } from "@/lib/api"
import { toast } from "sonner"

const PAST_SYNC_OPTIONS = [
  { value: "100", label: "Last 100 emails" },
  { value: "500", label: "Last 500 emails" },
  { value: "1000", label: "Last 1,000 emails" },
  { value: "5000", label: "Last 5,000 emails" },
  { value: "all", label: "All emails" },
] as const

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const DEFAULT_IMAP = { host: "imap.gmail.com", port: 993 }
const DEFAULT_SMTP = { host: "smtp.gmail.com", port: 587 }
const PRESETS: Record<string, { imap: { host: string; port: number }; smtp: { host: string; port: number } }> = {
  gmail: { imap: { host: "imap.gmail.com", port: 993 }, smtp: { host: "smtp.gmail.com", port: 587 } },
  outlook: { imap: { host: "outlook.office365.com", port: 993 }, smtp: { host: "smtp.office365.com", port: 587 } },
  yahoo: { imap: { host: "imap.mail.yahoo.com", port: 993 }, smtp: { host: "smtp.mail.yahoo.com", port: 587 } },
}

const PROVIDER_OPTIONS: { id: "gmail" | "outlook" | "yahoo" | "other"; label: string; short: string }[] = [
  { id: "gmail", label: "Gmail", short: "G" },
  { id: "outlook", label: "Outlook", short: "O" },
  { id: "yahoo", label: "Yahoo", short: "Y" },
  { id: "other", label: "Other", short: "?" },
]

/**
 * Display name tabhi set hota hai jab @ ke baad kam-az-kam ek dot (.) ho.
 * TLD (last dot ke baad wala hissa) hata kar bacha hua part return karta hai.
 * Koi bhi TLD chalega: .com, .org, .net, .edu, .in, .co.uk, .com.pk, etc.
 */
function getDisplayNameFromEmail(email: string): string {
  const trimmed = email.trim()
  if (!trimmed || !trimmed.includes("@")) return ""
  const afterAt = trimmed.split("@")[1] ?? ""
  if (!afterAt || !afterAt.includes(".")) return ""
  const lastDot = afterAt.lastIndexOf(".")
  return lastDot > 0 ? afterAt.slice(0, lastDot) : ""
}

export function AddMailboxDialog({ open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [color, setColor] = useState("#0ea5e9")
  const [imapHost, setImapHost] = useState(DEFAULT_IMAP.host)
  const [imapPort, setImapPort] = useState(DEFAULT_IMAP.port)
  const [smtpHost, setSmtpHost] = useState(DEFAULT_SMTP.host)
  const [smtpPort, setSmtpPort] = useState(DEFAULT_SMTP.port)
  const [imapSecure, setImapSecure] = useState(true)
  const [smtpSecure, setSmtpSecure] = useState(true)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [oauthConnecting, setOauthConnecting] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedProvider, setSelectedProvider] = useState<"gmail" | "outlook" | "yahoo" | "other">("gmail")
  const [createdMailboxId, setCreatedMailboxId] = useState<string | null>(null)
  const [createdMailboxName, setCreatedMailboxName] = useState<string | null>(null)
  const [initialSyncMode, setInitialSyncMode] = useState<"only_new" | "past">("only_new")
  const [pastSyncCount, setPastSyncCount] = useState<string>("500")
  const onOpenChangeRef = useRef(onOpenChange)
  const onSuccessRef = useRef(onSuccess)

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
    onSuccessRef.current = onSuccess
  }, [onOpenChange, onSuccess])

  const reset = () => {
    setName("")
    setEmail("")
    setColor("#0ea5e9")
    setSelectedProvider("gmail")
    setImapHost(DEFAULT_IMAP.host)
    setImapPort(DEFAULT_IMAP.port)
    setSmtpHost(DEFAULT_SMTP.host)
    setSmtpPort(DEFAULT_SMTP.port)
    setImapSecure(true)
    setSmtpSecure(true)
    setPassword("")
    setShowPassword(false)
    setError("")
    setStep(1)
    setCreatedMailboxId(null)
    setCreatedMailboxName(null)
    setInitialSyncMode("only_new")
    setPastSyncCount("500")
  }

  const applyPreset = (provider: "gmail" | "outlook" | "yahoo" | "other") => {
    setSelectedProvider(provider)
    if (provider === "other") {
      setImapHost("")
      setSmtpHost("")
      setImapSecure(true)
      setSmtpSecure(true)
      return
    }
    const p = PRESETS[provider]
    if (p) {
      setImapHost(p.imap.host)
      setImapPort(p.imap.port)
      setSmtpHost(p.smtp.host)
      setSmtpPort(p.smtp.port)
      setImapSecure(true)
      setSmtpSecure(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.")
      return
    }
    if (!imapHost.trim() || !smtpHost.trim()) {
      setError("Please enter IMAP and SMTP host.")
      return
    }
    setSubmitting(true)
    try {
      const emailTrimmed = email.trim()
      const mb = await mailboxes.create({
        name: name.trim(),
        email: emailTrimmed,
        color: color || undefined,
        imap_host: imapHost.trim(),
        imap_port: imapPort,
        imap_secure: imapSecure,
        smtp_host: smtpHost.trim(),
        smtp_port: smtpPort,
        smtp_secure: smtpSecure,
        username: emailTrimmed,
        password,
      })
      setCreatedMailboxId(mb.id)
      setCreatedMailboxName(mb.name || emailTrimmed)
      setStep(2)
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Failed to add mailbox"
      setError(msg)
      toast.error(msg, { duration: 6000 })
    } finally {
      setSubmitting(false)
      setOauthConnecting(false)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const gmailConnect = params.get("gmail_connect")
    if (!gmailConnect) return
    const mailboxId = params.get("mailbox_id")
    const mailboxName = params.get("mailbox_name")
    if (gmailConnect === "success") {
      toast.success("Gmail connected successfully.")
      window.dispatchEvent(new CustomEvent("mailbox:updated"))
      onSuccessRef.current?.()
      if (mailboxId) {
        setCreatedMailboxId(mailboxId)
        setCreatedMailboxName(mailboxName || "Gmail")
        setStep(2)
        onOpenChangeRef.current(true)
      }
    } else {
      toast.error("Gmail connect failed. Please try again.")
    }
    params.delete("gmail_connect")
    params.delete("mailbox_id")
    params.delete("mailbox_name")
    const next = params.toString()
    const nextUrl = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`
    window.history.replaceState({}, "", nextUrl)
  }, [])

  const handleSyncContinue = () => {
    if (!createdMailboxId) return
    const syncOptions =
      initialSyncMode === "only_new"
        ? { initial_sync: "only_new" as const }
        : pastSyncCount === "all"
          ? { initial_sync: "all" as const }
          : { initial_sync: "last_n" as const, limit: parseInt(pastSyncCount, 10) }
    const mbName = createdMailboxName
    const mbId = createdMailboxId
    const syncToastId = `sync-${mbId}`
    const pollMailboxSyncStatus = (attempt = 0) => {
      const maxAttempts = 36
      const pollDelayMs = 5000
      mailboxes
        .get(mbId)
        .then((latest) => {
          const status = latest.sync_status
          if (status === "syncing") {
            if (attempt >= maxAttempts) {
              toast(`"${mbName}" is still syncing in the background.`, { id: syncToastId, duration: 5000 })
              return
            }
            window.setTimeout(() => pollMailboxSyncStatus(attempt + 1), pollDelayMs)
            return
          }
          if (status === "synced") {
            toast.success(`"${mbName}" sync completed.`, { id: syncToastId, duration: 4000 })
            window.dispatchEvent(new CustomEvent("mailbox:sync-complete", { detail: { mailboxId: mbId, synced: 0 } }))
          } else if (status === "cancelled") {
            toast(`Sync for "${mbName}" was stopped.`, { id: syncToastId, duration: 4000 })
          } else {
            toast.error(`Failed to sync "${mbName}". Check settings.`, { id: syncToastId, duration: 5000 })
          }
          window.dispatchEvent(new CustomEvent("mailbox:updated"))
        })
        .catch(() => {
          if (attempt >= maxAttempts) {
            toast.error(`Failed to sync "${mbName}". Check settings.`, { id: syncToastId, duration: 5000 })
            return
          }
          window.setTimeout(() => pollMailboxSyncStatus(attempt + 1), pollDelayMs)
        })
    }
    toast.loading(`Syncing "${mbName}"... This may take a moment.`, { id: syncToastId, duration: Infinity })
    window.dispatchEvent(new CustomEvent("mailbox:updated"))
    mailboxes.sync(mbId, syncOptions)
      .then((res) => {
        if (res.skipped_reason === "already_syncing") {
          toast.loading(`"${mbName}" is still syncing...`, { id: syncToastId, duration: Infinity })
          pollMailboxSyncStatus()
          return
        }
        toast.success(`"${mbName}" synced! ${res.synced} email${res.synced !== 1 ? "s" : ""} fetched.`, { id: syncToastId, duration: 4000 })
        window.dispatchEvent(new CustomEvent("mailbox:sync-complete", { detail: { mailboxId: mbId, synced: res.synced } }))
      })
      .catch(() => {
        mailboxes
          .get(mbId)
          .then((latest) => {
            if (latest.sync_status === "syncing") {
              toast.loading(`"${mbName}" is still syncing...`, { id: syncToastId, duration: Infinity })
              pollMailboxSyncStatus()
              return
            }
            toast.error(`Failed to sync "${mbName}". Check settings.`, { id: syncToastId, duration: 5000 })
            window.dispatchEvent(new CustomEvent("mailbox:updated"))
          })
          .catch(() => {
            toast.error(`Failed to sync "${mbName}". Check settings.`, { id: syncToastId, duration: 5000 })
            window.dispatchEvent(new CustomEvent("mailbox:updated"))
          })
      })
    reset()
    onOpenChange(false)
    onSuccess?.()
  }

  const handleGoogleConnect = async () => {
    setError("")
    setOauthConnecting(true)
    try {
      const { auth_url } = await mailboxes.googleStart()
      if (!auth_url) throw new Error("Google auth URL not returned by server.")
      window.location.assign(auth_url)
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Failed to start Gmail connect"
      setError(msg)
      toast.error(msg, { duration: 6000 })
      setOauthConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) { onOpenChange(v); if (!v) { if (step === 2) onSuccess?.(); reset() } } }}>
      <DialogContent className="sm:max-w-[880px] max-w-[calc(100vw-2rem)] max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
        {step === 1 ? (
        <>
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            Add mailbox
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Connect an email account. Select provider and enter credentials. Stored securely.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
          {/* Provider selection - compact row */}
          <div className="pt-3">
            <p className="text-xs font-medium text-foreground mb-2">Select your email provider</p>
            <div className="flex gap-2">
              {PROVIDER_OPTIONS.map((opt) => {
                const isSelected = selectedProvider === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => applyPreset(opt.id)}
                    className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 py-2 px-2 transition-all min-h-0 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-sm font-semibold border border-border">
                      {opt.short}
                    </span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Two columns: Account details | Server settings */}
          <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
            {/* Account details */}
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground mb-2">Account details</p>
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="mb-email" className="text-xs text-muted-foreground">Email address</Label>
                  <Input
                    id="mb-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      const v = e.target.value
                      setEmail(v)
                      setName(getDisplayNameFromEmail(v))
                    }}
                    className="bg-background border-border text-foreground h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Enter your full mailbox email (this is used as IMAP/SMTP username).</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mb-password" className="text-xs text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      id="mb-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="App password or mailbox password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background border-border text-foreground h-8 text-sm pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex h-full items-center px-2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Use app password if your provider has 2-step verification; otherwise mailbox password.</p>
                </div>
                {selectedProvider === "gmail" && (
                  <div className="space-y-2 rounded-md border border-border bg-background/50 p-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      Prefer one-click sign-in? Connect Gmail with Google OAuth (no app password needed).
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGoogleConnect}
                      disabled={submitting || oauthConnecting}
                      className="h-8 w-full"
                    >
                      {oauthConnecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redirecting to Google...
                        </>
                      ) : (
                        "Connect Gmail with Google"
                      )}
                    </Button>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="mb-name" className="text-xs text-muted-foreground">Display name</Label>
                  <Input
                    id="mb-name"
                    placeholder="e.g. Work"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background border-border text-foreground h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">A friendly name shown in the app, for example Work or Personal.</p>
                </div>
              </div>
            </div>

            {/* Server settings + Color */}
            <div className="min-w-0 flex flex-col gap-2">
              <p className="text-xs font-medium text-foreground">Server settings</p>
              <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-3">
                {/* IMAP — host full width; port + security on one row */}
                <div className="space-y-1.5 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">IMAP (incoming)</p>
                  <div className="space-y-1">
                    <Label htmlFor="mb-imap-host" className="text-xs text-muted-foreground">Host</Label>
                    <Input
                      id="mb-imap-host"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      className="bg-background border-border text-foreground h-9 text-sm font-mono min-w-0 w-full"
                    />
                    <p className="text-[10px] text-muted-foreground">Incoming mail server hostname, e.g. imap.gmail.com.</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1 w-[5.5rem] shrink-0">
                      <Label htmlFor="mb-imap-port" className="text-xs text-muted-foreground">Port</Label>
                      <Input
                        id="mb-imap-port"
                        type="number"
                        min={1}
                        max={65535}
                        value={imapPort}
                        onChange={(e) => {
                          const p = parseInt(e.target.value, 10) || 993
                          setImapPort(p)
                          setImapSecure(p === 993 || p === 143)
                        }}
                        className="bg-background border-border text-foreground h-9 text-sm tabular-nums w-full"
                      />
                      <p className="text-[10px] text-muted-foreground">Usually 993 (SSL/TLS) or 143 (STARTTLS).</p>
                    </div>
                    <div className="space-y-1 min-w-[10rem] flex-1">
                      <Label htmlFor="mb-imap-sec" className="text-xs text-muted-foreground">Security</Label>
                      <select
                        id="mb-imap-sec"
                        value={imapSecure ? "secure" : "none"}
                        onChange={(e) => setImapSecure(e.target.value === "secure")}
                        className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-2.5 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                      >
                        <option value="secure">{imapPort === 993 ? "SSL/TLS (implicit)" : "STARTTLS"}</option>
                        <option value="none">None</option>
                      </select>
                      <p className="text-[10px] text-muted-foreground">Match this with your provider's IMAP encryption requirement.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-3 space-y-1.5 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">SMTP (outgoing)</p>
                  <div className="space-y-1">
                    <Label htmlFor="mb-smtp-host" className="text-xs text-muted-foreground">Host</Label>
                    <Input
                      id="mb-smtp-host"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      className="bg-background border-border text-foreground h-9 text-sm font-mono min-w-0 w-full"
                    />
                    <p className="text-[10px] text-muted-foreground">Outgoing mail server hostname, e.g. smtp.gmail.com.</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1 w-[5.5rem] shrink-0">
                      <Label htmlFor="mb-smtp-port" className="text-xs text-muted-foreground">Port</Label>
                      <Input
                        id="mb-smtp-port"
                        type="number"
                        min={1}
                        max={65535}
                        value={smtpPort}
                        onChange={(e) => {
                          const p = parseInt(e.target.value, 10) || 587
                          setSmtpPort(p)
                          setSmtpSecure(p === 465 || p === 587)
                        }}
                        className="bg-background border-border text-foreground h-9 text-sm tabular-nums w-full"
                      />
                      <p className="text-[10px] text-muted-foreground">Usually 587 (STARTTLS) or 465 (SSL/TLS).</p>
                    </div>
                    <div className="space-y-1 min-w-[10rem] flex-1">
                      <Label htmlFor="mb-smtp-sec" className="text-xs text-muted-foreground">Security</Label>
                      <select
                        id="mb-smtp-sec"
                        value={smtpSecure ? "secure" : "none"}
                        onChange={(e) => setSmtpSecure(e.target.value === "secure")}
                        className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-2.5 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                      >
                        <option value="secure">{smtpPort === 465 ? "SSL/TLS (implicit)" : "STARTTLS"}</option>
                        <option value="none">None</option>
                      </select>
                      <p className="text-[10px] text-muted-foreground">Use the same encryption type recommended for your SMTP port.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
                  <Label htmlFor="mb-color" className="text-xs font-medium text-foreground">Mailbox color</Label>
                  <input
                    id="mb-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    title="Pick color"
                    className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-background p-0.5"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Optional: choose a color to quickly identify this mailbox in the UI.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          </div>

          <DialogFooter className="px-5 py-3 border-t border-border bg-muted/10 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); reset() }}
              disabled={submitting}
              className="border-border text-foreground"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                "Add mailbox"
              )}
            </Button>
          </DialogFooter>
        </form>
        </>
        ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogHeader className="px-5 pt-4 pb-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg text-primary">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Mailbox connected
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              {createdMailboxName ? (
                <>How do you want to sync emails for <strong>{createdMailboxName}</strong>?</>
              ) : (
                "How do you want to sync emails?"
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 min-w-0">
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
              <Label className="text-sm font-medium">When connecting, sync emails</Label>
              <RadioGroup
                value={initialSyncMode}
                onValueChange={(v) => setInitialSyncMode(v as "only_new" | "past")}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="only_new" id="sync-only-new" className="text-primary border-border shrink-0" />
                  <Label htmlFor="sync-only-new" className="font-normal text-foreground cursor-pointer">
                    Only new emails (from now on)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="past" id="sync-past" className="text-primary border-border shrink-0" />
                  <Label htmlFor="sync-past" className="font-normal text-foreground cursor-pointer">
                    Sync past emails
                  </Label>
                </div>
              </RadioGroup>
              {initialSyncMode === "past" && (
                <div className="pl-6 pt-1">
                  <Select value={pastSyncCount} onValueChange={setPastSyncCount}>
                    <SelectTrigger className="w-full max-w-[220px] bg-background border-border text-foreground">
                      <SelectValue placeholder="How many?" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAST_SYNC_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-foreground">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter className="px-5 py-3 border-t border-border bg-muted/10 shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onOpenChange(false); onSuccess?.() }}
              disabled={submitting}
              className="border-border text-foreground"
            >
              Skip for now
            </Button>
            <Button
              type="button"
              onClick={handleSyncContinue}
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </DialogFooter>
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
