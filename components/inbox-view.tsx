"use client"

import { useState, useCallback, useEffect, useRef, type MouseEvent } from "react"
import Image from "next/image"
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
  ChevronLeft,
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
  CheckSquare,
  RefreshCw,
  Square,
  StarOff,
  Zap,
  Inbox,
  MailOpen,
  MailCheck,
  MailX,
  FileText,
  Download,
  Mail,
  SlidersHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  emails as emailsApi,
  mailboxes as mailboxesApi,
  compose as composeApi,
  ai as aiApi,
  settingsApi,
  getStoredUser,
  type EmailStatsApi,
  type FolderCountsApi,
  type UniqueSendersApi,
  type SettingsApi,
} from "@/lib/api"
import { mapEmailListApi, mapEmailDetailApi, mapMailboxApi } from "@/lib/mappers"
import type { Email, EmailCategory, Mailbox } from "@/lib/mock-data"
import { format } from "date-fns"
import type { InboxFilter } from "@/components/daily-briefing"
import { ConnectMailboxCta } from "@/components/connect-mailbox-cta"
import { sanitizeEmailHtml } from "@/lib/sanitize-html"
import { LABELS_UPDATED_EVENT, type LabelsUpdatedDetail } from "@/lib/labels-events"
import smartMailLogo from "@/logo/Smart Mail Logo.png"
import smartMailLogoWhite from "@/logo/Smart Mail Logo White.png"

function EmailListSkeleton() {
  return (
    <div className="space-y-2 px-3 py-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-4 shadow-sm"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 rounded-md" style={{ width: `${100 + Math.random() * 80}px` }} />
              <Skeleton className="h-3 w-12 rounded-md" />
            </div>
            <Skeleton className="h-4 rounded-md" style={{ width: `${180 + Math.random() * 120}px` }} />
            <Skeleton className="h-3 rounded-md" style={{ width: `${220 + Math.random() * 100}px` }} />
            <div className="flex items-center gap-2 pt-0.5">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

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

/** Full calendar date for “received on” column (right side of list row). */
function formatReceivedDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return "—"
    return format(d, "MMM d, yyyy")
  } catch {
    return "—"
  }
}

/** Display-only fix for common “metting” → “meeting” typo */
function fixMettingTypo(text: string) {
  return text.replace(/\bmetting\b/gi, (word) => (word === "Metting" ? "Meeting" : "meeting"))
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

const INBOX_ROW_ACTION = "[data-inbox-row-action]"

function EmailListItem({
  email,
  mailboxes,
  isSelected,
  isChecked,
  onToggleChecked,
  onMarkRead,
  onMarkUnread,
  onStar,
  onDelete,
  onMoveToInbox,
  onSelect,
  showMailbox = false,
  index = 0,
  deleteTooltip = "Delete",
}: {
  email: Email
  mailboxes: Mailbox[]
  isSelected: boolean
  isChecked: boolean
  onToggleChecked: () => void
  onMarkRead: () => void
  onMarkUnread: () => void
  onStar: () => void
  onDelete: () => void
  onSelect: () => void
  showMailbox?: boolean
  index?: number
  /** Toolbar + row delete control (e.g. "Delete forever" in Trash). */
  deleteTooltip?: string
  onMoveToInbox?: () => void
}) {
  const mb = showMailbox ? mailboxes.find((m) => m.id === email.mailbox) : null
  const mbColor = getMailboxColor(email.mailbox, mailboxes)

  const receivedAt =
    email.date && String(email.date).trim() !== ""
      ? email.date
      : email.repliedAt ?? ""

  const handleRowClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(INBOX_ROW_ACTION)) return
    onSelect()
  }

  return (
    <div
      onClick={handleRowClick}
      className={`email-list-item group relative grid w-full min-w-0 max-w-full cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)_auto] items-start gap-2 px-3 py-2.5 text-left transition-all duration-300 rounded-xl border shadow-sm overflow-hidden sm:gap-3 sm:px-4 sm:py-3.5 ${
        isSelected
          ? "bg-primary/[0.07] border-primary/35 shadow-[0_6px_24px_hsl(var(--primary)/0.08)]"
          : email.read
            ? "bg-card/50 border-border/50 hover:bg-muted/30 hover:border-border/80 hover:shadow-md"
            : "bg-primary/[0.04] border-primary/20 hover:bg-primary/[0.08] hover:border-primary/35 hover:shadow-md"
      } ${isChecked ? "ring-1 ring-primary/25" : ""}`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div
        data-inbox-row-action
        className="flex shrink-0 items-start pt-1 sm:pt-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onToggleChecked()}
          aria-label={isChecked ? "Deselect email" : "Select email"}
          className="border-muted-foreground/40 data-[state=checked]:border-primary"
        />
      </div>

      <div className="relative shrink-0">
        {!email.read && (
          <div className="absolute -left-0.5 top-2 z-[1] sm:top-2.5">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" />
          </div>
        )}
        <Avatar className="mt-0.5 h-9 w-9 shrink-0 ring-2 ring-transparent transition-all duration-200 group-hover:ring-primary/10 sm:h-10 sm:w-10">
          <AvatarFallback
            className="text-xs font-semibold"
            style={{
              backgroundColor: `${mbColor}15`,
              color: mbColor,
            }}
          >
            {getInitials(email.from.name)}
          </AvatarFallback>
        </Avatar>
        {email.priority === "high" && (
          <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
            <span className="text-[7px] text-white font-bold">!</span>
          </div>
        )}
      </div>

      <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[13px] truncate ${!email.read ? "font-semibold text-foreground" : "font-medium text-foreground/75"}`}>
              {email.from.name}
            </span>
            {mb && (
              <span
                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-semibold uppercase tracking-wide"
                style={{ backgroundColor: `${mb.color}12`, color: mb.color }}
              >
                <Circle className="h-1.5 w-1.5 shrink-0" fill={mb.color} stroke={mb.color} />
                {mb.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[13px] truncate ${!email.read ? "font-medium text-foreground" : "text-foreground/65"}`}>
              {fixMettingTypo(email.subject)}
            </span>
          </div>

          {email.aiSummary && (
            <p className="text-[11px] text-primary/60 truncate mt-0.5 flex items-center gap-1.5">
              <Sparkles className="h-2.5 w-2.5 shrink-0 text-primary/50" />
              <span className="truncate">{email.aiSummary}</span>
            </p>
          )}

          {email.preview ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground/75 sm:text-xs sm:line-clamp-1">
              {email.preview}
            </p>
          ) : null}

          <div className="mt-1.5 flex flex-wrap items-center gap-1 sm:mt-2 sm:gap-1.5">
          <SentimentDot score={email.sentimentScore} />
          {email.hasAttachment && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded-md">
              <Paperclip className="h-2.5 w-2.5" />
            </span>
          )}
          {/* Priority badge — always shown */}
          {email.priority === "high" ? (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-red-400/30 text-red-400 bg-red-400/5 font-semibold uppercase tracking-wide">
              high
            </Badge>
          ) : email.priority === "low" ? (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-400/30 text-emerald-500 bg-emerald-400/5 font-semibold uppercase tracking-wide">
              low
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-400/30 text-blue-400 bg-blue-400/5 font-semibold uppercase tracking-wide">
              medium
            </Badge>
          )}
          {email.followUp && email.followUp.status === "overdue" && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-orange-400/30 text-orange-400 bg-orange-400/5 font-semibold uppercase tracking-wide">
              overdue
            </Badge>
          )}
          {email.schedulingInfo?.detected && (
            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded-md">
              <CalendarPlus className="h-2.5 w-2.5" />
            </span>
          )}
          {email.threadCount && email.threadCount > 1 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-md font-medium tabular-nums">
              <MessageCircle className="h-2.5 w-2.5" />
              {email.threadCount}
            </span>
          )}
          {/* User-defined label badges — fewer on narrow screens */}
          {email.labels.slice(0, 2).map((label) => (
            <Badge key={label} variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/8 text-primary border border-primary/15 font-medium max-w-[7rem] truncate sm:max-w-none">
              {label}
            </Badge>
          ))}
          {email.labels.length > 2 && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium text-muted-foreground md:hidden">
              +{email.labels.length - 2}
            </Badge>
          )}
          {email.labels.length > 2 &&
            email.labels.slice(2, 3).map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="hidden text-[9px] px-1.5 py-0 font-medium md:inline-flex bg-primary/8 text-primary border border-primary/15"
              >
                {label}
              </Badge>
            ))}
        </div>
      </div>

      {/* Read/unread, star, delete, and received date — dedicated grid column */}
      <div className="flex w-[7.5rem] shrink-0 flex-col items-end justify-start gap-1 border-l border-border/50 pl-1.5 text-right sm:w-[8.5rem] sm:pl-3">
        <div className="flex flex-wrap items-center justify-end gap-0.5" data-inbox-row-action onClick={(e) => e.stopPropagation()}>
          {!email.read ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary sm:h-8 sm:w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkRead()
                  }}
                  aria-label="Mark as read"
                >
                  <MailCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Mark as read</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground sm:h-8 sm:w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkUnread()
                  }}
                  aria-label="Mark as unread"
                >
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Mark as unread</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted/80 hover:text-amber-500 sm:h-8 sm:w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onStar()
                }}
                aria-label={email.starred ? "Remove star" : "Star"}
              >
                <Star
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all duration-200 ${
                    email.starred
                      ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.45)]"
                      : ""
                  }`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{email.starred ? "Remove star" : "Star"}</p>
            </TooltipContent>
          </Tooltip>
          {onMoveToInbox && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary sm:h-8 sm:w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveToInbox()
                  }}
                  aria-label="Move to Inbox"
                >
                  <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Move to Inbox</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                aria-label={deleteTooltip}
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{deleteTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center justify-end gap-0.5">
          <span className="text-[11px] font-semibold tabular-nums text-foreground">
            {receivedAt ? formatTime(receivedAt) : "—"}
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>
        <span
          className="text-[10px] leading-tight text-muted-foreground"
          title={
            receivedAt
              ? new Date(receivedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : undefined
          }
        >
          {receivedAt ? `Received ${formatReceivedDate(receivedAt)}` : "No date"}
        </span>
      </div>
    </div>
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

function applySuggestedTimeToDate(base: Date, timeStr: string | undefined): Date {
  const d = new Date(base)
  if (!timeStr?.trim()) {
    d.setHours(9, 0, 0, 0)
    return d
  }
  const t = timeStr.trim()
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (m) {
    let h = parseInt(m[1], 10)
    const min = parseInt(m[2], 10)
    const ap = m[4]?.toLowerCase()
    if (ap === "pm" && h < 12) h += 12
    if (ap === "am" && h === 12) h = 0
    d.setHours(h, min, 0, 0)
    return d
  }
  const combined = new Date(`${format(d, "yyyy-MM-dd")} ${t}`)
  if (!Number.isNaN(combined.getTime())) return combined
  d.setHours(9, 0, 0, 0)
  return d
}

// -- Schedule from Email Widget --
/**
 * Shown above an opened email when the sync detected a meeting.
 * The user must explicitly confirm ("Add to my calendar") or dismiss —
 * detections never land on the calendar automatically.
 */
function ScheduleWidget({
  email,
  onStatusChange,
}: {
  email: Email
  onStatusChange?: (status: "added" | "dismissed") => void
}) {
  const initialStatus = email.schedulingInfo?.status ?? "pending"
  const [status, setStatus] = useState<"pending" | "added" | "dismissed">(initialStatus)
  const [busy, setBusy] = useState<"add" | "dismiss" | null>(null)

  useEffect(() => {
    setStatus(email.schedulingInfo?.status ?? "pending")
  }, [email.schedulingInfo?.status, email.id])

  if (!email.schedulingInfo?.detected) return null
  if (status === "dismissed") return null

  const info = email.schedulingInfo
  const startDate = info.startIso
    ? new Date(info.startIso)
    : info.suggestedDate
      ? applySuggestedTimeToDate(new Date(info.suggestedDate), info.suggestedTime)
      : null
  const endDate = info.endIso ? new Date(info.endIso) : null
  const hasTimes = !!startDate && !Number.isNaN(startDate.getTime())

  const handleAdd = async () => {
    setBusy("add")
    try {
      const res = await emailsApi.addMeeting(email.id)
      toast.success("Added to your calendar")
      setStatus("added")
      onStatusChange?.("added")
      window.dispatchEvent(new CustomEvent("calendar:updated"))
      window.dispatchEvent(
        new CustomEvent("meetings:updated", {
          detail: { emailId: email.id, meetingId: res?.meeting?.id, action: "added" },
        }),
      )
    } catch (e) {
      toast.error((e as Error).message || "Could not add this meeting")
    } finally {
      setBusy(null)
    }
  }

  const handleDismiss = async () => {
    setBusy("dismiss")
    try {
      await emailsApi.dismissMeeting(email.id)
      setStatus("dismissed")
      onStatusChange?.("dismissed")
      window.dispatchEvent(
        new CustomEvent("meetings:updated", {
          detail: { emailId: email.id, action: "dismissed" },
        }),
      )
    } catch (e) {
      toast.error((e as Error).message || "Could not dismiss")
    } finally {
      setBusy(null)
    }
  }

  const formatRange = () => {
    if (!startDate || Number.isNaN(startDate.getTime())) return "No date detected"
    const dateStr = startDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    const timeStr = startDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    let out = `${dateStr} · ${timeStr}`
    if (endDate && !Number.isNaN(endDate.getTime())) {
      out += ` – ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
    }
    return out
  }

  return (
    <div className="rounded-lg border border-indigo-400/30 bg-indigo-400/5 p-4">
      <div className="flex items-center gap-2 mb-1">
        <CalendarPlus className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-semibold text-indigo-400">Meeting detected</span>
        {status === "added" && (
          <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-500 bg-emerald-400/5 font-medium">
            added
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        {status === "added"
          ? "This meeting is on your calendar. You can remove it from Calendar any time."
          : "Smart Mail AI found a meeting in this email. Do you want to add it to your calendar?"}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <span className="text-muted-foreground">Title</span>
          <p className="text-foreground font-medium truncate">{info.title || email.subject || "Meeting"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">When</span>
          <p className="text-foreground font-medium">{formatRange()}</p>
        </div>
        {info.location && (
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Location</span>
            <p className="text-foreground font-medium truncate">{info.location}</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Attendees</span>
          <p className="text-foreground font-medium">{info.attendees?.length || 0} people</p>
        </div>
      </div>

      {status === "pending" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="bg-indigo-500 text-white hover:bg-indigo-600 gap-1.5 h-7 text-xs"
            disabled={busy !== null || !hasTimes}
            onClick={handleAdd}
          >
            {busy === "add" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
            Add to my calendar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            disabled={busy !== null}
            onClick={handleDismiss}
          >
            <X className="h-3 w-3" />
            No, ignore
          </Button>
          {!hasTimes && (
            <span className="text-[11px] text-amber-500/90">
              Couldn&apos;t read the date/time — open Calendar to add manually.
            </span>
          )}
        </div>
      )}

      {status === "added" && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Added to your calendar
        </div>
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
function TagPopover({
  currentLabels,
  availableLabels,
  onToggle,
  onClose,
}: {
  currentLabels: string[]
  availableLabels: string[]
  onToggle: (label: string) => void
  onClose: () => void
}) {
  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-border bg-card shadow-lg p-1.5 animate-in fade-in-0 slide-in-from-top-1 duration-150">
      <p className="px-2 py-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Labels</p>
      {availableLabels.length === 0 && (
        <p className="px-2 py-3 text-xs text-muted-foreground text-center">No labels created yet. Go to Labels settings to create labels.</p>
      )}
      {availableLabels.map((label) => {
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
  folder = "inbox",
  onAction,
  onClose,
}: {
  email: Email
  folder?: string
  onAction: (action: string) => void
  onClose: () => void
}) {
  const inTrashFolder = folder === "trash"
  const inArchiveFolder = folder === "archive"
  const inSpamFolder = folder === "spam"
  const inSnoozedFolder = folder === "snoozed"
  const items: { key: string; label: string; icon: React.ElementType; className?: string; separator?: boolean }[] = [
    ...(inTrashFolder || inArchiveFolder || inSpamFolder || inSnoozedFolder ? [{ key: "moveToInbox", label: "Move to Inbox", icon: Inbox }] : []),
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
        tone: "professional",
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
    <div className={`border-t-2 ${accentBorder} ${accentBg} rounded-t-lg`}>
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

function EmailAiChat({ emailId, attachments, onClose }: { emailId: string; attachments?: { filename: string; content_type: string; size: number; has_text: boolean }[]; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const messagesEndRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const sendMessageRef = useRef<(query: string) => void>(() => {})

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
            <Image src={smartMailLogo} alt="AI Chat" className="h-4 w-4 object-contain" />
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
                      <Image src={smartMailLogo} alt="Assistant" className="h-3.5 w-3.5 object-contain" />
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
                  <Image src={smartMailLogo} alt="Assistant loading" className="h-3.5 w-3.5 object-contain animate-spin" />
                </div>
                <div className="bg-muted/70 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <p className="text-xs text-muted-foreground mb-1">Thinking about your request...</p>
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
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this email…"
            disabled={loading}
            className="flex-1 h-9 text-sm rounded-full px-4 bg-muted/50 border-border"
          />
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
  userLabels,
  onBack,
  onSnooze,
  onArchive,
  onTrash,
  onSpam,
  onUpdate,
  onEmailRefreshed,
  onMoveToInbox,
  folder = "inbox",
  onPermanentDelete,
}: {
  email: Email
  mailboxes: Mailbox[]
  initialComposeMode?: ComposeMode | null
  userLabels: string[]
  onBack: () => void
  onSnooze: (emailId: string, hours: number) => void
  onArchive: (emailId: string) => void
  onTrash: (emailId: string) => void
  onSpam: (emailId: string) => void
  onUpdate: (emailId: string, data: { read?: boolean; starred?: boolean; labels?: string[] }) => void
  onEmailRefreshed?: (email: Email) => void
  onMoveToInbox?: (emailId: string) => void
  /** Current folder; in Trash, delete moves to permanent delete instead of trash. */
  folder?: string
  onPermanentDelete?: (emailId: string) => void
}) {
  const [showSnooze, setShowSnooze] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showAiChat, setShowAiChat] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode | null>(null)
  const [sentReply, setSentReply] = useState<string | null>(null)
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false)
  const detailScrollRef = useRef<HTMLDivElement>(null)
  const inTrashFolder = folder === "trash" && Boolean(onPermanentDelete)

  useEffect(() => {
    if (initialComposeMode === "reply") {
      setComposeMode("reply")
    }
  }, [initialComposeMode])

  useEffect(() => {
    if ((email.threadReplies?.length ?? 0) === 0 && (email.sentReplies?.length ?? 0) === 0) return
    const root = detailScrollRef.current
    if (!root) return

    const scrollToBottom = () => {
      const viewport = root.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null
      if (!viewport) return
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" })
    }

    requestAnimationFrame(scrollToBottom)
    const timer = window.setTimeout(scrollToBottom, 250)
    return () => window.clearTimeout(timer)
  }, [email.id, email.threadReplies?.length, email.sentReplies?.length])

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
      case "delete":
        if (inTrashFolder && onPermanentDelete) setPermanentDeleteOpen(true)
        else onTrash(email.id)
        break
      case "reply": setComposeMode("reply"); break
      case "forward": setComposeMode("forward"); break
      case "archive": onArchive(email.id); break
      case "moveToInbox":
        onMoveToInbox?.(email.id)
        break
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
    <TooltipProvider delayDuration={300}>
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b border-border/60 bg-gradient-to-r from-background to-muted/20 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-4 sm:py-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label="Back to Inbox"
          className="h-10 shrink-0 gap-2 rounded-lg text-muted-foreground transition-all duration-200 hover:text-foreground sm:h-8"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="text-xs">Back to Inbox</span>
        </Button>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:justify-start sm:gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 min-h-11 min-w-11 rounded-lg transition-all duration-200 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 ${composeMode === "reply" ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                onClick={() => setComposeMode(composeMode === "reply" ? null : "reply")}
                aria-label="Reply"
              >
                <Reply className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">Reply</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 min-h-11 min-w-11 rounded-lg transition-all duration-200 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 ${composeMode === "forward" ? "bg-violet-500/15 text-violet-600 shadow-sm dark:text-violet-400" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                onClick={() => setComposeMode(composeMode === "forward" ? null : "forward")}
                aria-label="Forward"
              >
                <Forward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">Forward</p></TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:mx-1.5 sm:block" />

          {(inTrashFolder || folder === "archive" || folder === "spam" || folder === "snoozed") && onMoveToInbox && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 min-h-11 min-w-11 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                  onClick={() => onMoveToInbox(email.id)}
                  aria-label="Move to Inbox"
                >
                  <Inbox className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Move to Inbox</p></TooltipContent>
            </Tooltip>
          )}

          {folder !== "archive" && folder !== "spam" && folder !== "snoozed" && !inTrashFolder && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 min-h-11 min-w-11 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                  onClick={() => onArchive(email.id)}
                  aria-label="Archive"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Archive</p></TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 min-h-11 min-w-11 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                onClick={() =>
                  inTrashFolder && onPermanentDelete
                    ? setPermanentDeleteOpen(true)
                    : onTrash(email.id)
                }
                aria-label={inTrashFolder ? "Delete forever" : "Delete"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{inTrashFolder ? "Delete forever" : "Delete"}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 min-h-11 min-w-11 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                onClick={handleToggleStar}
                aria-label={email.starred ? "Remove star" : "Star"}
              >
                <Star className={`h-4 w-4 transition-all duration-200 ${email.starred ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">{email.starred ? "Remove star" : "Star"}</p></TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:mx-1.5 sm:block" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showAiChat ? "default" : "ghost"}
                size="sm"
                aria-label={showAiChat ? "Close AI Chat" : "Open AI Chat"}
                className={`h-10 gap-1.5 rounded-lg px-3 text-xs transition-all duration-200 sm:h-8 ${showAiChat ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
                onClick={() => setShowAiChat(!showAiChat)}
              >
                <Image
                  src={showAiChat ? smartMailLogoWhite : smartMailLogo}
                  alt="AI Chat"
                  className="h-4 w-4 shrink-0 object-contain"
                />
                <span className="hidden sm:inline">AI Chat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{showAiChat ? "Close AI Chat panel" : "Open AI Chat (side panel)"}</p>
            </TooltipContent>
          </Tooltip>

          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 min-h-11 min-w-11 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                  onClick={() => { setShowMore(!showMore); setShowSnooze(false); setShowTags(false) }}
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">More actions</p></TooltipContent>
            </Tooltip>
            {showMore && (
              <MoreMenu
                email={email}
                folder={folder}
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
                availableLabels={userLabels}
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
          <ScrollArea ref={detailScrollRef} className="flex-1">
            <div className="w-full min-w-0">
              <div className="mx-auto max-w-4xl px-4 py-4 pb-24 sm:p-6 sm:pb-8">
              <div className="mb-4 flex animate-fade-in-up items-start justify-between gap-3 sm:mb-5">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl">
                    {fixMettingTypo(email.subject)}
                  </h2>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {email.category && (() => {
                      const cat = categoryConfig[email.category]
                      const CatIcon = cat.icon
                      return (
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${cat.color} border-current/20 gap-1`}
                        >
                          <CatIcon className="h-3 w-3" />
                          {cat.label}
                        </Badge>
                      )
                    })()}
                    {email.labels.map((label) => (
                      <Badge key={label} variant="secondary" className="text-[11px] bg-secondary/80 text-secondary-foreground/80">
                        {label}
                      </Badge>
                    ))}
                    {email.priority === "high" && (
                      <Badge variant="outline" className="text-[11px] border-red-400/30 text-red-400 bg-red-400/5 gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        High Priority
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 ml-4">
                  <button onClick={handleToggleStar} className="hover:scale-110 transition-all duration-200">
                    <Star className={`h-5 w-5 transition-all duration-200 ${email.starred ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" : "text-muted-foreground/40 hover:text-amber-400/60"}`} />
                  </button>
                  {email.hasAttachment && (
                    <Badge variant="outline" className="text-[11px] border-border/60 text-muted-foreground/70 gap-1">
                      <Paperclip className="h-3 w-3" />
                      Attachment
                    </Badge>
                  )}
                </div>
              </div>

              {/* AI Overview */}
              {email.aiSummary && (
                <Card className="mb-6 border-primary/15 bg-gradient-to-r from-primary/[0.04] to-primary/[0.02] shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: "50ms" }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-primary">AI Overview</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{email.aiSummary}</p>
                    {email.followUp && (
                      <div className="mt-3 pt-2.5 border-t border-primary/10 flex items-center gap-2 text-xs">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${email.followUp.status === "overdue" ? "bg-red-400/10" : "bg-amber-400/10"}`}>
                          <Clock className={`h-3 w-3 ${email.followUp.status === "overdue" ? "text-red-400" : "text-amber-400"}`} />
                        </div>
                        <span className={`font-medium ${email.followUp.status === "overdue" ? "text-red-400" : "text-amber-400"}`}>
                          {email.followUp.status === "overdue" ? "Overdue: " : "Follow-up: "}
                          {email.followUp.suggestedAction}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-start gap-4 mb-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <Avatar className="h-11 w-11 ring-2 ring-border/40">
                  <AvatarFallback
                    className="font-semibold text-sm"
                    style={{
                      backgroundColor: `${getMailboxColor(email.mailbox, mailboxes)}15`,
                      color: getMailboxColor(email.mailbox, mailboxes),
                    }}
                  >
                    {getInitials(email.from.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-foreground">{email.from.name}</span>
                      <span className="ml-0 mt-0.5 block text-xs text-muted-foreground/70 sm:ml-2 sm:mt-0 sm:inline">
                        {"<"}
                        {email.from.email}
                        {">"}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
                      {new Date(email.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {(() => {
                    const toLine = email.to
                      .map((t) => (t.name || "").trim() || (t.email || "").trim())
                      .filter(Boolean)
                      .join(", ")
                    if (!toLine) return null
                    return (
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        To: {toLine}
                      </p>
                    )
                  })()}
                </div>
              </div>

              <Separator className="mb-6 bg-border/40" />

              {email.schedulingInfo?.detected && (
                <div className="mb-6">
                  <ScheduleWidget email={email} />
                </div>
              )}

              <div className="max-w-none">
                {email.bodyIsHtml ? (
                  <EmailHtmlFrame html={sanitizeEmailHtml(email.body)} />
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none">
                    {email.body.split("\n").map((line, i) => (
                      <p key={i} className={`leading-relaxed ${line === "" ? "mt-4" : "mt-1"}`}>
                        {line ? fixMettingTypo(line) : "\u00A0"}
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
                            emailsApi
                              .downloadAttachment(email.id, i)
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

              {/* Conversation thread — sent replies + received replies, chronological */}
              <ConversationThread
                email={email}
                onEmailRefreshed={onEmailRefreshed}
              />
              </div>
            </div>
          </ScrollArea>

          {/* Compose Panel for Reply / Reply All / Forward (popup) */}
          <Dialog open={!!composeMode} onOpenChange={(open) => !open && setComposeMode(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-xl" aria-describedby={undefined} showCloseButton={false}>
              <DialogTitle className="sr-only">
                {composeMode === "forward" ? "Forward" : composeMode === "replyAll" ? "Reply All" : "Reply"}
              </DialogTitle>
              {composeMode && (
                <ComposePanel
                  mode={composeMode}
                  email={email}
                  onSend={handleComposeSend}
                  onCancel={() => setComposeMode(null)}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Instant Reply Bar */}
          {!composeMode && (
            sentReply ? (
              <div className="border-t border-emerald-400/20 bg-gradient-to-r from-emerald-400/5 to-emerald-400/[0.02] px-6 py-3">
                <div className="flex items-center gap-2.5 text-sm text-emerald-500">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium">Reply sent successfully</span>
                  <button onClick={() => setSentReply(null)} className="text-xs text-muted-foreground ml-auto hover:text-foreground transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              <InstantReplyBar email={email} onSend={(text) => setSentReply(text)} />
            )
          )}
        </div>

        {/* AI Chat Panel - side panel, opens when user clicks "AI Chat"; click again to close */}
        {showAiChat && (
          <div className="w-[380px] min-w-[380px] border-l border-border/60 flex-shrink-0 bg-background animate-in slide-in-from-right-5 duration-200">
            <EmailAiChat emailId={email.id} attachments={email.attachments} onClose={() => setShowAiChat(false)} />
          </div>
        )}
      </div>
    </div>

    {inTrashFolder && onPermanentDelete && (
      <AlertDialog open={permanentDeleteOpen} onOpenChange={setPermanentDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this email forever?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from Email Assistant permanently, including attachments and AI index data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
              onClick={() => onPermanentDelete(email.id)}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
    </TooltipProvider>
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

function receivedDateForFilter(email: Email): string {
  return email.originalDate ?? email.date ?? ""
}

/** Same "received today" rule as the API (UTC calendar day, prefers original_date). */
function isReceivedUtcToday(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  const n = new Date()
  return (
    d.getUTCFullYear() === n.getUTCFullYear() &&
    d.getUTCMonth() === n.getUTCMonth() &&
    d.getUTCDate() === n.getUTCDate()
  )
}

function emailMatchesInboxPreset(email: Email, preset: InboxFilter): boolean {
  const recv = receivedDateForFilter(email)
  switch (preset) {
    case "today":
      return isReceivedUtcToday(recv)
    case "today_unread":
      return isReceivedUtcToday(recv) && !email.read
    case "today_replied":
      return isReceivedUtcToday(recv) && !!email.repliedAt
    case "today_unreplied":
      return isReceivedUtcToday(recv) && !email.repliedAt
    case "total_unread":
      return !email.read
    case "total_replied":
      return !!email.repliedAt
    case "total_unreplied":
      return !email.repliedAt
    default:
      return true
  }
}

function FilterDropdownContent({
  activeFilter,
  presetCounts,
  onSelect,
  onClose,
}: {
  activeFilter: InboxFilter | null
  presetCounts: Record<InboxFilter, number>
  onSelect: (key: InboxFilter) => void
  onClose: () => void
}) {
  const renderRow = (key: InboxFilter) => {
    const cfg = filterPresetConfig[key]
    const Icon = cfg.icon
    const isActive = activeFilter === key
    return (
      <DropdownMenuItem
        key={key}
        onClick={() => { onSelect(key); onClose() }}
        className={`flex items-center justify-between gap-3 px-3 py-2 cursor-pointer rounded-md ${
          isActive ? "bg-primary/10 text-primary font-medium" : ""
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isActive ? (
            <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
          ) : (
            <div className="h-2 w-2 rounded-full border border-border shrink-0" />
          )}
          <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          <span>{cfg.label}</span>
        </div>
        <span className={`text-xs tabular-nums shrink-0 ${isActive ? "text-primary/70" : "text-muted-foreground"}`}>
          {presetCounts[key]}
        </span>
      </DropdownMenuItem>
    )
  }

  return (
    <>
      <DropdownMenuLabel className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
        Today
      </DropdownMenuLabel>
      {todayPresetKeys.map(renderRow)}
      <DropdownMenuSeparator className="my-1.5" />
      <DropdownMenuLabel className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
        Total
      </DropdownMenuLabel>
      {totalPresetKeys.map(renderRow)}
    </>
  )
}

const INBOX_FOLDER_TITLE: Record<string, string> = {
  inbox: "Inbox",
  sent: "Sent",
  trash: "Trash",
  archive: "Archive",
  star: "Star",
  spam: "Spam",
  snoozed: "Snoozed",
}

// -- Main Inbox View --
export function InboxView({
  initialMailboxFilter,
  initialFilter,
  onInitialFilterConsumed,
  initialEmailId,
  onInitialEmailConsumed,
  initialComposeMode,
  initialSenderEmail,
  initialSenderName,
  onInitialSenderConsumed,
  initialLabel,
  onInitialLabelConsumed,
  onConnectMailbox,
  folder = "inbox",
}: {
  /** When navigating from Mailboxes, inbox mounts with this mailbox pre-selected (custom events do not run if Inbox was unmounted). */
  initialMailboxFilter?: string | null
  initialFilter?: InboxFilter | null
  onInitialFilterConsumed?: () => void
  initialEmailId?: string | null
  onInitialEmailConsumed?: () => void
  initialComposeMode?: "reply" | "forward" | "replyAll" | null
  initialSenderEmail?: string | null
  initialSenderName?: string | null
  onInitialSenderConsumed?: () => void
  /** When set (e.g. from Labels section), inbox loads filtered to this AI label only */
  initialLabel?: string | null
  onInitialLabelConsumed?: () => void
  onConnectMailbox?: () => void
  folder?: string
} = {}) {
  const [mailboxesList, setMailboxesList] = useState<Mailbox[]>([])
  const [emailsList, setEmailsList] = useState<Email[]>([])
  /** Server counts for filter dropdown (full inbox, not just loaded page). */
  const [inboxStats, setInboxStats] = useState<EmailStatsApi | null>(null)
  /** Server counts per folder (inbox/sent/trash/archive/star/spam/snoozed). */
  const [folderCounts, setFolderCounts] = useState<FolderCountsApi | null>(null)
  /** Total count for current filtered view from backend (sender/label/search). */
  const [filteredTotal, setFilteredTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMailbox, setFilterMailbox] = useState<string>(() => {
    const id = initialMailboxFilter?.trim()
    return id && id.length > 0 ? id : "all"
  })

  useEffect(() => {
    const id = initialMailboxFilter?.trim()
    if (id && id.length > 0) {
      setFilterMailbox(id)
    }
  }, [initialMailboxFilter])

  const [senderFilter, setSenderFilter] = useState<{ from_email: string; from_name: string } | null>(() =>
    initialSenderEmail?.trim()
      ? { from_email: initialSenderEmail.trim(), from_name: (initialSenderName || initialSenderEmail).trim() }
      : null
  )

  const [snoozedEmails, setSnoozedEmails] = useState<Set<string>>(new Set())
  /** Multi-select checkboxes in the list (opening an email does not clear this). */
  const [listSelectedIds, setListSelectedIds] = useState<Set<string>>(new Set())
  /** Trash folder: confirm before permanently deleting from list or bulk selection. */
  const [permanentDeletePrompt, setPermanentDeletePrompt] = useState<
    null | { type: "list"; id: string } | { type: "bulk" }
  >(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filterPreset, setFilterPreset] = useState<InboxFilter | null>(initialFilter ?? null)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [uniqueSenders, setUniqueSenders] = useState<UniqueSendersApi | null>(null)
  const [showUniqueSendersDialog, setShowUniqueSendersDialog] = useState(false)
  const [filterLabel, setFilterLabel] = useState<string | null>(() => initialLabel?.trim() || null)
  const [userLabels, setUserLabels] = useState<string[]>([])
  const [userSettings, setUserSettings] = useState<SettingsApi | null>(null)

  const PAGE_SIZE = 50
  /**
   * Gmail-style pagination: we load exactly one page (PAGE_SIZE) at a time.
   * `currentPage` is 1-indexed. `hasMoreFromApi` tracks whether the last
   * batch returned a full PAGE_SIZE (used as a fallback when total isn't known).
   */
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreFromApi, setHasMoreFromApi] = useState(true)
  const initialLoadDoneRef = useRef(false)
  const emailListScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (initialFilter) {
      setFilterPreset(initialFilter)
    }
  }, [initialFilter])

  useEffect(() => {
    settingsApi.get().then((s) => {
      setUserSettings(s)
      const names = (s.ai_label_rules ?? []).map((r) => r.name).filter(Boolean)
      setUserLabels(names)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const { rules } = (e as CustomEvent<LabelsUpdatedDetail>).detail
      setUserLabels(rules.map((r) => r.name).filter(Boolean))
    }
    window.addEventListener(LABELS_UPDATED_EVENT, handler)
    return () => window.removeEventListener(LABELS_UPDATED_EVENT, handler)
  }, [])

  useEffect(() => {
    if (initialSenderEmail?.trim()) {
      setSenderFilter({
        from_email: initialSenderEmail.trim(),
        from_name: (initialSenderName || initialSenderEmail).trim(),
      })
      onInitialSenderConsumed?.()
    }
  }, [initialSenderEmail, initialSenderName, onInitialSenderConsumed])

  useEffect(() => {
    const name = initialLabel?.trim()
    if (!name) return
    setFilterLabel(name)
    setFilterPreset(null)
    setSenderFilter(null)
    onInitialLabelConsumed?.()
  }, [initialLabel, onInitialLabelConsumed])

  const prevFolderRef = useRef(folder)
  useEffect(() => {
    if (prevFolderRef.current !== folder) {
      prevFolderRef.current = folder
      setSelectedEmail(null)
      setSearchQuery("")
      setCurrentPage(1)
      setHasMoreFromApi(true)
      setFilterLabel(null)
      setFilterPreset(null)
      setInboxStats(null)
    }
  }, [folder])

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

  const clearSenderFilter = useCallback(() => {
    setSenderFilter(null)
    onInitialSenderConsumed?.()
    setCurrentPage(1)
    setHasMoreFromApi(true)
  }, [onInitialSenderConsumed])

  // Folder-aware totals from backend. This fixes wrong "of N" counts in
  // non-inbox folders (Sent/Trash/Archive/Star/Spam/Snoozed).
  const normalizedFolder = folder && folder !== "" ? folder : "inbox"
  const folderCountFromApi =
    normalizedFolder === "inbox"
      ? (folderCounts?.inbox ?? 0)
      : normalizedFolder === "sent"
        ? (folderCounts?.sent ?? 0)
        : normalizedFolder === "trash"
          ? (folderCounts?.trash ?? 0)
          : normalizedFolder === "archive"
            ? (folderCounts?.archive ?? 0)
            : normalizedFolder === "star"
              ? (folderCounts?.star ?? 0)
              : normalizedFolder === "spam"
                ? (folderCounts?.spam ?? 0)
                : normalizedFolder === "snoozed"
                  ? (folderCounts?.snoozed ?? 0)
                  : 0
  const loadedCount = emailsList.filter((e) => !snoozedEmails.has(e.id)).length
  const hasServerScopedFilters = Boolean(senderFilter?.from_email || filterLabel)
  const allCount = hasServerScopedFilters ? filteredTotal : folderCountFromApi > 0 ? folderCountFromApi : loadedCount
  // displayedCount reflects the actual visible emails after mailbox/search/filter
  const displayedCount = (() => {
    let list = emailsList.filter((e) => !snoozedEmails.has(e.id))
    if (filterMailbox !== "all") list = list.filter((e) => e.mailbox === filterMailbox)
    return list.length
  })()

  const fetchMailboxesAndEmails = useCallback((mailboxId?: string, pageOverride?: number) => {
    const mbFilter = mailboxId ?? filterMailbox
    const page = pageOverride ?? currentPage
    const listParams: {
      limit: number
      offset: number
      mailbox_id?: string
      from_email?: string
      label?: string
      folder?: string
      inbox_preset?: string
    } = { limit: PAGE_SIZE, offset: Math.max(0, (page - 1) * PAGE_SIZE) }
    if (mbFilter !== "all") listParams.mailbox_id = mbFilter
    if (senderFilter?.from_email) listParams.from_email = senderFilter.from_email
    if (filterLabel) listParams.label = filterLabel
    if (folder && folder !== "inbox") listParams.folder = folder
    if ((!folder || folder === "inbox") && filterPreset) listParams.inbox_preset = filterPreset

    const statParams = mbFilter !== "all" ? { mailbox_id: mbFilter } : undefined
    const statsPromise =
      !folder || folder === "inbox"
        ? emailsApi.stats(statParams).then(setInboxStats).catch(() => setInboxStats(null))
        : Promise.resolve().then(() => setInboxStats(null))
    const folderCountsPromise = emailsApi
      .folderCounts(statParams)
      .then(setFolderCounts)
      .catch(() => setFolderCounts(null))

    return Promise.all([
      mailboxesApi.list().then((list) => setMailboxesList(list.map(mapMailboxApi))).catch(() => {}),
      emailsApi
        .list(listParams)
        .then((res) => {
          setEmailsList(res.emails.map(mapEmailListApi))
          setFilteredTotal(res.total)
          setHasMoreFromApi(res.emails.length >= PAGE_SIZE)
        })
        .catch(() => {}),
      statsPromise,
      folderCountsPromise,
    ])
  }, [filterMailbox, senderFilter?.from_email, filterLabel, folder, filterPreset, currentPage])

  // Whenever any server-side filter changes, jump back to page 1 so the
  // next fetch starts from offset 0 (Gmail-style behavior).
  useEffect(() => {
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMailbox, senderFilter?.from_email, filterLabel, folder, filterPreset])

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
        const totalThreadReplies = results.reduce(
          (s, r) => s + ((r as { thread_replies_added?: number })?.thread_replies_added ?? 0),
          0,
        )
        const totalFlagsUpdated = results.reduce(
          (s, r) => s + ((r as { flags_updated?: number })?.flags_updated ?? 0),
          0,
        )
        setHasMoreFromApi(true)
        setCurrentPage(1)
        return fetchMailboxesAndEmails(undefined, 1).then(() => ({ totalSynced, totalThreadReplies, totalFlagsUpdated }))
      })
      .then(({ totalSynced, totalThreadReplies, totalFlagsUpdated }) => {
        if (totalSynced > 0 || totalThreadReplies > 0) {
          const parts: string[] = []
          if (totalSynced > 0) parts.push(`${totalSynced} new email(s)`)
          if (totalThreadReplies > 0) parts.push(`${totalThreadReplies} new reply(s)`)
          if (totalFlagsUpdated > 0) {
            parts.push(`${totalFlagsUpdated} updated from Gmail/mail (read, star, …)`)
          }
          toast.success(`Synced. ${parts.join(", ")}.`)
        } else if (totalFlagsUpdated > 0) {
          toast.success(
            `Synced. ${totalFlagsUpdated} message(s) updated from your mail provider (read, star, etc.).`,
          )
        } else {
          toast.success("Inbox is up to date.")
        }
        // Match app auto-sync: notify dashboard (Top Senders, trends) and sidebar even when 0 new messages
        window.dispatchEvent(
          new CustomEvent("email:sync", {
            detail: { newCount: totalSynced, flagsUpdated: totalFlagsUpdated },
          }),
        )
        window.dispatchEvent(new CustomEvent("mailbox:sync-complete"))
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

  // Fetch unique senders when mailbox filter changes
  useEffect(() => {
    const params = filterMailbox === "all" ? undefined : { mailbox_id: filterMailbox }
    emailsApi.uniqueSenders(params).then(setUniqueSenders).catch(() => setUniqueSenders(null))
  }, [filterMailbox])

  // Listen for global auto-sync completing — refresh inbox data and unique senders (stable deps to avoid useEffect array size change)
  const onAutoSyncRef = useRef<() => void>(() => {})
  onAutoSyncRef.current = () => {
    fetchMailboxesAndEmails()
    const params = filterMailbox === "all" ? undefined : { mailbox_id: filterMailbox }
    emailsApi.uniqueSenders(params).then(setUniqueSenders).catch(() => setUniqueSenders(null))
  }
  useEffect(() => {
    const onAutoSync = () => onAutoSyncRef.current()
    window.addEventListener("mailbox:sync-complete", onAutoSync)
    return () => window.removeEventListener("mailbox:sync-complete", onAutoSync)
  }, [])

  useEffect(() => {
    const onActionExecuted = () => onAutoSyncRef.current()
    window.addEventListener("email:action-executed", onActionExecuted)
    return () => window.removeEventListener("email:action-executed", onActionExecuted)
  }, [])

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

  // Account / mailbox menu (sidebar): switch inbox mailbox filter globally
  useEffect(() => {
    const onSetFilter = (e: Event) => {
      const id = (e as CustomEvent<{ mailboxId?: string }>).detail?.mailboxId
      if (id === "all") setFilterMailbox("all")
      else if (id && typeof id === "string") setFilterMailbox(id)
    }
    window.addEventListener("inbox:setMailboxFilter", onSetFilter as EventListener)
    return () => window.removeEventListener("inbox:setMailboxFilter", onSetFilter as EventListener)
  }, [])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("inbox:filterMailboxChanged", { detail: { mailboxId: filterMailbox } }),
    )
  }, [filterMailbox])

  const handleSelectEmail = useCallback((email: Email) => {
    // Immediately show email as read in both the detail view and the list
    const openedAsRead = { ...email, read: true }
    setSelectedEmail(openedAsRead)
    if (!email.read) {
      setEmailsList((prev) => prev.map((e) => (e.id === email.id ? { ...e, read: true } : e)))
      window.dispatchEvent(new CustomEvent("email:read", { detail: { mailboxId: email.mailbox } }))
      window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
    }
    // Fetch full body in background; only update if user hasn't navigated away
    emailsApi
      .get(email.id)
      .then((detail) => {
        setSelectedEmail((prev) => {
          if (!prev || prev.id !== email.id) return prev
          return mapEmailDetailApi(detail)
        })
        if (!email.read) {
          emailsApi.update(email.id, { read: true }).catch(() => {})
        }
      })
      .catch(() => setSelectedEmail((prev) => (prev?.id === email.id ? openedAsRead : prev)))
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
    mailboxesApi
      .list()
      .then((list) => {
        setMailboxesList(list.map(mapMailboxApi))
        // Notify dashboard/settings widgets (Top Senders, trends, etc.) to refetch.
        window.dispatchEvent(new CustomEvent("mailbox:updated"))
        // Refresh sidebar folder counts (inbox unread, trash total, etc.)
        window.dispatchEvent(new CustomEvent("mailbox:sync-complete"))
      })
      .catch(() => {})
  }, [])

  const handleArchive = useCallback((emailId: string) => {
    emailsApi.archive(emailId).then(() => {
      setEmailsList((prev) => prev.filter((e) => e.id !== emailId))
      setSelectedEmail(null)
      toast.success("Email archived")
      window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
      refreshMailboxCounts()
    }).catch(() => {})
  }, [refreshMailboxCounts])

  const handleTrash = useCallback((emailId: string) => {
    // Optimistic: remove from UI immediately without waiting for API
    let restored: ReturnType<typeof emailsList.find> | undefined
    setEmailsList((prev) => {
      restored = prev.find((e) => e.id === emailId)
      return prev.filter((e) => e.id !== emailId)
    })
    setListSelectedIds((prev) => { const next = new Set(prev); next.delete(emailId); return next })
    setSelectedEmail(null)
    toast.success("Email deleted")
    window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
    refreshMailboxCounts()
    emailsApi.trash(emailId).catch(() => {
      if (restored) setEmailsList((prev) => [restored!, ...prev])
      toast.error("Could not delete email")
    })
  }, [emailsList, refreshMailboxCounts])

  const handleDeletePermanent = useCallback(
    (emailId: string) => {
      let restored: ReturnType<typeof emailsList.find> | undefined
      setEmailsList((prev) => {
        restored = prev.find((e) => e.id === emailId)
        return prev.filter((e) => e.id !== emailId)
      })
      setListSelectedIds((prev) => { const next = new Set(prev); next.delete(emailId); return next })
      setSelectedEmail(null)
      toast.success("Email deleted permanently")
      window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
      refreshMailboxCounts()
      emailsApi.deletePermanently(emailId).catch((err) => {
        if (restored) setEmailsList((prev) => [restored!, ...prev])
        toast.error(err?.message ?? "Could not delete permanently")
      })
    },
    [emailsList, refreshMailboxCounts]
  )

  const handleMoveToInbox = useCallback((emailId: string) => {
    let restored: ReturnType<typeof emailsList.find> | undefined
    setEmailsList((prev) => {
      restored = prev.find((e) => e.id === emailId)
      return prev.filter((e) => e.id !== emailId)
    })
    setListSelectedIds((prev) => { const next = new Set(prev); next.delete(emailId); return next })
    setSelectedEmail(null)
    toast.success("Email moved to inbox")
    window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
    refreshMailboxCounts()
    emailsApi.moveToInbox(emailId).catch((err) => {
      if (restored) setEmailsList((prev) => [restored!, ...prev])
      toast.error(err?.message ?? "Could not move to inbox")
    })
  }, [emailsList, refreshMailboxCounts])

  const runBulkDeletePermanent = useCallback(() => {
    const ids = [...listSelectedIds]
    if (ids.length === 0) return
    setPermanentDeletePrompt({ type: "bulk" })
  }, [listSelectedIds])

  const toggleListEmailSelect = useCallback((emailId: string) => {
    setListSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(emailId)) next.delete(emailId)
      else next.add(emailId)
      return next
    })
  }, [])

  const handleSpam = useCallback((emailId: string) => {
    emailsApi.spam(emailId).then(() => {
      setEmailsList((prev) => prev.filter((e) => e.id !== emailId))
      setSelectedEmail(null)
      toast.success("Reported as spam")
      window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
      refreshMailboxCounts()
    }).catch((err) => {
      toast.error(err?.message ?? "Failed to report spam")
    })
  }, [refreshMailboxCounts])

  const handleUpdate = useCallback((emailId: string, data: { read?: boolean; starred?: boolean; labels?: string[] }) => {
    // If unstarring while in the starred folder, remove the email from the list immediately
    const removingFromStarred = folder === "starred" && data.starred === false
    let original: Partial<typeof data> = {}
    let removedEmail: Email | undefined
    setEmailsList((prev) => {
      const target = prev.find((e) => e.id === emailId)
      if (target) original = Object.fromEntries(Object.keys(data).map((k) => [k, (target as Record<string, unknown>)[k]])) as Partial<typeof data>
      if (removingFromStarred) {
        removedEmail = target
        return prev.filter((e) => e.id !== emailId)
      }
      return prev.map((e) => e.id === emailId ? { ...e, ...data } : e)
    })
    if (removingFromStarred) {
      setSelectedEmail((cur) => (cur && cur.id === emailId ? null : cur))
    }
    window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
    emailsApi.update(emailId, data).then((updated) => {
      const mapped = mapEmailDetailApi(updated)
      if (!removingFromStarred) {
        setSelectedEmail((prev) => prev && prev.id === emailId ? mapped : prev)
        setEmailsList((prev) =>
          prev.map((e) => e.id === emailId ? { ...e, ...mapped } : e)
        )
      }
    }).catch((err) => {
      if (removingFromStarred && removedEmail) {
        setEmailsList((prev) => [removedEmail!, ...prev])
      } else {
        setEmailsList((prev) =>
          prev.map((e) => e.id === emailId ? { ...e, ...original } : e)
        )
      }
      toast.error(err?.message ?? "Update failed")
    })
  }, [folder])

  const activeEmails = emailsList.filter((e) => !snoozedEmails.has(e.id))
  const todayAll = activeEmails.filter((e) => isReceivedUtcToday(receivedDateForFilter(e)))
  const presetCounts: Record<InboxFilter, number> = inboxStats
    ? {
        today: inboxStats.today_total,
        today_unread: inboxStats.today_unread,
        today_replied: inboxStats.today_replied,
        today_unreplied: inboxStats.today_unreplied,
        total_unread: inboxStats.total_unread,
        total_replied: inboxStats.total_replied,
        total_unreplied: inboxStats.total_unreplied,
      }
    : {
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


    const matchesPreset = !filterPreset || emailMatchesInboxPreset(email, filterPreset)

    return matchesSearch && matchesMailbox && matchesPreset
  })

  const loadMoreTargetCount =
    filterPreset && inboxStats && (!folder || folder === "inbox")
      ? presetCounts[filterPreset]
      : hasServerScopedFilters
        ? filteredTotal
        : folderCountFromApi

  const filterBadgeCount =
    filterPreset && searchQuery.trim() ? filteredEmails.length : filterPreset ? presetCounts[filterPreset] : 0

  const bulkActionsDisabled = listSelectedIds.size === 0
  const allFilteredSelected =
    filteredEmails.length > 0 && filteredEmails.every((e) => listSelectedIds.has(e.id))

  /**
   * Gmail-style "Select all": only toggles the emails visible on the
   * current page (the PAGE_SIZE subset we just loaded, minus snoozed /
   * client-search-filtered items). Cross-page selection is intentionally
   * removed — users move page-by-page using the prev/next arrows.
   */
  const handleBulkToggleSelectAll = useCallback(() => {
    setListSelectedIds((prev) => {
      const ids = filteredEmails.map((e) => e.id)
      if (ids.length === 0) return prev
      const allOn = ids.every((id) => prev.has(id))
      const next = new Set(prev)
      if (allOn) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }, [filteredEmails])

  /**
   * All bulk handlers below share the same shape:
   *   1. Capture selected ids synchronously.
   *   2. Apply an OPTIMISTIC UI update immediately (list feels instant).
   *   3. Fire ONE bulk API call for all ids.
   *   4. On failure, toast + ideally refetch — we keep the optimistic state
   *      so the UI doesn't rubber-band; a refetch will reconcile if needed.
   *
   * This replaces the previous O(N) `Promise.allSettled([emailsApi.X...])`
   * pattern that took 10+ seconds for 50 emails because each request did
   * its own Mongo lookup + IMAP login/select/search round-trip.
   */

  const runBulkArchive = () => {
    const ids = [...listSelectedIds]
    if (ids.length === 0) return
    setEmailsList((prev) => prev.filter((e) => !ids.includes(e.id)))
    setListSelectedIds(new Set())
    setSelectedEmail((cur) => (cur && ids.includes(cur.id) ? null : cur))
    setLoading(true)
    emailsApi.bulkArchive(ids)
      .then((res) => {
        toast.success(`Archived ${res.processed} email(s)`)
        window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
        refreshMailboxCounts()
        fetchMailboxesAndEmails().finally(() => setLoading(false))
      })
      .catch(() => { toast.error("Could not archive"); setLoading(false) })
  }

  const runBulkTrash = () => {
    const ids = [...listSelectedIds]
    if (ids.length === 0) return
    setEmailsList((prev) => prev.filter((e) => !ids.includes(e.id)))
    setListSelectedIds(new Set())
    setSelectedEmail((cur) => (cur && ids.includes(cur.id) ? null : cur))
    setLoading(true)
    emailsApi.bulkTrash(ids)
      .then((res) => {
        toast.success(`Deleted ${res.processed} email(s)`)
        window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
        refreshMailboxCounts()
        fetchMailboxesAndEmails().finally(() => setLoading(false))
      })
      .catch(() => { toast.error("Could not delete"); setLoading(false) })
  }

  const runBulkSpam = () => {
    const ids = [...listSelectedIds]
    if (ids.length === 0) return
    setEmailsList((prev) => prev.filter((e) => !ids.includes(e.id)))
    setListSelectedIds(new Set())
    setSelectedEmail((cur) => (cur && ids.includes(cur.id) ? null : cur))
    setLoading(true)
    emailsApi.bulkSpam(ids)
      .then((res) => {
        toast.success(`Reported ${res.processed} as spam`)
        window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
        refreshMailboxCounts()
        fetchMailboxesAndEmails().finally(() => setLoading(false))
      })
      .catch(() => { toast.error("Could not report as spam"); setLoading(false) })
  }

  const runBulkMoveToInbox = () => {
    const ids = [...listSelectedIds]
    if (ids.length === 0) return
    setEmailsList((prev) => prev.filter((e) => !ids.includes(e.id)))
    setListSelectedIds(new Set())
    setSelectedEmail((cur) => (cur && ids.includes(cur.id) ? null : cur))
    setLoading(true)
    emailsApi.bulkMoveToInbox(ids)
      .then((res) => {
        toast.success(`Moved ${res.processed} email(s) to inbox`)
        window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
        refreshMailboxCounts()
        fetchMailboxesAndEmails().finally(() => setLoading(false))
      })
      .catch(() => { toast.error("Could not move to inbox"); setLoading(false) })
  }

  const runBulkMarkRead = () => {
    const ids = [...listSelectedIds]
    if (ids.length === 0) return
    const ok = new Set(ids)
    setEmailsList((prev) => prev.map((e) => (ok.has(e.id) ? { ...e, read: true } : e)))
    setListSelectedIds(new Set())
    setSelectedEmail((cur) => (cur && ok.has(cur.id) ? { ...cur, read: true } : cur))
    window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
    emailsApi.bulkUpdate(ids, { read: true })
      .then((res) => toast.success(`Marked ${res.processed} as read`))
      .catch(() => toast.error("Could not update"))
  }

  const runBulkMarkUnread = () => {
    const ids = [...listSelectedIds]
    if (ids.length === 0) return
    const ok = new Set(ids)
    setEmailsList((prev) => prev.map((e) => (ok.has(e.id) ? { ...e, read: false } : e)))
    setListSelectedIds(new Set())
    setSelectedEmail((cur) => (cur && ok.has(cur.id) ? { ...cur, read: false } : cur))
    window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
    emailsApi.bulkUpdate(ids, { read: false })
      .then((res) => toast.success(`Marked ${res.processed} as unread`))
      .catch(() => toast.error("Could not update"))
  }

  const runBulkStar = () => {
    const ids = [...listSelectedIds]
    if (ids.length === 0) return
    const ok = new Set(ids)
    setEmailsList((prev) => prev.map((e) => (ok.has(e.id) ? { ...e, starred: true } : e)))
    setListSelectedIds(new Set())
    setSelectedEmail((cur) => (cur && ok.has(cur.id) ? { ...cur, starred: true } : cur))
    window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
    emailsApi.bulkUpdate(ids, { starred: true })
      .then((res) => toast.success(`Starred ${res.processed} email(s)`))
      .catch(() => toast.error("Could not star"))
  }

  const runBulkRemoveStar = () => {
    const ids = [...listSelectedIds]
    if (ids.length === 0) return
    const ok = new Set(ids)
    setEmailsList((prev) => prev.map((e) => (ok.has(e.id) ? { ...e, starred: false } : e)))
    setListSelectedIds(new Set())
    setSelectedEmail((cur) => (cur && ok.has(cur.id) ? { ...cur, starred: false } : cur))
    window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
    emailsApi.bulkUpdate(ids, { starred: false })
      .then((res) => toast.success(`Removed star from ${res.processed} email(s)`))
      .catch(() => toast.error("Could not update"))
  }

  const runBulkSnooze = (hours: number) => {
    const ids = [...listSelectedIds]
    if (ids.length === 0) return
    const ok = new Set(ids)
    setSnoozedEmails((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
    setListSelectedIds(new Set())
    setSelectedEmail((cur) => (cur && ok.has(cur.id) ? null : cur))
    emailsApi.bulkSnooze(ids, hours)
      .then((res) => toast.success(`Snoozed ${res.processed} email(s)`))
      .catch(() => toast.error("Could not snooze"))
  }

  /**
   * Gmail-style pagination math. We derive a best-effort total from
   * `loadMoreTargetCount` (which reads from mailbox stats / preset counts
   * when available) and fall back to `hasMoreFromApi` when the backend
   * doesn't expose a total for the current view (e.g., sender/label
   * filters, or non-inbox folders).
   */
  const knownTotal = loadMoreTargetCount > 0 ? loadMoreTargetCount : 0
  const pageStart = filteredEmails.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = (currentPage - 1) * PAGE_SIZE + filteredEmails.length
  const totalForDisplay = knownTotal > 0 ? Math.max(knownTotal, pageEnd) : pageEnd
  const canGoPrevPage = currentPage > 1 && !loading
  const canGoNextPage =
    !loading &&
    !searchQuery.trim() &&
    (hasMoreFromApi || (knownTotal > 0 && pageEnd < knownTotal))

  const scrollEmailListToTop = useCallback(() => {
    const node = emailListScrollRef.current
    if (!node) return
    const viewport = node.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]")
    if (viewport) viewport.scrollTo({ top: 0, behavior: "smooth" })
    else node.scrollTo?.({ top: 0, behavior: "smooth" })
  }, [])

  const goToPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1) return
      if (loading) return
      if (nextPage === currentPage) return
      setListSelectedIds(new Set())
      setCurrentPage(nextPage)
      scrollEmailListToTop()
    },
    [currentPage, loading, scrollEmailListToTop],
  )

  const goToPrevPage = useCallback(() => {
    if (!canGoPrevPage) return
    goToPage(currentPage - 1)
  }, [canGoPrevPage, currentPage, goToPage])

  const goToNextPage = useCallback(() => {
    if (!canGoNextPage) return
    goToPage(currentPage + 1)
  }, [canGoNextPage, currentPage, goToPage])

  // Unread count: from API (mailboxesList[].unread) when available; else from loaded emails
  const unreadCountFromApi =
    filterMailbox === "all"
      ? mailboxesList.reduce((s, m) => s + (m.unread ?? 0), 0)
      : (mailboxesList.find((m) => m.id === filterMailbox)?.unread ?? 0)
  const unreadCountFromList = activeEmails.filter((e) => !e.read).length
  const unreadCount = typeof unreadCountFromApi === "number" && mailboxesList.some((m) => m.unread != null)
    ? unreadCountFromApi
    : unreadCountFromList

  const syncMailboxControl = refreshing ? (
    <Button
      variant="outline"
      size="sm"
      onClick={handleStopSync}
      className="h-9 shrink-0 gap-1.5 rounded-xl border-red-400/30 text-xs text-red-400 shadow-sm hover:bg-red-400/10 hover:text-red-400"
    >
      <Square className="h-3 w-3 fill-current" />
      <span className="md:hidden">Stop</span>
      <span className="hidden md:inline">Stop Sync</span>
    </Button>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="h-9 shrink-0 gap-1.5 rounded-xl border-border/60 bg-card/70 text-xs text-foreground/80 shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
        >
          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden min-[380px]:inline">Sync</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px]">
        <p className="text-xs">
          Sync scans your full inbox on the server and merges new mail plus read/star (and similar) changes from
          Gmail or other apps.
        </p>
      </TooltipContent>
    </Tooltip>
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col bg-gradient-to-b from-background to-muted/[0.12]">
        {/* Header */}
        <div className="border-b border-border/60 bg-gradient-to-r from-background via-background to-primary/[0.03] backdrop-blur-sm">
          <div className="px-4 py-3 sm:px-6 sm:py-4 md:py-4.5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="flex min-w-0 items-start justify-between gap-3 md:contents">
                <div className="flex min-w-0 items-center gap-3 md:shrink-0">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/10 sm:h-11 sm:w-11">
                    {(() => {
                      const folderIcons: Record<string, React.ElementType> = {
                        inbox: Inbox,
                        sent: Send,
                        trash: Trash2,
                        archive: Archive,
                        star: Star,
                        spam: ShieldAlert,
                        snoozed: Clock,
                      }
                      const FolderIcon = folderIcons[folder] ?? Inbox
                      return <FolderIcon className="h-5 w-5 text-primary" />
                    })()}
                    {unreadCount > 0 && folder === "inbox" && (
                      <div className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-extrabold leading-tight tracking-tight text-foreground sm:text-lg">
                      {INBOX_FOLDER_TITLE[folder] ?? folder}
                    </h1>
                    {filterLabel && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-primary">
                        <Tag className="h-3 w-3 shrink-0" />
                        <span>Label: {filterLabel}</span>
                      </p>
                    )}
                    {!loading && mailboxesList.length === 0 ? (
                      <p className="mt-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400/90">
                        No mailbox connected — connect one to load messages.
                      </p>
                    ) : (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-muted-foreground/80">
                        <span>{allCount} email{allCount !== 1 ? "s" : ""}</span>
                        {unreadCount > 0 && (
                          <span className="font-medium text-primary/80">· {unreadCount} unread</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 md:hidden">{syncMailboxControl}</div>
              </div>

              <div className="relative min-w-0 flex-1 md:max-w-lg">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  placeholder="Search mail…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border/60 bg-card/75 pl-10 pr-9 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground/50 hover:border-border focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="hidden shrink-0 md:flex md:items-center">{syncMailboxControl}</div>
            </div>
          </div>
        </div>

        {selectedEmail ? (
          <div className="flex-1 overflow-hidden">
            <EmailDetail
              email={selectedEmail}
              mailboxes={mailboxesList}
              initialComposeMode={initialComposeMode === "reply" ? "reply" : null}
              userLabels={userLabels}
              onBack={() => setSelectedEmail(null)}
              onSnooze={handleSnooze}
              onArchive={handleArchive}
              onTrash={handleTrash}
              onSpam={handleSpam}
              onUpdate={handleUpdate}
              onEmailRefreshed={(updated) => setSelectedEmail(updated)}
              onMoveToInbox={folder === "trash" || folder === "archive" || folder === "spam" || folder === "snoozed" ? handleMoveToInbox : undefined}
              folder={folder}
              onPermanentDelete={folder === "trash" ? handleDeletePermanent : undefined}
            />
          </div>
        ) : !loading && mailboxesList.length === 0 ? (
          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-2xl p-6">
              <ConnectMailboxCta onConnect={onConnectMailbox} variant="hero" />
            </div>
          </ScrollArea>
        ) : (
          <>
            {/* Mailbox Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 bg-card/40 px-4 py-2.5 sm:px-6 sm:py-3">
              <Button
                variant={filterMailbox === "all" ? "default" : "ghost"}
                size="sm"
                className={`text-xs h-8 rounded-xl gap-1.5 transition-all duration-200 ${filterMailbox === "all" ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"}`}
                onClick={() => setFilterMailbox("all")}
              >
                <Mail className="h-3.5 w-3.5" />
                All
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${filterMailbox === "all" ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
                  {mailboxesList.reduce((s, m) => s + (m.totalEmails ?? 0), 0) || emailsList.length}
                </span>
              </Button>
              {mailboxesList.map((mb) => {
                const isActive = filterMailbox === mb.id
                return (
                  <Button
                    key={mb.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`text-xs h-8 gap-1.5 rounded-xl transition-all duration-200 ${isActive ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"}`}
                    style={isActive ? { backgroundColor: mb.color, boxShadow: `0 2px 8px ${mb.color}30` } : undefined}
                    onClick={() => setFilterMailbox(mb.id)}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-white/20"
                      style={{ backgroundColor: mb.color }}
                    />
                    {mb.name}
                    {mb.totalEmails != null && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isActive ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                        {mb.totalEmails}
                      </span>
                    )}
                  </Button>
                )
              })}
            </div>

            {/* Label Filter Tabs — AI labels only apply to the Inbox folder,
                so hide this header row on Sent/Trash/Archive/Star/Spam/Snoozed. */}
            {userLabels.length > 0 && (!folder || folder === "inbox") && (
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 bg-card/30 px-4 py-2 sm:px-6 sm:py-2.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mr-1" />
                <Button
                  variant={filterLabel === null ? "default" : "ghost"}
                  size="sm"
                    className={`text-[11px] h-7 rounded-xl gap-1 px-2.5 transition-all duration-200 ${
                    filterLabel === null
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                  onClick={() => setFilterLabel(null)}
                >
                  All Labels
                </Button>
                {userLabels.map((label) => {
                  const active = filterLabel === label
                  return (
                    <Button
                      key={label}
                      variant={active ? "default" : "ghost"}
                      size="sm"
                      className={`text-[11px] h-7 rounded-xl gap-1 px-2.5 transition-all duration-200 ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                      onClick={() => setFilterLabel(active ? null : label)}
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>
            )}

            {/* Filter bar + bulk actions (selection applies to checked emails) */}
            <div className="relative flex flex-col gap-2 overflow-visible border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2 sm:px-6 sm:py-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <DropdownMenu open={showFilterDropdown} onOpenChange={setShowFilterDropdown}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`gap-1.5 h-8 text-xs rounded-xl transition-all duration-200 ${filterPreset ? "border-primary/40 bg-primary/5 text-primary shadow-sm shadow-primary/10" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"}`}
                    >
                      <SlidersHorizontal className={`h-3 w-3 ${filterPreset ? "text-primary" : ""}`} />
                      {filterPreset
                        ? filterPreset === "today"
                          ? "Today"
                          : `${todayPresetKeys.includes(filterPreset) ? "Today" : "Total"} ${filterPresetConfig[filterPreset].label}`
                        : "Filter"}
                      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showFilterDropdown ? "rotate-180" : ""}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={6}
                    className="w-56 min-w-[14rem] max-h-[min(20rem,70vh)] overflow-y-auto rounded-xl border border-border/80 bg-card p-1.5 shadow-xl"
                  >
                    <FilterDropdownContent
                      activeFilter={filterPreset}
                      presetCounts={presetCounts}
                      onSelect={setFilterPreset}
                      onClose={() => setShowFilterDropdown(false)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
                {refreshing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStopSync}
                    className="h-8 shrink-0 gap-1 rounded-xl border-red-400/40 text-xs text-red-500 shadow-sm hover:bg-red-500/10 hover:text-red-600"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    <span className="hidden min-[360px]:inline">Stop</span>
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={mailboxesList.length === 0}
                        className="h-8 shrink-0 gap-1.5 rounded-xl border-border/60 bg-card/70 text-xs text-foreground/80 shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden min-[380px]:inline">Refresh</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[260px]">
                      <p className="text-xs">
                        Sync mailboxes: full inbox scan — new mail plus read/star changes from Gmail or other clients.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {filterPreset && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs rounded-xl text-muted-foreground hover:text-foreground gap-1"
                    onClick={clearFilterPreset}
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                )}
                {senderFilter && (
                  <div className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-2.5 py-1.5">
                    <span className="text-xs font-medium text-primary truncate max-w-[180px]">
                      From: {senderFilter.from_name || senderFilter.from_email}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 rounded-md text-muted-foreground hover:text-foreground shrink-0"
                      onClick={clearSenderFilter}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 rounded-xl px-2.5 text-xs"
                      disabled={filteredEmails.length === 0}
                      aria-label={allFilteredSelected ? "Deselect all on this page" : "Select all on this page"}
                      onClick={handleBulkToggleSelectAll}
                    >
                      <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="max-[420px]:sr-only">
                        {allFilteredSelected ? "Deselect all" : "Select all"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px]">
                    <p className="text-xs">
                      {allFilteredSelected
                        ? "Clear selection on this page"
                        : `Select all ${filteredEmails.length} email(s) on this page`}
                    </p>
                  </TooltipContent>
                </Tooltip>
                {folder !== "trash" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-xl px-2.5 text-xs"
                        disabled={bulkActionsDisabled}
                        onClick={runBulkArchive}
                      >
                        <Archive className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden min-[380px]:inline">Archive</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Archive selected</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {(folder === "trash" || folder === "archive" || folder === "spam" || folder === "snoozed") && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-xl px-2.5 text-xs"
                        disabled={bulkActionsDisabled}
                        onClick={runBulkMoveToInbox}
                      >
                        <Inbox className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden min-[380px]:inline">Move to Inbox</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Move selected to inbox</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 rounded-xl px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={bulkActionsDisabled}
                      onClick={folder === "trash" ? runBulkDeletePermanent : runBulkTrash}
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden min-[380px]:inline">
                        {folder === "trash" ? "Delete forever" : "Trash"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      {folder === "trash"
                        ? "Permanently delete selected emails"
                        : "Move selected to trash"}
                    </p>
                  </TooltipContent>
                </Tooltip>

                {folder !== "trash" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-xl px-2.5 text-xs"
                        disabled={bulkActionsDisabled}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden sm:inline">More</span>
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={6}
                      className="w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border/80 bg-card p-1 shadow-xl"
                    >
                      <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                        Selected ({listSelectedIds.size})
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2 rounded-lg text-xs" onClick={runBulkSpam}>
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                        Report spam
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 rounded-lg text-xs" onClick={runBulkMarkRead}>
                        <MailOpen className="h-3.5 w-3.5 shrink-0" />
                        Mark as read
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 rounded-lg text-xs" onClick={runBulkMarkUnread}>
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        Mark as unread
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="gap-2 rounded-lg text-xs">
                          <AlarmClock className="h-3.5 w-3.5 shrink-0" />
                          Snooze
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="rounded-xl border border-border/80 bg-card p-1 shadow-lg">
                          {snoozeOptions.map((opt) => (
                            <DropdownMenuItem
                              key={opt.label}
                              className="rounded-lg text-xs"
                              onClick={() => runBulkSnooze(opt.hours)}
                            >
                              {opt.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2 rounded-lg text-xs" onClick={runBulkStar}>
                        <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        Star
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 rounded-lg text-xs" onClick={runBulkRemoveStar}>
                        <StarOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        Remove star
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {filterPreset && (
                  <Badge variant="secondary" className="text-[11px] px-2.5 py-0.5 bg-primary/8 text-primary border border-primary/15 font-medium">
                    {filterBadgeCount} result{filterBadgeCount !== 1 ? "s" : ""}
                  </Badge>
                )}

                {/* Gmail-style pagination (1-50 of 376  ‹  › ) */}
                {!searchQuery.trim() && filteredEmails.length > 0 && (
                  <div className="flex items-center gap-1 pl-1 ml-1 border-l border-border/50">
                    <span
                      className="text-[11px] text-muted-foreground tabular-nums select-none px-1.5"
                      aria-live="polite"
                    >
                      <span className="font-medium text-foreground/80">
                        {pageStart.toLocaleString()}-{pageEnd.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground/70"> of </span>
                      <span className="font-medium text-foreground/80">
                        {totalForDisplay.toLocaleString()}
                        {knownTotal === 0 && hasMoreFromApi ? "+" : ""}
                      </span>
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg"
                          disabled={!canGoPrevPage}
                          onClick={goToPrevPage}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">Newer</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg"
                          disabled={!canGoNextPage}
                          onClick={goToNextPage}
                          aria-label="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">Older</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>

            {/* Email List */}
            <ScrollArea ref={emailListScrollRef} className="flex-1">
              {loading ? (
                <EmailListSkeleton />
              ) : (
                <>
                  <div className="space-y-2 px-2 py-2 pb-24 sm:px-3 sm:py-3 sm:pb-8 md:pb-10">
                    {filteredEmails.map((email, idx) => (
                      <EmailListItem
                        key={email.id}
                        email={email}
                        mailboxes={mailboxesList}
                        isSelected={false}
                        isChecked={listSelectedIds.has(email.id)}
                        onToggleChecked={() => toggleListEmailSelect(email.id)}
                        onMarkRead={() => handleUpdate(email.id, { read: true })}
                        onMarkUnread={() => handleUpdate(email.id, { read: false })}
                        onStar={() => handleUpdate(email.id, { starred: !email.starred })}
                        onDelete={() =>
                          folder === "trash"
                            ? setPermanentDeletePrompt({ type: "list", id: email.id })
                            : handleTrash(email.id)
                        }
                        onMoveToInbox={folder === "trash" || folder === "archive" || folder === "spam" || folder === "snoozed" ? () => handleMoveToInbox(email.id) : undefined}
                        onSelect={() => handleSelectEmail(email)}
                        showMailbox={filterMailbox === "all"}
                        index={idx}
                        deleteTooltip={folder === "trash" ? "Delete forever" : "Delete"}
                      />
                    ))}
                  </div>

                  {/* Empty State */}
                  {filteredEmails.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-6 animate-fade-in-up">
                      <div className="relative mb-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-inner">
                          <Inbox className="h-9 w-9 text-primary/40" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted border-2 border-background shadow-sm">
                          {searchQuery ? (
                            <Search className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : filterPreset ? (
                            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </div>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1.5">
                        {searchQuery ? "No matching emails" : filterPreset ? "No emails match this filter" : senderFilter ? "No emails from this sender" : folder !== "inbox" ? `No emails in ${INBOX_FOLDER_TITLE[folder] ?? folder}` : "All caught up!"}
                      </h3>
                      <p className="text-sm text-muted-foreground/70 text-center max-w-[280px] leading-relaxed">
                        {searchQuery
                          ? `No emails found for "${searchQuery}". Try a different search term.`
                          : filterPreset
                            ? "Try adjusting your filter or clearing it to see all emails."
                            : senderFilter
                              ? `No emails from ${senderFilter.from_name || senderFilter.from_email} in inbox.`
                              : folder !== "inbox"
                                ? folder === "star"
                                  ? "Star an email to see it here."
                                  : folder === "archive"
                                    ? "Archived messages appear here."
                                    : folder === "sent"
                                      ? "Sent messages will show here when synced as sent mail."
                                      : `Your ${folder} folder is empty.`
                                : "Your inbox is empty. New emails will appear here."}
                      </p>
                      {(searchQuery || filterPreset || senderFilter) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 gap-1.5 text-xs rounded-xl"
                          onClick={() => { setSearchQuery(""); clearFilterPreset(); clearSenderFilter(); }}
                        >
                          <X className="h-3 w-3" />
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Bottom pagination (mirrors Gmail: "1-50 of 376  ‹  ›") */}
                  {filteredEmails.length > 0 && !searchQuery.trim() && (
                    <div className="flex items-center justify-center gap-2 py-6">
                      <div className="h-px w-8 bg-border/40" />
                      <span className="text-[11px] text-muted-foreground/70 tabular-nums select-none">
                        {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of{" "}
                        {totalForDisplay.toLocaleString()}
                        {knownTotal === 0 && hasMoreFromApi ? "+" : ""}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg"
                        disabled={!canGoPrevPage}
                        onClick={goToPrevPage}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg"
                        disabled={!canGoNextPage}
                        onClick={goToNextPage}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="h-px w-8 bg-border/40" />
                    </div>
                  )}
                </>
              )}
            </ScrollArea>
          </>
        )}
      </div>

      <AlertDialog
        open={permanentDeletePrompt !== null}
        onOpenChange={(open) => {
          if (!open) setPermanentDeletePrompt(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {permanentDeletePrompt?.type === "bulk"
                ? `Delete ${listSelectedIds.size} email(s) forever?`
                : "Delete this email forever?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the message(s) from Email Assistant permanently, including attachments and AI index data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
              onClick={() => {
                const prompt = permanentDeletePrompt
                setPermanentDeletePrompt(null)
                if (!prompt) return
                if (prompt.type === "list") {
                  handleDeletePermanent(prompt.id)
                  return
                }
                const ids = [...listSelectedIds]
                if (ids.length === 0) return
                setEmailsList((prev) => prev.filter((e) => !ids.includes(e.id)))
                setListSelectedIds(new Set())
                setSelectedEmail((cur) => (cur && ids.includes(cur.id) ? null : cur))
                setLoading(true)
                emailsApi.bulkDelete(ids)
                  .then((res) => {
                    toast.success(`Permanently deleted ${res.processed} email(s)`)
                    window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
                    refreshMailboxCounts()
                    fetchMailboxesAndEmails().finally(() => setLoading(false))
                  })
                  .catch(() => { toast.error("Could not delete permanently"); setLoading(false) })
              }}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unique senders list dialog */}
      <Dialog open={showUniqueSendersDialog} onOpenChange={setShowUniqueSendersDialog}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Unique senders
            {uniqueSenders != null && (
              <span className="text-sm font-normal text-muted-foreground">
                ({uniqueSenders.unique_senders_count} total)
              </span>
            )}
          </DialogTitle>
          <ScrollArea className="flex-1 -mx-2 px-2 min-h-[200px] max-h-[60vh]">
            {uniqueSenders == null ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : uniqueSenders.senders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No senders in this inbox.</div>
            ) : (
              <ul className="space-y-1.5 py-2">
                {uniqueSenders.senders.map((s, i) => (
                  <li
                    key={s.from_email + String(i)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{s.from_name || s.from_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.from_email}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {s.count} email{s.count !== 1 ? "s" : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
