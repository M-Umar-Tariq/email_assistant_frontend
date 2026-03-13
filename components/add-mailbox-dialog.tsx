"use client"

import { useState } from "react"
import { Mail, Loader2, CheckCircle2 } from "lucide-react"
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
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedProvider, setSelectedProvider] = useState<"gmail" | "outlook" | "yahoo" | "other">("gmail")
  const [createdMailboxId, setCreatedMailboxId] = useState<string | null>(null)
  const [createdMailboxName, setCreatedMailboxName] = useState<string | null>(null)
  const [initialSyncMode, setInitialSyncMode] = useState<"only_new" | "past">("only_new")
  const [pastSyncCount, setPastSyncCount] = useState<string>("500")

  const reset = () => {
    setName("")
    setEmail("")
    setColor("#0ea5e9")
    setSelectedProvider("gmail")
    setImapHost(DEFAULT_IMAP.host)
    setImapPort(DEFAULT_IMAP.port)
    setSmtpHost(DEFAULT_SMTP.host)
    setSmtpPort(DEFAULT_SMTP.port)
    setPassword("")
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
      return
    }
    const p = PRESETS[provider]
    if (p) {
      setImapHost(p.imap.host)
      setImapPort(p.imap.port)
      setSmtpHost(p.smtp.host)
      setSmtpPort(p.smtp.port)
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
        smtp_host: smtpHost.trim(),
        smtp_port: smtpPort,
        username: emailTrimmed,
        password,
      })
      setCreatedMailboxId(mb.id)
      setCreatedMailboxName(mb.name || emailTrimmed)
      setStep(2)
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to add mailbox")
    } finally {
      setSubmitting(false)
    }
  }

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
    toast.loading(`Syncing "${mbName}"... This may take a moment.`, { id: `sync-${mbId}`, duration: Infinity })
    window.dispatchEvent(new CustomEvent("mailbox:updated"))
    mailboxes.sync(mbId, syncOptions)
      .then((res) => {
        toast.success(`"${mbName}" synced! ${res.synced} email${res.synced !== 1 ? "s" : ""} fetched.`, { id: `sync-${mbId}`, duration: 4000 })
        window.dispatchEvent(new CustomEvent("mailbox:sync-complete", { detail: { mailboxId: mbId, synced: res.synced } }))
      })
      .catch(() => {
        toast.error(`Failed to sync "${mbName}". Check settings.`, { id: `sync-${mbId}` })
        window.dispatchEvent(new CustomEvent("mailbox:updated"))
      })
    reset()
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) { onOpenChange(v); if (!v) { if (step === 2) onSuccess?.(); reset() } } }}>
      <DialogContent className="sm:max-w-[780px] max-w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
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

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          {/* Provider selection - compact row */}
          <div className="px-5 pt-3">
            <p className="text-xs font-medium text-foreground mb-2">Select your email provider</p>
            <div className="flex gap-2">
              {PROVIDER_OPTIONS.map((opt) => {
                const isSelected = selectedProvider === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => applyPreset(opt.id)}
                    className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 py-2.5 px-2 transition-all min-h-0 ${
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
          <div className="px-5 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Account details */}
            <div>
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
                  <p className="text-[10px] text-muted-foreground">Username for IMAP/SMTP</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mb-password" className="text-xs text-muted-foreground">Password</Label>
                  <Input
                    id="mb-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="App password or mailbox password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background border-border text-foreground h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mb-name" className="text-xs text-muted-foreground">Display name</Label>
                  <Input
                    id="mb-name"
                    placeholder="e.g. Work"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background border-border text-foreground h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Server settings + Color */}
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Server settings</p>
              <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted-foreground font-medium p-2 w-[100px]">Protocol</th>
                      <th className="text-left text-muted-foreground font-medium p-2">Host</th>
                      <th className="text-left text-muted-foreground font-medium p-2 w-28">Port</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="p-2 text-foreground">IMAP</td>
                      <td className="p-1.5">
                        <Input
                          id="mb-imap-host"
                          value={imapHost}
                          onChange={(e) => setImapHost(e.target.value)}
                          className="bg-background border-border text-foreground h-7 text-xs"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          id="mb-imap-port"
                          type="number"
                          min={1}
                          max={65535}
                          value={imapPort}
                          onChange={(e) => setImapPort(parseInt(e.target.value, 10) || 993)}
                          className="bg-background border-border text-foreground h-7 text-xs w-24 min-w-[5.5rem]"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-foreground">SMTP</td>
                      <td className="p-1.5">
                        <Input
                          id="mb-smtp-host"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="bg-background border-border text-foreground h-7 text-xs"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          id="mb-smtp-port"
                          type="number"
                          min={1}
                          max={65535}
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(parseInt(e.target.value, 10) || 587)}
                          className="bg-background border-border text-foreground h-7 text-xs w-24 min-w-[5.5rem]"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Label htmlFor="mb-color" className="text-xs text-muted-foreground shrink-0">Color</Label>
                <input
                  id="mb-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-10 cursor-pointer rounded border border-border bg-background"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="mx-5 mt-2 text-sm text-red-400">{error}</p>
          )}

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
        <>
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
          <div className="px-5 py-4 min-w-0 overflow-auto">
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
              <p className="text-sm text-red-400 mt-3">{error}</p>
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
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}
