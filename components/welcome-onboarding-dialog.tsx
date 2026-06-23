"use client"

import { useEffect, useState } from "react"
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Link2,
  Mail,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react"
import { BetaLabel } from "@/components/beta-label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { FRESH_SIGNUP_KEY } from "@/lib/fresh-signup"
import { settingsApi, type AiLabelRule } from "@/lib/api"
import { dispatchLabelsUpdated } from "@/lib/labels-events"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const TOTAL_STEPS = 7

function firstName(full: string) {
  const p = full.trim().split(/\s+/)[0]
  return p || "there"
}

function initials(full: string) {
  const parts = full.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0]?.[0] || "?").toUpperCase()
}

const INTRO_FEATURES = [
  "Link multiple mailboxes (IMAP and more) and see a unified daily briefing.",
  "Search and ask questions in plain English — answers come from your own email history.",
  "Draft replies, snooze, and organize with smart labels and priorities.",
  "Use the personal AI assistant and analytics to spot patterns and save time every week.",
]

function ProfileCard({
  name,
  email,
  letter,
}: {
  name: string
  email: string
  letter: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-bold text-white shadow-sm"
        aria-hidden
      >
        {letter}
      </div>
      <div className="min-w-0 text-left">
        <p className="truncate font-semibold text-foreground">{name}</p>
        <p className="truncate text-sm text-muted-foreground">{email}</p>
      </div>
    </div>
  )
}

export function WelcomeOnboardingDialog() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [occupation, setOccupation] = useState("")
  const [importantEmails, setImportantEmails] = useState("")
  const [draftStyle, setDraftStyle] = useState("")
  const [labelRules, setLabelRules] = useState<AiLabelRule[]>([
    { name: "Priority", instruction: "Urgent client requests and deadlines I must see first." },
    { name: "Newsletters", instruction: "Marketing digests and low-priority subscriptions." },
  ])

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      if (sessionStorage.getItem(FRESH_SIGNUP_KEY) === "1") setOpen(true)
    } catch {
      // ignore
    }
  }, [])

  const dismiss = () => {
    try {
      sessionStorage.removeItem(FRESH_SIGNUP_KEY)
    } catch {
      // ignore
    }
    setOpen(false)
    setStep(0)
  }

  const addLabelRow = () => {
    if (labelRules.length >= 10) return
    setLabelRules((r) => [...r, { name: "", instruction: "" }])
  }

  const removeLabelRow = (i: number) => {
    setLabelRules((r) => r.filter((_, j) => j !== i))
  }

  const updateLabel = (i: number, field: keyof AiLabelRule, value: string) => {
    setLabelRules((r) => r.map((row, j) => (j === i ? { ...row, [field]: value } : row)))
  }

  const requestNotifications = async () => {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        await Notification.requestPermission()
      }
    } catch {
      // ignore
    }
    setStep(6)
  }

  const finish = async () => {
    if (!user) return
    setSaving(true)
    try {
      const rules = labelRules
        .map((r) => ({
          name: r.name.trim(),
          instruction: r.instruction.trim(),
        }))
        .filter((r) => r.name || r.instruction)

      await settingsApi.update({
        occupation: occupation.trim(),
        important_emails_notes: importantEmails.trim(),
        draft_style_notes: draftStyle.trim(),
        ai_label_rules: rules,
        onboarding_completed: true,
      })
      dispatchLabelsUpdated(rules)
      toast.success("You're all set — welcome to Smart Mail AI Beta.")
      dismiss()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your preferences.")
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const fn = firstName(user.name)
  const letter = initials(user.name)
  const wideStep = step === 4

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent
        showCloseButton
        className={cn(
          "max-h-[90vh] gap-0 overflow-y-auto border-border/80 bg-card p-0 shadow-2xl sm:rounded-2xl",
          wideStep ? "max-w-2xl" : "max-w-lg"
        )}
      >
        <div className={cn("px-6 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-9", wideStep && "sm:px-10")}>
          {/* Step 0 — intro */}
          {step === 0 && (
            <>
              <DialogHeader className="space-y-0 text-center">
                <DialogTitle className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-[1.65rem] sm:leading-snug">
                  Great to meet you, {fn}!
                </DialogTitle>
              </DialogHeader>
              <div className="mt-8 flex items-center justify-center gap-3 sm:gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-lg font-bold text-white shadow-md ring-2 ring-background sm:h-16 sm:w-16 sm:text-xl"
                  aria-hidden
                >
                  {letter}
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/20">
                  <Link2 className="h-6 w-6" strokeWidth={2.25} aria-hidden />
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md ring-2 ring-background sm:h-16 sm:w-16">
                  <Mail className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
                </div>
              </div>
              <p className="mt-8 text-center text-base font-semibold text-foreground">
                Smart Mail AI Beta helps you stay on top of every inbox:
              </p>
              <ul className="mx-auto mt-5 max-w-md space-y-3.5 text-left text-sm leading-relaxed text-muted-foreground">
                {INTRO_FEATURES.map((line) => (
                  <li key={line} className="flex gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Step 1 — about you */}
          {step === 1 && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Tell Smart Mail AI Beta about yourself
                </DialogTitle>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  We use your answers to tune briefings, AI replies, search, and your personal assistant — only for your
                  account.
                </p>
              </DialogHeader>
              <div className="mt-6">
                <ProfileCard name={user.name} email={user.email} letter={letter} />
              </div>
              <div className="mt-6 space-y-2">
                <Label htmlFor="onb-occupation" className="text-foreground">
                  What&apos;s your occupation or role?
                </Label>
                <Textarea
                  id="onb-occupation"
                  placeholder="Ex: I'm a product manager at a SaaS company; I live in email with vendors and customers."
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  rows={4}
                  className="resize-none bg-background"
                />
              </div>
            </>
          )}

          {/* Step 2 — important emails */}
          {step === 2 && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  What emails matter most?
                </DialogTitle>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Describe senders, topics, or situations that should always rise to the top for you.
                </p>
              </DialogHeader>
              <div className="mt-6">
                <ProfileCard name={user.name} email={user.email} letter={letter} />
              </div>
              <div className="mt-6 space-y-2">
                <Label htmlFor="onb-important" className="text-foreground">
                  Important to me
                </Label>
                <Textarea
                  id="onb-important"
                  placeholder="Ex: Messages from my manager, invoices, anything with 'production outage', and emails from @acmecorp.com."
                  value={importantEmails}
                  onChange={(e) => setImportantEmails(e.target.value)}
                  rows={5}
                  className="resize-none bg-background"
                />
              </div>
            </>
          )}

          {/* Step 3 — draft tone */}
          {step === 3 && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  How should AI draft replies for you?
                </DialogTitle>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Smart Mail AI Beta will follow this style when suggesting drafts and compose help.
                </p>
              </DialogHeader>
              <div className="mt-6">
                <ProfileCard name={user.name} email={user.email} letter={letter} />
              </div>
              <div className="mt-6 space-y-2">
                <Label htmlFor="onb-draft" className="text-foreground">
                  Tone & preferences
                </Label>
                <Textarea
                  id="onb-draft"
                  placeholder="Ex: Work email — concise and professional, no fluff. Friends — warm and casual. Never use emojis in client threads."
                  value={draftStyle}
                  onChange={(e) => setDraftStyle(e.target.value)}
                  rows={5}
                  className="resize-none bg-background"
                />
              </div>
            </>
          )}

          {/* Step 4 — AI labels */}
          {step === 4 && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Teach Smart Mail AI Beta how to think about your mail
                </DialogTitle>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Add labels and short plain-English rules. These guide prioritization and auto-labeling when you turn
                  them on.
                </p>
              </DialogHeader>
              <div className="mt-5 max-h-[min(42vh,320px)] space-y-3 overflow-y-auto pr-1">
                {labelRules.map((row, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl border border-border bg-muted/20 p-3 pt-3 sm:p-4"
                  >
                    <button
                      type="button"
                      onClick={() => removeLabelRow(i)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
                      aria-label="Remove label"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="space-y-2 pr-8">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Label name</Label>
                      <Input
                        value={row.name}
                        onChange={(e) => updateLabel(i, "name", e.target.value)}
                        placeholder="e.g. Client work"
                        className="bg-background"
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">When to use it</Label>
                      <Textarea
                        value={row.instruction}
                        onChange={(e) => updateLabel(i, "instruction", e.target.value)}
                        placeholder="Describe in plain English what belongs under this label."
                        rows={2}
                        className="resize-none bg-background text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="ghost" className="mt-2 gap-1 text-primary" onClick={addLabelRow}>
                <Plus className="h-4 w-4" /> Add label
              </Button>
            </>
          )}

          {/* Step 5 — notifications */}
          {step === 5 && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  <Bell className="h-6 w-6 text-primary" aria-hidden />
                  Enable notifications
                </DialogTitle>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Get timely heads-ups for important activity. You can change this anytime in Settings.
                </p>
              </DialogHeader>
              <div className="mt-6 rounded-xl bg-primary p-4 text-primary-foreground shadow-inner sm:p-5">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs opacity-90">
                      <span className="flex items-center gap-1">
                        <span>Smart Mail AI</span>
                        <BetaLabel className="!ml-0 border-primary-foreground/40 bg-primary-foreground/20 text-primary-foreground shadow-none" />
                      </span>
                      <span className="tabular-nums opacity-75">now</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold">Daily briefing ready</p>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">
                      You have unread priority items due today — open the app for a one-tap summary.
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Browser notifications work best on desktop. On mobile, open the app for the full experience.
              </p>
            </>
          )}

          {/* Step 6 — final welcome */}
          {step === 6 && (
            <>
              <DialogHeader className="space-y-3 text-center">
                <DialogTitle className="flex flex-col items-center gap-3 text-center text-2xl font-bold tracking-tight text-foreground sm:text-[1.65rem]">
                  <span>Welcome to</span>
                  <span className="inline-flex flex-wrap items-center justify-center gap-x-1">
                    <span>Smart Mail </span>
                    <span className="text-primary">AI</span>
                    <BetaLabel />
                  </span>
                </DialogTitle>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You&apos;re set up. We&apos;ll use your mailboxes and preferences to power briefings, AI search, drafts,
                  and priority items.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Sync may run in the background after you connect an inbox — you can keep using the app normally.
                </p>
              </DialogHeader>
            </>
          )}

          {/* Footer nav */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/60 pt-6">
            <div className="min-w-0">
              {step > 0 && step < 6 && (
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  Step {step + 1} of {TOTAL_STEPS}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {step > 0 && (
                <Button type="button" variant="ghost" className="gap-1 text-muted-foreground" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}
              {step === 0 && (
                <Button type="button" className="gap-1 rounded-lg font-semibold" onClick={() => setStep(1)}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {step >= 1 && step <= 3 && (
                <Button type="button" className="gap-1 rounded-lg font-semibold" onClick={() => setStep((s) => s + 1)}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {step === 4 && (
                <Button type="button" className="gap-1 rounded-lg font-semibold" onClick={() => setStep(5)}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {step === 5 && (
                <>
                  <Button type="button" variant="outline" className="rounded-lg" onClick={() => setStep(6)}>
                    Skip for now
                  </Button>
                  <Button type="button" className="gap-1 rounded-lg font-semibold" onClick={requestNotifications}>
                    Enable
                  </Button>
                </>
              )}
              {step === 6 && (
                <Button type="button" className="min-w-[160px] rounded-lg font-semibold" disabled={saving} onClick={finish}>
                  {saving ? "Saving…" : "Get started"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
