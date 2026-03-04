"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  Search,
  Star,
  Paperclip,
  MoreHorizontal,
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  Tag,
  Clock,
  ArrowLeft,
  Circle,
  Filter,
  ChevronDown,

  Sparkles,
  AlarmClock,
  Send,
  CalendarPlus,
  Eye,
  ChevronRight,
  X,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Newspaper,
  Users,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Square,
  Zap,
  Inbox,
  MailOpen,
  MailX,
  FileText,
  Download,
  Mic,
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { emails as emailsApi, mailboxes as mailboxesApi, compose as composeApi, ai as aiApi, getStoredUser } from "@/lib/api"
import { mapEmailListApi, mapEmailDetailApi, mapMailboxApi } from "@/lib/mappers"
import type { Email, EmailCategory, Mailbox } from "@/lib/mock-data"
import type { InboxFilter } from "@/components/daily-briefing"
import { sanitizeEmailHtml } from "@/lib/sanitize-html"

function EmailHtmlFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [height, setHeight] = useState(400)

  const adjustHeight = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument?.body) return
    const h = iframe.contentDocument.body.scrollHeight
    if (h > 0) setHeight(h + 24)
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument?.body) return
    const observer = new ResizeObserver(adjustHeight)
    observer.observe(iframe.contentDocument.body)
    return () => observer.disconnect()
  }, [adjustHeight, height])

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;background:#fff;word-wrap:break-word;overflow-wrap:break-word}
img{max-width:100%;height:auto}
table{max-width:100%!important;width:auto!important}
a{color:#0b57d0}
pre,code{white-space:pre-wrap;word-wrap:break-word;max-width:100%}
blockquote{border-left:3px solid #ddd;margin:8px 0;padding:4px 12px;color:#555}
</style></head><body>${html}</body></html>`

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      onLoad={adjustHeight}
      sandbox="allow-same-origin allow-popups"
      style={{ width: "100%", height, border: "none", borderRadius: 8, background: "#fff" }}
      title="Email content"
    />
  )
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getMailboxColor(mailboxId: string, mailboxes: Mailbox[]) {
  return mailboxes.find((mb) => mb.id === mailboxId)?.color || "#64748b"
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHrs = diffMs / (1000 * 60 * 60)
  if (diffHrs < 1) return `${Math.floor(diffMs / (1000 * 60))}m ago`
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const categoryConfig: Record<EmailCategory, { label: string; icon: React.ElementType; color: string }> = {
  important: { label: "Important", icon: ShieldCheck, color: "text-primary" },
  updates: { label: "Updates", icon: TrendingUp, color: "text-amber-400" },
  promotions: { label: "Promotions", icon: Tag, color: "text-emerald-400" },
  social: { label: "Social", icon: Users, color: "text-pink-400" },
  newsletters: { label: "Newsletters", icon: Newspaper, color: "text-indigo-400" },
  finance: { label: "Finance", icon: CreditCard, color: "text-orange-400" },
}

const snoozeOptions = [
  { label: "Later today", hours: 3 },
  { label: "Tomorrow morning", hours: 18 },
  { label: "Next week", hours: 168 },
  { label: "Next month", hours: 720 },
]

function SentimentDot({ score }: { score?: number }) {
  if (score === undefined) return null
  const color = score > 0.3 ? "bg-emerald-400" : score < -0.3 ? "bg-red-400" : "bg-amber-400"
  return <div className={`h-1.5 w-1.5 rounded-full ${color}`} title={`Sentiment: ${score > 0 ? "+" : ""}${score.toFixed(1)}`} />
}

// -- Email List Item with AI Summary line --
function EmailListItem({
  email,
  mailboxes,
  isSelected,
  onSelect,
  showMailbox = false,
}: {
  email: Email
  mailboxes: Mailbox[]
  isSelected: boolean
  onSelect: () => void
  showMailbox?: boolean
}) {
  const mb = showMailbox ? mailboxes.find((m) => m.id === email.mailbox) : null
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-start gap-3 p-4 text-left transition-colors border-l-2 ${
        isSelected
          ? "bg-primary/5 border-l-primary"
          : email.read
            ? "bg-transparent border-l-transparent hover:bg-muted/50"
            : "bg-primary/10 border-l-primary/50 hover:bg-primary/15"
      }`}
    >
      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
        <AvatarFallback
          className="text-xs font-medium"
          style={{
            backgroundColor: `${getMailboxColor(email.mailbox, mailboxes)}20`,
            color: getMailboxColor(email.mailbox, mailboxes),
          }}
        >
          {getInitials(email.from.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-sm truncate ${!email.read ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
              {email.from.name}
            </span>
            {mb && (
              <span
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
                style={{ backgroundColor: `${mb.color}18`, color: mb.color }}
              >
                <Circle className="h-1.5 w-1.5 shrink-0" fill={mb.color} stroke={mb.color} />
                {mb.name}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(email.date)}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-sm truncate ${!email.read ? "font-medium text-foreground" : "text-foreground/70"}`}>
            {email.subject}
          </span>
        </div>
        {/* AI Summary line - like Superhuman auto-summarize */}
        {email.aiSummary && (
          <p className="text-[11px] text-primary/70 truncate mt-0.5 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 shrink-0" />
            {email.aiSummary}
          </p>
        )}
        <p className="text-xs text-muted-foreground truncate mt-1">{email.preview}</p>
        <div className="flex items-center gap-2 mt-2">
          <SentimentDot score={email.sentimentScore} />
          {email.starred && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
          {email.hasAttachment && <Paperclip className="h-3 w-3 text-muted-foreground" />}
          {email.priority === "high" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-400/30 text-red-400">
              urgent
            </Badge>
          )}
          {email.followUp && email.followUp.status === "overdue" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400/30 text-orange-400">
              overdue
            </Badge>
          )}
          {email.schedulingInfo?.detected && (
            <CalendarPlus className="h-3 w-3 text-primary/60" />
          )}
          {email.threadCount && email.threadCount > 1 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {email.threadCount}
            </span>
          )}
          {email.labels.slice(0, 1).map((label) => (
            <Badge key={label} variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary text-secondary-foreground">
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </button>
  )
}

// -- Instant Reply Widget --
function InstantReplyBar({ email, onSend }: { email: Email; onSend: (text: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!email.instantReplies || email.instantReplies.length === 0) return null

  return (
    <div className="border-t border-primary/10 bg-primary/[0.02]">
      <div className="px-6 py-3">
        <div className="flex items-center gap-2 mb-2.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Instant Replies</span>
          <span className="text-[10px] text-muted-foreground">AI-generated responses in your voice</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {email.instantReplies.map((reply) => (
            <button
              key={reply.id}
              onClick={() => setExpanded(expanded === reply.id ? null : reply.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                expanded === reply.id
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
              }`}
            >
              {reply.label}
            </button>
          ))}
        </div>
        {expanded && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-card p-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {email.instantReplies.find((r) => r.id === expanded)?.text}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-7 text-xs"
                onClick={() => onSend(email.instantReplies!.find((r) => r.id === expanded)!.text)}
              >
                <Send className="h-3 w-3" />
                Send
              </Button>
              <Button variant="outline" size="sm" className="border-border text-foreground h-7 text-xs">
                Edit before sending
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setExpanded(null)} className="text-muted-foreground h-7 text-xs">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// -- Schedule from Email Widget --
function ScheduleWidget({ email }: { email: Email }) {
  const [created, setCreated] = useState(false)
  if (!email.schedulingInfo?.detected) return null

  return (
    <div className="rounded-lg border border-indigo-400/20 bg-indigo-400/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarPlus className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-semibold text-indigo-400">Meeting Detected</span>
      </div>
      {created ? (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Event created in your calendar
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <span className="text-muted-foreground">Title</span>
              <p className="text-foreground font-medium">{email.schedulingInfo.title}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Date</span>
              <p className="text-foreground font-medium">
                {email.schedulingInfo.suggestedDate && new Date(email.schedulingInfo.suggestedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                {email.schedulingInfo.suggestedTime && ` at ${email.schedulingInfo.suggestedTime}`}
              </p>
            </div>
            {email.schedulingInfo.location && (
              <div>
                <span className="text-muted-foreground">Location</span>
                <p className="text-foreground font-medium">{email.schedulingInfo.location}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Attendees</span>
              <p className="text-foreground font-medium">{email.schedulingInfo.attendees?.length || 0} people</p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-indigo-500 text-white hover:bg-indigo-600 gap-1.5 h-7 text-xs"
            onClick={() => setCreated(true)}
          >
            <CalendarPlus className="h-3 w-3" />
            Create Calendar Event
          </Button>
        </>
      )}
    </div>
  )
}

// -- Snooze Popover --
function SnoozePopover({ onSnooze, onClose }: { onSnooze: (hours: number) => void; onClose: () => void }) {
  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-card shadow-lg p-1 animate-in fade-in-0 slide-in-from-top-1 duration-150">
      <p className="px-2 py-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Snooze until</p>
      {snoozeOptions.map((opt) => (
        <button
          key={opt.label}
          onClick={() => { onSnooze(opt.hours); onClose() }}
          className="w-full text-left px-2 py-1.5 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// -- Tag/Label Popover --
const AVAILABLE_LABELS = ["work", "personal", "finance", "travel", "project", "urgent", "follow-up", "reference"]

function TagPopover({
  currentLabels,
  onToggle,
  onClose,
}: {
  currentLabels: string[]
  onToggle: (label: string) => void
  onClose: () => void
}) {
  const [custom, setCustom] = useState("")
  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-border bg-card shadow-lg p-1.5 animate-in fade-in-0 slide-in-from-top-1 duration-150">
      <p className="px-2 py-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Labels</p>
      {AVAILABLE_LABELS.map((label) => {
        const active = currentLabels.includes(label)
        return (
          <button
            key={label}
            onClick={() => onToggle(label)}
            className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors ${
              active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
            }`}
          >
            <span className="flex items-center gap-2">
              <Tag className="h-3 w-3" />
              {label}
            </span>
            {active && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
          </button>
        )
      })}
      <div className="mt-1 px-1">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = custom.trim().toLowerCase()
            if (trimmed && !currentLabels.includes(trimmed)) {
              onToggle(trimmed)
            }
            setCustom("")
          }}
        >
          <Input
            placeholder="Add custom label…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-7 text-xs"
          />
        </form>
      </div>
      <button
        onClick={onClose}
        className="w-full mt-1 text-center text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-md hover:bg-muted transition-colors"
      >
        Done
      </button>
    </div>
  )
}

// -- More Menu --
function MoreMenu({
  email,
  onAction,
  onClose,
}: {
  email: Email
  onAction: (action: string) => void
  onClose: () => void
}) {
  const items: { key: string; label: string; icon: React.ElementType; className?: string; separator?: boolean }[] = [
    { key: "markUnread", label: "Mark as unread", icon: Eye },
    { key: "snooze", label: "Snooze", icon: AlarmClock },
    { key: "label", label: "Label", icon: Tag },
    { key: "spam", label: "Report spam", icon: ShieldAlert, className: "text-orange-400", separator: true },
  ]

  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-card shadow-lg p-1 animate-in fade-in-0 slide-in-from-top-1 duration-150">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.key}>
            {item.separator && <div className="my-1 h-px bg-border" />}
            <button
              onClick={() => { onAction(item.key); onClose() }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors ${item.className || "text-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// -- Compose Panel (Reply / Reply All / Forward) --
type ComposeMode = "reply" | "replyAll" | "forward"

const AI_TONES = [
  { key: "professional", label: "Professional" },
  { key: "friendly", label: "Friendly" },
  { key: "concise", label: "Short & Concise" },
  { key: "formal", label: "Formal" },
  { key: "casual", label: "Casual" },
]

function ComposePanel({
  mode,
  email,
  onSend,
  onCancel,
}: {
  mode: ComposeMode
  email: Email
  onSend: (data: { to: string[]; subject: string; body: string }) => void
  onCancel: () => void
}) {
  const defaultTo =
    mode === "forward"
      ? ""
      : mode === "replyAll"
        ? [email.from.email, ...email.to.map((t) => t.email)].filter((v, i, a) => a.indexOf(v) === i).join(", ")
        : email.from.email

  const prefix = mode === "forward" ? "Fwd: " : "Re: "
  const subjectPrefix = email.subject.startsWith(prefix) ? "" : prefix

  const [to, setTo] = useState(defaultTo)
  const [subject] = useState(`${subjectPrefix}${email.subject}`)
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiTone, setAiTone] = useState("professional")
  const [showTones, setShowTones] = useState(false)

  const handleSend = () => {
    const recipients = to.split(",").map((e) => e.trim()).filter(Boolean)
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient")
      return
    }
    setSending(true)
    onSend({ to: recipients, subject, body })
  }

  const handleAiGenerate = () => {
    setAiGenerating(true)
    const user = getStoredUser()
    const context = `Original email from ${email.from.name} <${email.from.email}>:\nSubject: ${email.subject}\n\n${email.body.slice(0, 2000)}`
    composeApi
      .generate({
        to: to.split(",")[0]?.trim() || email.from.email,
        subject: email.subject,
        context,
        tone: aiTone,
        sender_name: user?.name || "",
      })
      .then((res) => {
        let draft = res.draft
        if (user?.name) {
          draft = draft.replace(/\[Your Name\]/gi, user.name).replace(/\[Name\]/gi, user.name)
        }
        setBody(draft)
      })
      .catch((err) => {
        toast.error(err?.message ?? "AI generation failed")
      })
      .finally(() => setAiGenerating(false))
  }

  const handleAiRewrite = (action: string) => {
    if (!body.trim()) {
      toast.error("Write something first to rewrite")
      return
    }
    setAiGenerating(true)
    composeApi
      .rewrite({ text: body, action })
      .then((res) => {
        setBody(res.rewritten)
      })
      .catch((err) => {
        toast.error(err?.message ?? "AI rewrite failed")
      })
      .finally(() => setAiGenerating(false))
  }

  const modeLabel = mode === "reply" ? "Reply" : mode === "replyAll" ? "Reply All" : "Forward"
  const ModeIcon = mode === "forward" ? Forward : mode === "replyAll" ? ReplyAll : Reply

  // Reply = primary; Forward = violet/indigo for quick visual distinction
  const isForward = mode === "forward"
  const accentBg = isForward ? "bg-violet-500/10" : "bg-primary/10"
  const accentBorder = isForward ? "border-violet-400/30" : "border-primary/30"
  const accentText = isForward ? "text-violet-600 dark:text-violet-400" : "text-primary"
  const accentButton = isForward
    ? "bg-violet-600 text-white hover:bg-violet-700"
    : "bg-primary text-primary-foreground hover:bg-primary/90"

  const contextLine =
    mode === "forward"
      ? `Forwarding: "${email.subject}"`
      : `Replying to ${email.from.name || email.from.email}`

  return (
    <div className={`border-t-2 ${accentBorder} ${accentBg} animate-in slide-in-from-bottom-2 duration-200`}>
      <div className="px-5 py-4">
        {/* Header: mode + context + close */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isForward ? "bg-violet-500/20" : "bg-primary/20"}`}>
            <ModeIcon className={`h-4 w-4 ${accentText}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold ${accentText}`}>{modeLabel}</h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{contextLine}</p>
          </div>
          <button
            onClick={onCancel}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground w-10 shrink-0">To</span>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={mode === "forward" ? "Enter recipient email(s)" : "recipient@example.com"}
              className="h-9 text-sm rounded-lg border-border bg-background/80"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground w-10 shrink-0">Subject</span>
            <Input
              value={subject}
              readOnly
              className="h-9 text-sm rounded-lg bg-muted/40 border-border/50 text-foreground/90"
            />
          </div>

          {/* AI Controls */}
          <div className="flex items-center gap-2 flex-wrap py-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAiGenerate}
              disabled={aiGenerating}
              className={`gap-1.5 h-8 text-xs rounded-lg ${isForward ? "border-violet-400/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10" : "border-primary/30 text-primary hover:bg-primary/10"}`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${aiGenerating ? "animate-spin" : ""}`} />
              {aiGenerating ? "Generating…" : "AI Draft"}
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTones(!showTones)}
                className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg"
              >
                Tone: {AI_TONES.find((t) => t.key === aiTone)?.label}
                <ChevronDown className={`h-3 w-3 transition-transform ${showTones ? "rotate-180" : ""}`} />
              </Button>
              {showTones && (
                <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-lg border border-border bg-card shadow-lg p-1 animate-in fade-in-0 slide-in-from-top-1 duration-150">
                  {AI_TONES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => { setAiTone(t.key); setShowTones(false) }}
                      className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                        aiTone === t.key ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {body.trim() && (
              <>
                <Separator orientation="vertical" className="h-4 mx-0.5" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAiRewrite("shorter")}
                  disabled={aiGenerating}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                >
                  Shorter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAiRewrite("more_formal")}
                  disabled={aiGenerating}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                >
                  Formal
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAiRewrite("more_friendly")}
                  disabled={aiGenerating}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                >
                  Friendly
                </Button>
              </>
            )}
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={mode === "forward" ? "Add a note (optional) or write your message…" : "Write your reply or click AI Draft…"}
            rows={6}
            className="w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-y"
          />
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border/50">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground h-9 text-xs rounded-lg">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !body.trim()}
            className={`gap-1.5 h-9 text-xs rounded-lg ${accentButton}`}
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? "Sending…" : mode === "forward" ? "Forward" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// -- Email AI Chat --
type ChatMessage = { role: "user" | "ai"; text: string }

const SUGGESTED_PROMPTS = [
  { text: "Summarize this email", icon: Sparkles },
  { text: "What is the sender asking for?", icon: Eye },
  { text: "Draft a polite reply", icon: Reply },
  { text: "Extract key dates or deadlines", icon: Clock },
  { text: "What action items are mentioned?", icon: CheckCircle2 },
  { text: "Translate this email to Urdu", icon: Forward },
]

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as unknown as { SpeechRecognition?: new () => any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition
    : null

function EmailAiChat({ emailId, attachments, onClose }: { emailId: string; attachments?: { filename: string; content_type: string; size: number; has_text: boolean }[]; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const recognitionRef = useRef<InstanceType<NonNullable<typeof SpeechRecognition>> | null>(null)
  const transcriptRef = useRef("")

  const messagesEndRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const sendMessageRef = useRef<(query: string) => void>(() => {})

  const startVoiceInput = useCallback(() => {
    setVoiceError(null)
    setInput("")
    transcriptRef.current = ""
    if (!SpeechRecognition) {
      setVoiceError("Voice input is not supported in this browser. Try Chrome or Edge.")
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: { results: Iterable<{ [0]: { transcript: string } }> }) => {
      let full = ""
      for (const r of event.results) {
        full += r[0].transcript
      }
      const trimmed = full.trim()
      transcriptRef.current = trimmed
      setInput(trimmed)
    }

    recognition.onerror = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      if (transcriptRef.current.trim()) {
        sendMessageRef.current(transcriptRef.current.trim())
        setInput("")
        transcriptRef.current = ""
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const hasReadableAttachments = attachments?.some((a) => a.has_text) ?? false
  const allPrompts = hasReadableAttachments
    ? [...SUGGESTED_PROMPTS, { text: "Summarize the attached document(s)", icon: FileText }]
    : SUGGESTED_PROMPTS

  const sendMessage = useCallback((query: string) => {
    if (!query.trim() || loading) return
    const userMsg: ChatMessage = { role: "user", text: query.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    aiApi
      .askAboutEmail(emailId, query.trim())
      .then((res) => {
        setMessages((prev) => [...prev, { role: "ai", text: res.answer }])
      })
      .catch((err) => {
        setMessages((prev) => [...prev, { role: "ai", text: err?.message ?? "Something went wrong" }])
      })
      .finally(() => setLoading(false))
  }, [emailId, loading])

  useEffect(() => {
    sendMessageRef.current = sendMessage
  }, [sendMessage])

  const deleteLastMessagePair = useCallback(() => {
    setMessages((prev) => {
      let lastUserIdx = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === "user") {
          lastUserIdx = i
          break
        }
      }
      if (lastUserIdx < 0) return prev
      return prev.slice(0, lastUserIdx).concat(prev.slice(lastUserIdx + 2))
    })
  }, [])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-primary/[0.03]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-semibold text-foreground">AI Chat</span>
            <p className="text-[10px] text-muted-foreground leading-tight">Ask anything about this email</p>
          </div>
          <button onClick={onClose} className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {attachments && attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 border border-border/40">
                <FileText className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="text-[11px] text-foreground/80 truncate flex-1">{att.filename}</span>
                {att.has_text ? (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-green-400/40 text-green-500 shrink-0">readable</Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground shrink-0">no text</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="px-4 py-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">How can I help?</p>
              <p className="text-xs text-muted-foreground mt-1">Ask a question or pick a suggestion below</p>
            </div>
            <div className="space-y-1.5">
              {allPrompts.map((prompt) => {
                const Icon = prompt.icon
                return (
                  <button
                    key={prompt.text}
                    onClick={() => sendMessage(prompt.text)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 text-left hover:bg-primary/5 hover:border-primary/20 transition-all group"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                    <span className="text-xs text-foreground/80 group-hover:text-foreground transition-colors">{prompt.text}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {(() => {
              let lastUserIdx = -1
              for (let j = messages.length - 1; j >= 0; j--) {
                if (messages[j].role === "user") {
                  lastUserIdx = j
                  break
                }
              }
              return messages.map((msg, i) => {
                const isLastUserMessage = msg.role === "user" && i === lastUserIdx
              return (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "ai" && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[82%] flex flex-col items-end gap-1 ${msg.role === "user" ? "" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted/70 text-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {isLastUserMessage && (
                      <button
                        type="button"
                        onClick={deleteLastMessagePair}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            });
            })()}

            {loading && (
              <div className="flex gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                  <Sparkles className="h-3 w-3 text-primary animate-spin" />
                </div>
                <div className="bg-muted/70 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 bg-background">
        {voiceError && (
          <p className="text-xs text-destructive mb-2 px-1">{voiceError}</p>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening…" : "Ask about this email…"}
            disabled={loading}
            readOnly={isListening}
            className="flex-1 h-9 text-sm rounded-full px-4 bg-muted/50 border-border"
          />
          {SpeechRecognition && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "destructive" : "outline"}
              disabled={loading}
              onClick={() => (isListening ? stopVoiceInput() : startVoiceInput())}
              className={`h-9 w-9 rounded-full shrink-0 ${isListening ? "animate-pulse" : ""}`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              <Mic className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-9 rounded-full shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  )
}

// -- Conversation Thread (per-message actions + inline reply) --
type ConversationReply = {
  type: "sent" | "received"
  originalIndex: number
  date: string
  from_name: string
  from_email: string
  to: string
  subject: string
  body: string
  body_html: string
}

function ConversationThread({
  email,
  onEmailRefreshed,
}: {
  email: Email
  onEmailRefreshed?: (email: Email) => void
}) {
  const [inlineReplyIdx, setInlineReplyIdx] = useState<number | null>(null)
  const [inlineReplyBody, setInlineReplyBody] = useState("")
  const [inlineSending, setInlineSending] = useState(false)

  const allReplies: ConversationReply[] = []
  for (let i = 0; i < (email.sentReplies ?? []).length; i++) {
    const r = email.sentReplies![i]
    allReplies.push({ type: "sent", originalIndex: i, date: r.date, from_name: "You", from_email: r.from_email, to: r.to.join(", "), subject: r.subject, body: r.body, body_html: "" })
  }
  for (let i = 0; i < (email.threadReplies ?? []).length; i++) {
    const r = email.threadReplies![i]
    allReplies.push({ type: "received", originalIndex: i, date: r.date, from_name: r.from_name, from_email: r.from_email, to: r.to.map((t) => t.name || t.email).join(", "), subject: r.subject, body: r.body, body_html: r.body_html })
  }
  allReplies.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (!allReplies.length) return null

  const handleDelete = (reply: ConversationReply) => {
    const promise = reply.type === "sent"
      ? emailsApi.deleteSentReply(email.id, reply.originalIndex)
      : emailsApi.deleteThreadReply(email.id, reply.originalIndex)
    promise
      .then((detail) => onEmailRefreshed?.(mapEmailDetailApi(detail)))
      .catch(() => toast.error("Failed to delete reply"))
  }

  const handleForward = (reply: ConversationReply) => {
    const fwdBody = `--- Forwarded reply ---\nFrom: ${reply.from_name} <${reply.from_email}>\nDate: ${new Date(reply.date).toLocaleString()}\n\n${reply.body}`
    navigator.clipboard.writeText(fwdBody)
    toast.success("Reply copied to clipboard for forwarding")
  }

  const handleInlineReplySend = (reply: ConversationReply) => {
    if (!inlineReplyBody.trim()) return
    setInlineSending(true)
    const toAddr = reply.type === "received" ? reply.from_email : reply.to.split(",")[0]?.trim()
    const subject = reply.subject.startsWith("Re: ") ? reply.subject : `Re: ${reply.subject}`
    const quotedDate = new Date(reply.date).toLocaleString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    const quotedBlock = `On ${quotedDate} ${reply.from_name ? `${reply.from_name} ` : ""}<${reply.from_email}> wrote:\n\n${(reply.body || "").split("\n").map((line) => `> ${line}`).join("\n")}`
    const bodyWithQuote = `${inlineReplyBody.trim()}\n\n${quotedBlock}`
    emailsApi
      .reply(email.id, { mailbox_id: email.mailbox, to: [toAddr], subject, body: bodyWithQuote })
      .then((res) => {
        toast.success("Reply sent")
        setInlineReplyIdx(null)
        setInlineReplyBody("")
        if (res?.sent_reply && onEmailRefreshed) {
          const newReply = { ...res.sent_reply, to: res.sent_reply.to || [] }
          onEmailRefreshed({ ...email, sentReplies: [...(email.sentReplies ?? []), newReply] })
        }
        emailsApi.get(email.id).then((detail) => onEmailRefreshed?.(mapEmailDetailApi(detail))).catch(() => {})
      })
      .catch((err) => toast.error(err?.message ?? "Failed to send"))
      .finally(() => setInlineSending(false))
  }

  return (
    <div className="mt-6 space-y-4">
      <Separator />
      <h3 className="text-sm font-medium text-foreground/90">Conversation ({allReplies.length} {allReplies.length === 1 ? "reply" : "replies"})</h3>
      {allReplies.map((reply, idx) => (
        <div key={idx}>
          <div className={`rounded-lg border overflow-hidden ${reply.type === "sent" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
            <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className={`font-medium ${reply.type === "sent" ? "text-primary" : "text-foreground/80"}`}>
                {reply.from_name || reply.from_email}
              </span>
              <span>To: {reply.to}</span>
              <span className="ml-auto">{new Date(reply.date).toLocaleString()}</span>
            </div>
            <div className="px-4 py-3">
              {reply.body_html ? (
                <EmailHtmlFrame html={sanitizeEmailHtml(reply.body_html)} />
              ) : (
                <div className="prose prose-sm prose-invert max-w-none">
                  {reply.body.split("\n").map((line, i) => (
                    <p key={i} className={`leading-relaxed text-sm ${line === "" ? "mt-2" : "mt-1"}`}>
                      {line || "\u00A0"}
                    </p>
                  ))}
                </div>
              )}
            </div>
            {/* Per-message actions */}
            <div className="px-4 py-1.5 border-t border-border flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => { setInlineReplyIdx(inlineReplyIdx === idx ? null : idx); setInlineReplyBody("") }}
              >
                <Reply className="h-3 w-3" />
                Reply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => handleForward(reply)}
              >
                <Forward className="h-3 w-3" />
                Forward
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(reply)}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>

          {/* Inline reply compose below this specific message */}
          {inlineReplyIdx === idx && (
            <div className="ml-4 mt-2 rounded-lg border border-primary/30 bg-card p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Reply className="h-3 w-3 text-primary" />
                <span>Replying to <span className="font-medium text-foreground/80">{reply.from_name || reply.from_email}</span></span>
              </div>
              <textarea
                value={inlineReplyBody}
                onChange={(e) => setInlineReplyBody(e.target.value)}
                placeholder="Write your reply..."
                rows={3}
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setInlineReplyIdx(null)} className="h-7 text-xs text-muted-foreground">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleInlineReplySend(reply)}
                  disabled={inlineSending || !inlineReplyBody.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-7 text-xs"
                >
                  <Send className="h-3 w-3" />
                  {inlineSending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// -- Email Detail --
function EmailDetail({
  email,
  mailboxes,
  initialComposeMode,
  onBack,
  onSnooze,
  onArchive,
  onTrash,
  onSpam,
  onUpdate,
  onEmailRefreshed,
}: {
  email: Email
  mailboxes: Mailbox[]
  initialComposeMode?: ComposeMode | null
  onBack: () => void
  onSnooze: (emailId: string, hours: number) => void
  onArchive: (emailId: string) => void
  onTrash: (emailId: string) => void
  onSpam: (emailId: string) => void
  onUpdate: (emailId: string, data: { read?: boolean; starred?: boolean; labels?: string[] }) => void
  onEmailRefreshed?: (email: Email) => void
}) {
  const [showSnooze, setShowSnooze] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showAiChat, setShowAiChat] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode | null>(null)
  const [sentReply, setSentReply] = useState<string | null>(null)

  useEffect(() => {
    if (initialComposeMode === "reply") {
      setComposeMode("reply")
    }
  }, [initialComposeMode])

  const handleToggleStar = () => {
    onUpdate(email.id, { starred: !email.starred })
  }

  const handleToggleLabel = (label: string) => {
    const current = email.labels || []
    const updated = current.includes(label)
      ? current.filter((l) => l !== label)
      : [...current, label]
    onUpdate(email.id, { labels: updated })
  }

  const handleMarkUnread = () => {
    onUpdate(email.id, { read: false })
    onBack()
  }

  const handleMoreAction = (action: string) => {
    switch (action) {
      case "markUnread": handleMarkUnread(); break
      case "spam": onSpam(email.id); break
      case "delete": onTrash(email.id); break
      case "reply": setComposeMode("reply"); break
      case "forward": setComposeMode("forward"); break
      case "archive": onArchive(email.id); break
      case "star": handleToggleStar(); break
      case "snooze": setShowSnooze(true); break
      case "label": setShowTags(true); break
    }
  }

  const handleComposeSend = (data: { to: string[]; subject: string; body: string }) => {
    const sendData = { mailbox_id: email.mailbox, to: data.to, subject: data.subject, body: data.body }
    const promise =
      composeMode === "forward"
        ? emailsApi.forward(email.id, sendData)
        : emailsApi.reply(email.id, sendData)

    promise
      .then((res) => {
        toast.success(
          composeMode === "forward" ? "Email forwarded" : "Reply sent"
        )
        setComposeMode(null)
        setSentReply("sent")
        if (composeMode !== "forward" && onEmailRefreshed) {
          const sentReply = (res as { sent_reply?: { body: string; subject: string; to: string[]; from_email: string; date: string } })?.sent_reply
          if (sentReply) {
            onEmailRefreshed({ ...email, sentReplies: [...(email.sentReplies ?? []), { ...sentReply, to: sentReply.to || [] }] })
          }
          emailsApi.get(email.id).then((detail) => {
            onEmailRefreshed(mapEmailDetailApi(detail))
          }).catch(() => {})
        }
      })
      .catch((err) => {
        toast.error(err?.message ?? "Failed to send")
      })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${composeMode === "reply" ? "bg-primary/15 text-primary" : "text-foreground"}`}
            title="Reply"
            onClick={() => setComposeMode(composeMode === "reply" ? null : "reply")}
          >
            <Reply className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${composeMode === "forward" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "text-foreground"}`}
            title="Forward"
            onClick={() => setComposeMode(composeMode === "forward" ? null : "forward")}
          >
            <Forward className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground"
            title="Archive"
            onClick={() => onArchive(email.id)}
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground"
            title="Delete"
            onClick={() => onTrash(email.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground"
            title={email.starred ? "Unstar" : "Star"}
            onClick={handleToggleStar}
          >
            <Star className={`h-4 w-4 ${email.starred ? "text-amber-400 fill-amber-400" : ""}`} />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 text-xs ${showAiChat ? "text-primary bg-primary/10" : "text-foreground"}`}
            title="AI Chat"
            onClick={() => setShowAiChat(!showAiChat)}
          >
            <MessageCircle className="h-4 w-4" />
            AI Chat
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground"
              title="More"
              onClick={() => { setShowMore(!showMore); setShowSnooze(false); setShowTags(false) }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {showMore && (
              <MoreMenu
                email={email}
                onAction={handleMoreAction}
                onClose={() => setShowMore(false)}
              />
            )}
            {showSnooze && (
              <SnoozePopover
                onSnooze={(hrs) => onSnooze(email.id, hrs)}
                onClose={() => setShowSnooze(false)}
              />
            )}
            {showTags && (
              <TagPopover
                currentLabels={email.labels}
                onToggle={handleToggleLabel}
                onClose={() => setShowTags(false)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Email Content */}
        <div className={`flex flex-col ${showAiChat ? "flex-1" : "w-full"} overflow-hidden`}>
          <ScrollArea className="flex-1">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{email.subject}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {email.category && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${categoryConfig[email.category].color} border-current/20`}
                      >
                        {categoryConfig[email.category].label}
                      </Badge>
                    )}
                    {email.labels.map((label) => (
                      <Badge key={label} variant="secondary" className="text-xs bg-secondary text-secondary-foreground">
                        {label}
                      </Badge>
                    ))}
                    {email.priority === "high" && (
                      <Badge variant="outline" className="text-xs border-red-400/30 text-red-400">
                        High Priority
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleToggleStar} className="hover:scale-110 transition-transform">
                    <Star className={`h-5 w-5 ${email.starred ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                  </button>
                  {email.hasAttachment && (
                    <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                      <Paperclip className="h-3 w-3 mr-1" />
                      Attachment
                    </Badge>
                  )}
                </div>
              </div>

              {/* AI Overview */}
              {email.aiSummary && (
                <Card className="mb-6 border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">AI Overview</span>
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed">{email.aiSummary}</p>
                    {email.followUp && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3 text-amber-400" />
                        <span className={`font-medium ${email.followUp.status === "overdue" ? "text-red-400" : "text-amber-400"}`}>
                          {email.followUp.status === "overdue" ? "Overdue: " : "Follow-up: "}
                          {email.followUp.suggestedAction}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-start gap-4 mb-6">
                <Avatar className="h-10 w-10">
                  <AvatarFallback
                    className="font-medium"
                    style={{
                      backgroundColor: `${getMailboxColor(email.mailbox, mailboxes)}20`,
                      color: getMailboxColor(email.mailbox, mailboxes),
                    }}
                  >
                    {getInitials(email.from.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{email.from.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{"<"}{email.from.email}{">"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(email.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    To: {email.to.map((t) => t.name).join(", ")}
                  </p>
                </div>
              </div>

              <Separator className="mb-6" />

              <div className="max-w-none">
                {email.bodyIsHtml ? (
                  <EmailHtmlFrame html={sanitizeEmailHtml(email.body)} />
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none">
                    {email.body.split("\n").map((line, i) => (
                      <p key={i} className={`leading-relaxed ${line === "" ? "mt-4" : "mt-1"}`}>
                        {line || "\u00A0"}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="mt-6 border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground/80">{email.attachments.length} Attachment{email.attachments.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {email.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{att.filename}</p>
                          <p className="text-[11px] text-muted-foreground">{formatFileSize(att.size)}</p>
                        </div>
                        {att.has_text && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-400/40 text-green-500 shrink-0">
                            AI readable
                          </Badge>
                        )}
                        <a
                          href={emailsApi.attachmentDownloadUrl(email.id, i)}
                          download={att.filename}
                          onClick={(e) => {
                            e.preventDefault()
                            const token = localStorage.getItem("mailmind_access_token")
                            fetch(emailsApi.attachmentDownloadUrl(email.id, i), {
                              headers: token ? { Authorization: `Bearer ${token}` } : {},
                            })
                              .then((res) => {
                                if (!res.ok) throw new Error("Download failed")
                                return res.blob()
                              })
                              .then((blob) => {
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement("a")
                                a.href = url
                                a.download = att.filename
                                a.click()
                                URL.revokeObjectURL(url)
                              })
                              .catch(() => toast.error("Failed to download attachment"))
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {email.schedulingInfo?.detected && (
                <div className="mt-6">
                  <ScheduleWidget email={email} />
                </div>
              )}

              {/* Conversation thread — sent replies + received replies, chronological */}
              <ConversationThread
                email={email}
                onEmailRefreshed={onEmailRefreshed}
              />
            </div>
          </ScrollArea>

          {/* Compose Panel for Reply / Reply All / Forward */}
          {composeMode && (
            <ComposePanel
              mode={composeMode}
              email={email}
              onSend={handleComposeSend}
              onCancel={() => setComposeMode(null)}
            />
          )}

          {/* Instant Reply Bar */}
          {!composeMode && (
            sentReply ? (
              <div className="border-t border-emerald-400/20 bg-emerald-400/5 px-6 py-3">
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Reply sent successfully
                  <button onClick={() => setSentReply(null)} className="text-xs text-muted-foreground ml-auto hover:text-foreground">
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              <InstantReplyBar email={email} onSend={(text) => setSentReply(text)} />
            )
          )}
        </div>

        {/* AI Chat Panel */}
        {showAiChat && (
          <div className="w-[380px] border-l border-border flex-shrink-0">
            <EmailAiChat emailId={email.id} attachments={email.attachments} onClose={() => setShowAiChat(false)} />
          </div>
        )}
      </div>
    </div>
  )
}

const filterPresetConfig: Record<InboxFilter, { label: string; icon: React.ElementType; activeColor: string }> = {
  today: { label: "Today", icon: Inbox, activeColor: "bg-primary text-primary-foreground" },
  today_unread: { label: "Unread", icon: MailOpen, activeColor: "bg-amber-500 text-white" },
  today_replied: { label: "Replied", icon: Reply, activeColor: "bg-emerald-500 text-white" },
  today_unreplied: { label: "Unreplied", icon: MailX, activeColor: "bg-red-500 text-white" },
  total_unread: { label: "Unread", icon: MailOpen, activeColor: "bg-amber-500 text-white" },
  total_replied: { label: "Replied", icon: Reply, activeColor: "bg-emerald-500 text-white" },
  total_unreplied: { label: "Unreplied", icon: MailX, activeColor: "bg-red-500 text-white" },
}
const todayPresetKeys: InboxFilter[] = ["today", "today_unread", "today_replied", "today_unreplied"]
const totalPresetKeys: InboxFilter[] = ["total_unread", "total_replied", "total_unreplied"]

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function FilterDropdown({
  activeFilter,
  presetCounts,
  onSelect,
  onClear,
  onClose,
}: {
  activeFilter: InboxFilter | null
  presetCounts: Record<InboxFilter, number>
  onSelect: (key: InboxFilter) => void
  onClear: () => void
  onClose: () => void
}) {
  const renderRow = (key: InboxFilter) => {
    const cfg = filterPresetConfig[key]
    const Icon = cfg.icon
    const isActive = activeFilter === key
    return (
      <button
        key={key}
        onClick={() => { onSelect(key); onClose() }}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground hover:bg-muted"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isActive
            ? <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
            : <div className="h-2 w-2 rounded-full border border-border shrink-0" />
          }
          <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          <span>{cfg.label}</span>
        </div>
        <span className={`text-xs tabular-nums ${isActive ? "text-primary/70" : "text-muted-foreground"}`}>
          {presetCounts[key]}
        </span>
      </button>
    )
  }

  return (
    <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-card shadow-lg p-1.5 animate-in fade-in-0 slide-in-from-top-1 duration-150">
      <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Today</p>
      {todayPresetKeys.map(renderRow)}

      <div className="my-1.5 h-px bg-border" />

      <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total</p>
      {totalPresetKeys.map(renderRow)}

      {activeFilter && (
        <>
          <div className="my-1.5 h-px bg-border" />
          <button
            onClick={() => { onClear(); onClose() }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-3 w-3" />
            Clear filter
          </button>
        </>
      )}
    </div>
  )
}

// -- Main Inbox View --
export function InboxView({
  initialFilter,
  onInitialFilterConsumed,
  initialEmailId,
  onInitialEmailConsumed,
  initialComposeMode,
}: {
  initialFilter?: InboxFilter | null
  onInitialFilterConsumed?: () => void
  initialEmailId?: string | null
  onInitialEmailConsumed?: () => void
  initialComposeMode?: "reply" | "forward" | "replyAll" | null
} = {}) {
  const [mailboxesList, setMailboxesList] = useState<Mailbox[]>([])
  const [emailsList, setEmailsList] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMailbox, setFilterMailbox] = useState<string>("all")

  const [snoozedEmails, setSnoozedEmails] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [filterPreset, setFilterPreset] = useState<InboxFilter | null>(initialFilter ?? null)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  const PAGE_SIZE = 50
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const initialLoadDoneRef = useRef(false)

  useEffect(() => {
    if (initialFilter) {
      setFilterPreset(initialFilter)
    }
  }, [initialFilter])

  useEffect(() => {
    if (!initialEmailId) return
    emailsApi
      .get(initialEmailId)
      .then((detail) => {
        setSelectedEmail(mapEmailDetailApi(detail))
        if (!detail.read) {
          emailsApi.update(initialEmailId, { read: true }).then((updated) => {
            setSelectedEmail(mapEmailDetailApi(updated))
            setEmailsList((prev) =>
              prev.map((e) => (e.id === initialEmailId ? { ...e, read: true } : e))
            )
          }).catch(() => {})
        }
      })
      .catch(() => {})
    onInitialEmailConsumed?.()
  }, [initialEmailId, onInitialEmailConsumed])

  const clearFilterPreset = useCallback(() => {
    setFilterPreset(null)
    onInitialFilterConsumed?.()
  }, [onInitialFilterConsumed])

  // Actual total from backend (per mailbox or sum when "all"); fallback to loaded list count
  const totalFromMailboxes =
    filterMailbox === "all"
      ? mailboxesList.reduce((s, m) => s + (m.totalEmails ?? 0), 0)
      : (mailboxesList.find((m) => m.id === filterMailbox)?.totalEmails ?? 0)
  const loadedCount = emailsList.filter((e) => !snoozedEmails.has(e.id)).length
  const allCount = totalFromMailboxes > 0 ? totalFromMailboxes : loadedCount
  // displayedCount reflects the actual visible emails after mailbox/search/filter
  const displayedCount = (() => {
    let list = emailsList.filter((e) => !snoozedEmails.has(e.id))
    if (filterMailbox !== "all") list = list.filter((e) => e.mailbox === filterMailbox)
    return list.length
  })()

  const fetchMailboxesAndEmails = useCallback((mailboxId?: string) => {
    const mbFilter = mailboxId ?? filterMailbox
    const listParams: { limit: number; offset: number; mailbox_id?: string } = { limit: PAGE_SIZE, offset: 0 }
    if (mbFilter !== "all") listParams.mailbox_id = mbFilter
    return Promise.all([
      mailboxesApi.list().then((list) => setMailboxesList(list.map(mapMailboxApi))).catch(() => {}),
      emailsApi
        .list(listParams)
        .then((list) => {
          setEmailsList(list.map(mapEmailListApi))
          setHasMore(list.length >= PAGE_SIZE)
        })
        .catch(() => {}),
    ])
  }, [filterMailbox])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const listParams: { limit: number; offset: number; mailbox_id?: string } = { limit: PAGE_SIZE, offset: emailsList.length }
    if (filterMailbox !== "all") listParams.mailbox_id = filterMailbox
    emailsApi
      .list(listParams)
      .then((list) => {
        const mapped = list.map(mapEmailListApi)
        setEmailsList((prev) => [...prev, ...mapped])
        setHasMore(list.length >= PAGE_SIZE)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [loadingMore, hasMore, emailsList.length, filterMailbox])

  useEffect(() => {
    const isMailboxSwitch = initialLoadDoneRef.current
    if (isMailboxSwitch) {
      const totalForSelected =
        filterMailbox === "all"
          ? mailboxesList.reduce((s, m) => s + (m.totalEmails ?? 0), 0)
          : (mailboxesList.find((m) => m.id === filterMailbox)?.totalEmails ?? 0)
      if (totalForSelected === 0) {
        setLoading(false)
        fetchMailboxesAndEmails().then(() => {})
        return
      }
      setLoading(true)
    }
    fetchMailboxesAndEmails().finally(() => {
      setLoading(false)
      initialLoadDoneRef.current = true
    })
  }, [fetchMailboxesAndEmails])

  const handleRefresh = useCallback(() => {
    if (refreshing) return
    setRefreshing(true)
    const toSync =
      filterMailbox === "all"
        ? mailboxesList.map((mb) => mailboxesApi.sync(mb.id))
        : [mailboxesApi.sync(filterMailbox)]
    Promise.all(toSync)
      .then((results) => {
        const totalSynced = results.reduce((s, r) => s + (r?.synced ?? 0), 0)
        const totalThreadReplies = results.reduce((s, r) => s + ((r as Record<string, number>)?.thread_replies_added ?? 0), 0)
        setHasMore(true)
        return fetchMailboxesAndEmails().then(() => ({ totalSynced, totalThreadReplies }))
      })
      .then(({ totalSynced, totalThreadReplies }) => {
        if (totalSynced > 0 || totalThreadReplies > 0) {
          const parts: string[] = []
          if (totalSynced > 0) parts.push(`${totalSynced} new email(s)`)
          if (totalThreadReplies > 0) parts.push(`${totalThreadReplies} new reply(s)`)
          toast.success(`Synced. ${parts.join(", ")}.`)
          if (totalSynced > 0) {
            window.dispatchEvent(new CustomEvent("email:sync", { detail: { newCount: totalSynced } }))
          }
        } else {
          toast.success("Inbox is up to date.")
        }
      })
      .catch((err) => {
        toast.error(err?.message ?? "Sync failed")
      })
      .finally(() => setRefreshing(false))
  }, [refreshing, filterMailbox, mailboxesList, fetchMailboxesAndEmails])

  const handleStopSync = useCallback(() => {
    const targets =
      filterMailbox === "all"
        ? mailboxesList.map((mb) => mb.id)
        : [filterMailbox]
    Promise.all(targets.map((id) => mailboxesApi.stopSync(id)))
      .then(() => {
        toast.success("Sync stopped")
        setRefreshing(false)
        fetchMailboxesAndEmails()
      })
      .catch(() => {
        setRefreshing(false)
      })
  }, [filterMailbox, mailboxesList, fetchMailboxesAndEmails])

  // Listen for global auto-sync completing — refresh inbox data
  useEffect(() => {
    const onAutoSync = () => { fetchMailboxesAndEmails() }
    window.addEventListener("mailbox:sync-complete", onAutoSync)
    return () => window.removeEventListener("mailbox:sync-complete", onAutoSync)
  }, [fetchMailboxesAndEmails])

  // Auto-refresh every 5 minutes so new emails from Gmail etc. show up
  useEffect(() => {
    const interval = setInterval(handleRefresh, 1 * 60 * 1000)
    return () => clearInterval(interval)
  }, [handleRefresh])

  useEffect(() => {
    const onMailboxUpdated = () => {
      mailboxesApi.list().then((list) => setMailboxesList(list.map(mapMailboxApi))).catch(() => {})
    }
    window.addEventListener("mailbox:updated", onMailboxUpdated)
    return () => window.removeEventListener("mailbox:updated", onMailboxUpdated)
  }, [])

  const handleSelectEmail = useCallback((email: Email) => {
    emailsApi
      .get(email.id)
      .then((detail) => {
        setSelectedEmail(mapEmailDetailApi(detail))
        if (!email.read) {
          emailsApi.update(email.id, { read: true }).then((updated) => {
            setSelectedEmail(mapEmailDetailApi(updated))
            setEmailsList((prev) =>
              prev.map((e) => (e.id === email.id ? { ...e, read: true } : e))
            )
            window.dispatchEvent(new CustomEvent("email:read", { detail: { mailboxId: email.mailbox } }))
          }).catch(() => {})
        }
      })
      .catch(() => setSelectedEmail(email))
  }, [])

  const handleSnooze = useCallback((emailId: string, hours: number) => {
    emailsApi
      .snooze(emailId, hours)
      .then(() => {
        setSnoozedEmails((prev) => new Set(prev).add(emailId))
        setSelectedEmail(null)
        toast.success("Email snoozed")
      })
      .catch(() => {})
  }, [])

  const refreshMailboxCounts = useCallback(() => {
    mailboxesApi.list().then((list) => setMailboxesList(list.map(mapMailboxApi))).catch(() => {})
  }, [])

  const handleArchive = useCallback((emailId: string) => {
    emailsApi.archive(emailId).then(() => {
      setEmailsList((prev) => prev.filter((e) => e.id !== emailId))
      setSelectedEmail(null)
      toast.success("Email archived")
      refreshMailboxCounts()
    }).catch(() => {})
  }, [refreshMailboxCounts])

  const handleTrash = useCallback((emailId: string) => {
    emailsApi.trash(emailId).then(() => {
      setEmailsList((prev) => prev.filter((e) => e.id !== emailId))
      setSelectedEmail(null)
      toast.success("Email deleted")
      refreshMailboxCounts()
    }).catch(() => {})
  }, [refreshMailboxCounts])

  const handleSpam = useCallback((emailId: string) => {
    emailsApi.spam(emailId).then(() => {
      setEmailsList((prev) => prev.filter((e) => e.id !== emailId))
      setSelectedEmail(null)
      toast.success("Reported as spam")
      refreshMailboxCounts()
    }).catch((err) => {
      toast.error(err?.message ?? "Failed to report spam")
    })
  }, [refreshMailboxCounts])

  const handleUpdate = useCallback((emailId: string, data: { read?: boolean; starred?: boolean; labels?: string[] }) => {
    emailsApi.update(emailId, data).then((updated) => {
      const mapped = mapEmailDetailApi(updated)
      setSelectedEmail((prev) => prev && prev.id === emailId ? mapped : prev)
      setEmailsList((prev) =>
        prev.map((e) =>
          e.id === emailId
            ? { ...e, ...data }
            : e
        )
      )
    }).catch((err) => {
      toast.error(err?.message ?? "Update failed")
    })
  }, [])

  const activeEmails = emailsList.filter((e) => !snoozedEmails.has(e.id))
  const todayAll = activeEmails.filter((e) => isToday(e.date))
  const presetCounts: Record<InboxFilter, number> = {
    today: todayAll.length,
    today_unread: todayAll.filter((e) => !e.read).length,
    today_replied: todayAll.filter((e) => !!e.repliedAt).length,
    today_unreplied: todayAll.filter((e) => !e.repliedAt).length,
    total_unread: activeEmails.filter((e) => !e.read).length,
    total_replied: activeEmails.filter((e) => !!e.repliedAt).length,
    total_unreplied: activeEmails.filter((e) => !e.repliedAt).length,
  }

  const filteredEmails = emailsList.filter((email) => {
    if (snoozedEmails.has(email.id)) return false
    const matchesSearch =
      searchQuery === "" ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMailbox = filterMailbox === "all" || email.mailbox === filterMailbox


    let matchesPreset = true
    if (filterPreset === "today") {
      matchesPreset = isToday(email.date)
    } else if (filterPreset === "today_unread") {
      matchesPreset = isToday(email.date) && !email.read
    } else if (filterPreset === "today_replied") {
      matchesPreset = isToday(email.date) && !!email.repliedAt
    } else if (filterPreset === "today_unreplied") {
      matchesPreset = isToday(email.date) && !email.repliedAt
    } else if (filterPreset === "total_unread") {
      matchesPreset = !email.read
    } else if (filterPreset === "total_replied") {
      matchesPreset = !!email.repliedAt
    } else if (filterPreset === "total_unreplied") {
      matchesPreset = !email.repliedAt
    }

    return matchesSearch && matchesMailbox && matchesPreset
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header — always visible */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Inbox className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">Inbox</h1>
              <p className="text-xs text-muted-foreground">{allCount} emails</p>
            </div>
          </div>
          {refreshing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopSync}
              title="Stop syncing"
              className="border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-400 gap-1.5 h-8 text-xs"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              title="Fetch new emails from your mailbox"
              className="border-border text-foreground gap-1.5 h-8 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {selectedEmail ? (
        <div className="flex-1 overflow-hidden">
          <EmailDetail
            email={selectedEmail}
            mailboxes={mailboxesList}
            initialComposeMode={initialComposeMode === "reply" ? "reply" : null}
            onBack={() => setSelectedEmail(null)}
            onSnooze={handleSnooze}
            onArchive={handleArchive}
            onTrash={handleTrash}
            onSpam={handleSpam}
            onUpdate={handleUpdate}
            onEmailRefreshed={(updated) => setSelectedEmail(updated)}
          />
        </div>
      ) : (
        <>
          {/* Mailbox Tabs */}
          <div className="flex items-center gap-1.5 border-b border-border px-5 py-2 overflow-x-auto">
            <Button
              variant={filterMailbox === "all" ? "default" : "ghost"}
              size="sm"
              className={`text-xs h-7 rounded-full ${filterMailbox === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              onClick={() => setFilterMailbox("all")}
            >
              All mailboxes
            </Button>
            {mailboxesList.map((mb) => (
              <Button
                key={mb.id}
                variant={filterMailbox === mb.id ? "default" : "ghost"}
                size="sm"
                className={`text-xs h-7 gap-1.5 rounded-full ${filterMailbox === mb.id ? "text-primary-foreground" : "text-muted-foreground"}`}
                style={filterMailbox === mb.id ? { backgroundColor: mb.color } : undefined}
                onClick={() => setFilterMailbox(mb.id)}
              >
                <Circle className="h-2 w-2" fill={mb.color} stroke={mb.color} />
                {mb.name}
                {mb.totalEmails != null && (
                  <span className={`text-[10px] font-normal ${filterMailbox === mb.id ? "opacity-80" : "opacity-60"}`}>
                    {mb.totalEmails}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Filter */}
          <div className="relative flex items-center gap-1 border-b border-border px-4 py-2">
            <div className="relative shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`gap-1 h-7 text-xs rounded-full ${filterPreset ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Filter className={`h-3 w-3 ${filterPreset ? "text-primary" : ""}`} />
                {filterPreset
                  ? filterPresetConfig[filterPreset].label
                  : "Filter"}
                <ChevronDown className={`h-3 w-3 transition-transform ${showFilterDropdown ? "rotate-180" : ""}`} />
              </Button>
              {filterPreset && (
                <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card" />
              )}
              {showFilterDropdown && (
                <FilterDropdown
                  activeFilter={filterPreset}
                  presetCounts={presetCounts}
                  onSelect={setFilterPreset}
                  onClear={clearFilterPreset}
                  onClose={() => setShowFilterDropdown(false)}
                />
              )}
            </div>
          </div>

          {/* Email List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex flex-1 items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
            <>
            <div className="divide-y divide-border">
              {filteredEmails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  mailboxes={mailboxesList}
                  isSelected={false}
                  onSelect={() => handleSelectEmail(email)}
                  showMailbox={filterMailbox === "all"}
                />
              ))}
            </div>
              {filteredEmails.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No emails found</p>
                  <p className="text-xs mt-1">Try adjusting your filters</p>
                </div>
              )}
              {hasMore && filteredEmails.length > 0 && !filterPreset && !searchQuery && displayedCount < allCount && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <p className="text-xs text-muted-foreground">
                    Showing {displayedCount} of {allCount} emails
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="gap-1.5 text-xs"
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more emails"
                    )}
                  </Button>
                </div>
              )}
              {(!hasMore || displayedCount >= allCount) && filteredEmails.length > 0 && (
                <div className="flex items-center justify-center py-4">
                  <p className="text-xs text-muted-foreground">All {displayedCount} emails loaded</p>
                </div>
              )}
            </>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  )
}
