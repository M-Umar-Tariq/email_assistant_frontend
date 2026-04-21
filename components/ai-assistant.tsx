"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Send,
  Sparkles,
  FileText,
  ExternalLink,
  ChevronDown,
  Inbox,
  Search,
  MailOpen,
  Zap,
  RefreshCw,
  ArrowRight,
  Bot,
  User,
  MessageSquarePlus,
  Check,
  XCircle,
  Loader2,
  Mail,
  Forward,
  Reply,
  MessageSquare,
  Clock,
  Trash2,
  Archive,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  ai as aiApi,
  agent as agentApi,
  mailboxes as mailboxesApi,
  type MailboxApi,
  type AgentActionApi,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useAiChat } from "@/lib/ai-chat-context"
import type { ChatMessage } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import smartMailLogo from "@/logo/Smart Mail Logo.png"

const ACTION_ICONS: Record<string, typeof Mail> = {
  read_emails: MailOpen,
  open_email: MailOpen,
  open_latest_email: MailOpen,
  search_emails: Search,
  send_email: Mail,
  draft_email: Mail,
  draft_reply: Reply,
  send_reply: Reply,
  reply_all: Reply,
  forward_email: Forward,
  trash_email: Trash2,
  move_to_trash: Trash2,
  delete_email: Trash2,
  archive_email: Archive,
  mark_read: MailOpen,
  mark_unread: Mail,
  mark_all_read: MailOpen,
  mark_all_unread: Mail,
  snooze_email: Clock,
  send_whatsapp: MessageSquare,
  set_reminder: Clock,
}

const COMPOSE_ACTIONS = new Set([
  "send_email",
  "send_reply",
  "reply_all",
  "forward_email",
  "draft_email",
])

function formatRecipients(value: unknown): string {
  if (!value) return ""
  if (Array.isArray(value)) return value.filter(Boolean).map(String).join(", ")
  return String(value)
}

function ActionCard({
  action,
  isExecuting,
  onApprove,
  onReject,
}: {
  action: AgentActionApi
  isExecuting: boolean
  onApprove?: (action: AgentActionApi) => void
  onReject?: (action: AgentActionApi) => void
}) {
  const Icon = ACTION_ICONS[action.type] || Mail
  const isExecuted = action.status === "executed"
  const isRejected = action.status === "rejected"
  const showButtons = !isExecuted && !isRejected
  const isCompose = COMPOSE_ACTIONS.has(action.type)

  const toStr = formatRecipients(action.to)
  const ccStr = formatRecipients((action as AgentActionApi & { cc?: string | string[] }).cc)
  const subjectStr = (action.subject || "").trim()
  const bodyStr = (action.body || "").trim()
  const hasPreview = isCompose && (toStr || ccStr || subjectStr || bodyStr)
  const [bodyExpanded, setBodyExpanded] = useState(false)
  const BODY_SNIPPET = 320
  const bodyTooLong = bodyStr.length > BODY_SNIPPET
  const bodyShown = bodyExpanded || !bodyTooLong ? bodyStr : bodyStr.slice(0, BODY_SNIPPET).trimEnd() + "…"

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        isExecuted
          ? "border-emerald-400/30 bg-gradient-to-r from-emerald-500/[0.08] to-transparent shadow-sm shadow-emerald-500/5"
          : isRejected
            ? "border-red-400/30 bg-gradient-to-r from-red-500/[0.06] to-transparent opacity-60"
            : "border-amber-400/30 bg-gradient-to-r from-amber-500/[0.08] to-transparent hover:border-amber-400/45 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isExecuted ? "bg-emerald-500/10" : isRejected ? "bg-red-500/10" : "bg-amber-500/10",
        )}>
          <Icon className={cn(
            "h-5 w-5",
            isExecuted ? "text-emerald-500" : isRejected ? "text-red-500" : "text-amber-500",
          )} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-foreground">
            {action.label || action.type.replace(/_/g, " ")}
          </p>
          {action.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.description}</p>
          )}
          {isExecuted && <p className="text-xs text-emerald-500 mt-0.5 font-medium">Executed</p>}
          {isRejected && <p className="text-xs text-red-500 mt-0.5 font-medium">Rejected</p>}
        </div>
        {showButtons && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onApprove?.(action)}
              disabled={isExecuting}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              title="Approve"
            >
              {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onReject?.(action)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all hover:scale-105"
              title="Reject"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {hasPreview && (
        <div className="mx-4 mb-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 space-y-1.5">
          {toStr && (
            <div className="flex gap-2 text-xs">
              <span className="w-12 shrink-0 font-semibold text-muted-foreground uppercase tracking-wide">To</span>
              <span className="flex-1 break-words text-foreground/90">{toStr}</span>
            </div>
          )}
          {ccStr && (
            <div className="flex gap-2 text-xs">
              <span className="w-12 shrink-0 font-semibold text-muted-foreground uppercase tracking-wide">Cc</span>
              <span className="flex-1 break-words text-foreground/90">{ccStr}</span>
            </div>
          )}
          {subjectStr && (
            <div className="flex gap-2 text-xs">
              <span className="w-12 shrink-0 font-semibold text-muted-foreground uppercase tracking-wide">Subj</span>
              <span className="flex-1 break-words font-medium text-foreground">{subjectStr}</span>
            </div>
          )}
          {bodyStr && (
            <div className="pt-1 mt-1 border-t border-border/40">
              <pre className="text-xs text-foreground/85 whitespace-pre-wrap font-sans leading-relaxed">
                {bodyShown}
              </pre>
              {bodyTooLong && (
                <button
                  type="button"
                  onClick={() => setBodyExpanded((v) => !v)}
                  className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
                >
                  {bodyExpanded ? "Show less" : "Show full message"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ChatMessageBubble({
  message,
  index,
  onApprove,
  onReject,
  executingId,
}: {
  message: ChatMessage
  index: number
  onApprove?: (action: AgentActionApi) => void
  onReject?: (action: AgentActionApi) => void
  executingId?: string | null
}) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in-up",
        isUser ? "flex-row-reverse" : ""
      )}
      style={{ animationDelay: `${Math.min(index * 50, 200)}ms` }}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-1 transition-transform duration-200 hover:scale-105",
          isUser
            ? "bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/25 ring-1 ring-primary/20"
            : "bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/15 shadow-sm"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className={cn("flex-1 max-w-[92%]", isUser ? "flex flex-col items-end" : "")}>
        <div
          className={cn(
            "px-5 py-4 text-sm leading-relaxed",
            isUser
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-tr-md shadow-lg shadow-primary/20 ring-1 ring-primary/20"
              : "glass-card border border-border/50 rounded-2xl rounded-tl-md shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300"
          )}
        >
          <div className="whitespace-pre-line">
            {message.content.split(/(\*\*.*?\*\*)/g).map((part, i) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={i} className="font-semibold">
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              if (part.startsWith("_") && part.endsWith("_")) {
                return (
                  <em key={i} className="text-muted-foreground">
                    {part.slice(1, -1)}
                  </em>
                )
              }
              return <span key={i}>{part}</span>
            })}
          </div>
        </div>

        {/* Action cards */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2.5 space-y-2 w-full">
            {message.actions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                isExecuting={executingId === action.id}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))}
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <Collapsible defaultOpen={false} className="mt-2.5 group/sources">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm px-3 py-2.5 text-left hover:bg-muted/30 transition-colors">
                <span className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <FileText className="h-3.5 w-3.5 text-primary/70" />
                  Sources ({message.sources.length})
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/sources:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1.5 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-3 space-y-1 max-h-48 overflow-y-auto">
                {message.sources.map((source) => (
                  <button
                    key={source.emailId}
                    className="flex items-center gap-2.5 w-full text-left text-xs text-muted-foreground hover:text-foreground transition-all group rounded-lg px-2 py-1.5 -mx-1 hover:bg-muted/50"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      <FileText className="h-3 w-3 text-primary/70" />
                    </div>
                    <span className="truncate flex-1 group-hover:text-primary transition-colors font-medium">
                      {source.subject}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <span
          className={cn(
            "text-[10px] mt-1.5 font-medium block",
            isUser ? "text-primary-foreground/40" : "text-muted-foreground/50"
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in-up">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/15 shadow-sm mt-1">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-md glass-card border border-border/50 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
          <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "1s" }} />
          <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1s" }} />
        </div>
      </div>
    </div>
  )
}

const FALLBACK_SUGGESTIONS = [
  "What are my open action items?",
  "Who is waiting on my response?",
  "Summarize important emails from this week",
]

const CAPABILITIES = [
  {
    icon: Search,
    label: "Find emails",
    desc: "By sender, topic, or date",
    gradient: "from-sky-500/20 to-blue-500/10",
    iconColor: "text-sky-500",
    ring: "ring-sky-500/10",
  },
  {
    icon: MailOpen,
    label: "Summarize",
    desc: "Quick summaries of threads",
    gradient: "from-amber-500/20 to-orange-500/10",
    iconColor: "text-amber-500",
    ring: "ring-amber-500/10",
  },
  {
    icon: Zap,
    label: "Take actions",
    desc: "Send, reply, forward emails",
    gradient: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-500",
    ring: "ring-emerald-500/10",
  },
]

type AiAssistantProps = {
  /** When false, the panel is off-screen but the component stays mounted so async work can finish. */
  panelVisible?: boolean
}

export function AiAssistant({ panelVisible = true }: AiAssistantProps) {
  const { user } = useAuth()
  const { messages, setMessages, selectedMailbox, setSelectedMailbox, isQueryLoading, setIsQueryLoading } =
    useAiChat()
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(FALLBACK_SUGGESTIONS)
  const [input, setInput] = useState("")
  const [mailboxList, setMailboxList] = useState<MailboxApi[]>([])
  const [executingId, setExecutingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollBottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialDataLoadedRef = useRef(false)

  useEffect(() => {
    if (!panelVisible || initialDataLoadedRef.current) return
    initialDataLoadedRef.current = true
    aiApi.suggestedQuestions()
      .then((list) =>
        setSuggestedQuestions((list.length ? list : FALLBACK_SUGGESTIONS).slice(0, 4))
      )
      .catch(() => {})
    mailboxesApi
      .list()
      .then((list) => setMailboxList(list))
      .catch(() => {})
  }, [panelVisible])

  const firstName = user?.name?.split(" ")[0] ?? "there"
  const hasConversation = messages.length > 0

  useEffect(() => {
    if (messages.length === 0) return
    requestAnimationFrame(() => {
      scrollBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [messages.length, isQueryLoading])

  const handleRefresh = () => {
    setMessages([])
    setInput("")
    setIsQueryLoading(false)
    setExecutingId(null)
    aiApi.suggestedQuestions()
      .then((list) =>
        setSuggestedQuestions((list.length ? list : FALLBACK_SUGGESTIONS).slice(0, 4))
      )
      .catch(() => {})
    mailboxesApi
      .list()
      .then((list) => setMailboxList(list))
      .catch(() => {})
  }

  const handleApproveAction = useCallback(async (action: AgentActionApi) => {
    setExecutingId(action.id)
    try {
      const result = await agentApi.execute(action)
      const isCompleted = (result.status || "").toLowerCase() === "completed"
      const failedCount = Number(result.failed || 0)
      const markedCount = Number(result.marked || 1)
      if (!isCompleted || failedCount > 0 || markedCount <= 0) {
        const detail = result.execution_details || "Action ran but no email matched the target."
        throw new Error(detail)
      }
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          actions: msg.actions?.map((a) =>
            a.id === action.id ? { ...a, status: "executed" } : a
          ),
        }))
      )
      toast.success(`${action.label || action.type.replace(/_/g, " ")} executed!`)
      window.dispatchEvent(new CustomEvent("email:action-executed"))
      window.dispatchEvent(new CustomEvent("mailbox:sync-complete"))
      window.dispatchEvent(
        new CustomEvent("email:sync", { detail: { newCount: 0, flagsUpdated: markedCount } })
      )

      if (action.type === "open_email" || action.type === "open_latest_email") {
        const opened = result.email
        const openedId =
          (opened && (opened.id as string | undefined)) ||
          (opened && (opened._id as string | undefined)) ||
          action.email_id
        if (openedId) {
          window.dispatchEvent(
            new CustomEvent("assistant:openEmail", { detail: { emailId: openedId } })
          )
        }
      }
    } catch (e) {
      const detail = e instanceof Error && e.message ? e.message : "Failed to execute action"
      toast.error(detail)
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          actions: msg.actions?.map((a) =>
            a.id === action.id ? { ...a, status: "failed" } : a
          ),
        }))
      )
    } finally {
      setExecutingId(null)
    }
  }, [])

  const handleRejectAction = useCallback(async (action: AgentActionApi) => {
    try {
      await agentApi.reject(action.id)
    } catch { /* ignore */ }
    setMessages((prev) =>
      prev.map((msg) => ({
        ...msg,
        actions: msg.actions?.map((a) =>
          a.id === action.id ? { ...a, status: "rejected" } : a
        ),
      }))
    )
  }, [])

  const handleSend = async (query: string) => {
    if (!query.trim()) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: query.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsQueryLoading(true)

    try {
      const mbId = selectedMailbox === "all" ? undefined : selectedMailbox
      const recent = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
        sources: m.sources,
      }))
      const res = await aiApi.ask(query.trim(), mbId, recent)
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: res.answer,
        sources:
          res.sources?.map((s) => ({ emailId: s.email_id, subject: s.subject })) ?? undefined,
        actions: res.actions?.length ? res.actions : undefined,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: "Sorry, I couldn't process your request. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsQueryLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-gradient-to-b from-background to-muted/[0.12]">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="relative min-w-0 shrink-0 overflow-visible border-b border-border/60 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-blue-500/[0.02]" />
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-40 w-40 translate-y-1/2 rounded-full bg-violet-500/[0.03] blur-3xl" />
        <div className="relative flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 opacity-50 blur-lg" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/15 sm:h-11 sm:w-11">
                <Image src={smartMailLogo} alt="Smart Mail Assistant" className="h-6 w-6 object-contain" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500 shadow-md">
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-40" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                Smart Mail{" "}
                <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
                  Assistant
                </span>
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80">
                <Sparkles className="h-2.5 w-2.5 text-primary/60" />
                Ask anything or take actions on your emails
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:shrink-0">
            {hasConversation && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isQueryLoading}
                className="h-9 gap-1.5 rounded-xl text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">New chat</span>
              </Button>
            )}
            {mailboxList.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex max-w-full min-w-0 items-center gap-1.5 rounded-xl border border-border/60 bg-card/70 px-2.5 py-2 text-xs text-muted-foreground outline-none transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground hover:shadow-md focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background sm:gap-2 sm:px-3.5"
                    aria-label={
                      selectedMailbox === "all"
                        ? `Search all mailboxes, ${mailboxList.length} account${mailboxList.length !== 1 ? "s" : ""} linked`
                        : "Select mailbox"
                    }
                    title={
                      selectedMailbox === "all"
                        ? `${mailboxList.length} mailbox${mailboxList.length !== 1 ? "es" : ""} linked — not your inbox email count`
                        : undefined
                    }
                  >
                    <Inbox className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate text-left font-medium text-foreground">
                      {selectedMailbox === "all" ? (
                        <>
                          <span className="sm:hidden">All · {mailboxList.length} acct</span>
                          <span className="hidden sm:inline">
                            All mailboxes
                            <span className="ml-1 font-normal text-muted-foreground">
                              · {mailboxList.length} account{mailboxList.length !== 1 ? "s" : ""}
                            </span>
                          </span>
                        </>
                      ) : (
                        mailboxList.find((m) => m.id === selectedMailbox)?.name ?? "Mailbox"
                      )}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="min-w-[220px] rounded-xl py-1.5"
                  sideOffset={6}
                >
                  <DropdownMenuItem
                    onClick={() => setSelectedMailbox("all")}
                    className={cn(
                      "flex cursor-pointer flex-col items-stretch gap-0.5 px-3.5 py-2.5",
                      selectedMailbox === "all" && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Inbox className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-medium">All mailboxes</span>
                    </span>
                    <span className="pl-7 text-[10px] font-normal leading-snug text-muted-foreground">
                      Search across every linked account ({mailboxList.length} connected)
                    </span>
                  </DropdownMenuItem>
                  {mailboxList.map((mb) => (
                    <DropdownMenuItem
                      key={mb.id}
                      onClick={() => setSelectedMailbox(mb.id)}
                      className={cn(
                        "flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer",
                        selectedMailbox === mb.id && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background"
                        style={{
                          backgroundColor: mb.color || "#64748b",
                          boxShadow: `0 0 6px ${mb.color || "#64748b"}30`,
                        }}
                      />
                      <span className="truncate font-medium flex-1">{mb.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 max-w-[100px] truncate">
                        {mb.email}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {!hasConversation ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-5 sm:px-6 sm:py-8">
          <div className="animate-entrance flex w-full max-w-xl flex-col items-center">
            {/* Animated hero icon */}
            <div className="group relative mb-4 sm:mb-6">
              <div className="absolute -inset-4 animate-gradient rounded-full bg-gradient-to-r from-primary/25 via-blue-500/15 to-violet-500/20 opacity-80 blur-3xl sm:-inset-8" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 shadow-xl shadow-primary/15 ring-1 ring-primary/15 transition-all duration-500 group-hover:rotate-1 group-hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem]">
                <Image src={smartMailLogo} alt="Smart Mail Assistant" className="h-10 w-10 object-contain transition-transform duration-500 group-hover:scale-105 sm:h-11 sm:w-11" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-emerald-500 shadow-lg sm:h-6 sm:w-6">
                <div className="h-1.5 w-1.5 rounded-full bg-white sm:h-2 sm:w-2" />
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-40" />
              </div>
            </div>

            {/* AI-powered pill */}
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary shadow-sm shadow-primary/5 backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              AI-powered email workspace
            </div>

            <h2 className="mb-2 text-center text-xl font-extrabold tracking-tight text-foreground sm:text-[26px]">
              Hi {firstName},{" "}
              <span className="bg-gradient-to-r from-primary via-sky-500 to-violet-500 bg-clip-text text-transparent">
                how can I help?
              </span>
            </h2>
            <p className="mb-4 max-w-md text-center text-sm leading-relaxed text-muted-foreground/85 sm:mb-8">
              I can search, summarize, answer questions, and take actions like sending,
              replying, and forwarding emails.
            </p>

            {/* Capability cards — desktop only (hidden on mobile) */}
            <div className="briefing-stagger mb-5 hidden w-full gap-3 sm:mb-8 sm:grid sm:grid-cols-3">
              {CAPABILITIES.map((cap, i) => (
                <div
                  key={cap.label}
                  className={cn(
                    "group/card relative flex flex-col items-center gap-2 rounded-2xl border border-border/50 p-3 text-center sm:gap-2.5 sm:p-4",
                    "glass-card glow-ring",
                    "cursor-default transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/8",
                  )}
                  style={{ animationDelay: `${i * 100 + 200}ms` }}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ring-1 transition-all duration-300 group-hover/card:scale-105 group-hover/card:shadow-md sm:h-11 sm:w-11",
                      cap.gradient,
                      cap.ring
                    )}
                  >
                    <cap.icon className={cn("h-4 w-4 sm:h-[18px] sm:w-[18px]", cap.iconColor)} />
                  </div>
                  <p className="text-xs font-bold text-foreground">{cap.label}</p>
                  <p className="px-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
                    {cap.desc}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      ) : (
        <ScrollArea
          className="min-h-0 min-w-0 flex-1 px-4 sm:px-6"
          ref={scrollRef}
        >
          <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-5 py-6 pb-4">
            {messages.map((message, idx) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                index={idx}
                onApprove={handleApproveAction}
                onReject={handleRejectAction}
                executingId={executingId}
              />
            ))}
            {isQueryLoading && <TypingIndicator />}
            <div ref={scrollBottomRef} className="min-h-0 shrink-0" aria-hidden />
          </div>
        </ScrollArea>
      )}

      {/* ── Input Area ──────────────────────────────────────────────── */}
      <div className="relative shrink-0 border-t border-border/60 bg-gradient-to-t from-background via-background/95 to-muted/[0.08] backdrop-blur-md">
        {/* Subtle ambient glow behind input */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-primary/[0.04] to-transparent"
        />
        <div className="relative mx-auto w-full max-w-3xl px-4 pb-6 pt-3 sm:pb-3.5">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend(input)
            }}
            className="group/input relative mx-auto flex w-full max-w-lg items-end gap-2 rounded-2xl border border-border/50 bg-card/85 px-4 py-2.5 shadow-lg shadow-black/[0.03] backdrop-blur-md transition-all duration-300 focus-within:border-primary/40 focus-within:bg-card/95 focus-within:shadow-xl focus-within:shadow-primary/10 focus-within:ring-4 focus-within:ring-primary/10 sm:max-w-none"
          >
            <textarea
              ref={inputRef}
              placeholder="Ask about your emails..."
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              disabled={isQueryLoading}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50 max-h-[120px] py-1 leading-relaxed"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isQueryLoading}
              className={cn(
                "group/send relative h-10 w-10 shrink-0 overflow-hidden rounded-xl transition-all duration-300",
                input.trim()
                  ? "bg-gradient-to-br from-primary to-sky-500 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:scale-[1.05] active:scale-[0.95]"
                  : "bg-muted/80 text-muted-foreground",
              )}
            >
              {/* Shimmer sweep on active */}
              {input.trim() && (
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/send:translate-x-full" />
              )}
              <Send
                className={cn(
                  "relative h-4 w-4 transition-all duration-300",
                  input.trim() && "-translate-x-[1px] -translate-y-[1px] group-hover/send:translate-x-0 group-hover/send:translate-y-0 group-hover/send:rotate-12",
                )}
              />
            </Button>
          </form>
          <p className="mx-auto mt-2.5 flex max-w-lg items-center justify-center gap-1.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground/55 sm:max-w-none">
            Press{" "}
            <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/80">
              Enter
            </kbd>{" "}
            to send &middot;{" "}
            <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/80">
              Shift
            </kbd>
            +
            <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/80">
              Enter
            </kbd>{" "}
            for new line
          </p>
        </div>
      </div>
    </div>
  )
}
