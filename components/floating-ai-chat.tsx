"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Send,
  FileText,
  ExternalLink,
  ChevronDown,
  Inbox,
  Search,
  MailOpen,
  Zap,
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
  X,
  Minus,
  Maximize2,
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
import smartMailLogoWhite from "@/logo/Smart Mail Logo White.png"

const ACTION_ICONS: Record<string, typeof Mail> = {
  send_email: Mail,
  draft_reply: Reply,
  send_reply: Reply,
  reply_all: Reply,
  forward_email: Forward,
  send_whatsapp: MessageSquare,
  set_reminder: Clock,
  trash_email: Trash2,
  archive_email: Archive,
  mark_read: MailOpen,
  mark_unread: Mail,
  mark_all_read: MailOpen,
  mark_all_unread: Mail,
  snooze_email: Clock,
  delete_email: Trash2,
}

const FLOATING_COMPOSE_ACTIONS = new Set([
  "send_email",
  "send_reply",
  "reply_all",
  "forward_email",
  "draft_email",
])

function formatFloatingRecipients(value: unknown): string {
  if (!value) return ""
  if (Array.isArray(value)) return value.filter(Boolean).map(String).join(", ")
  return String(value)
}

function FloatingActionCard({
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
  const showButtons = !isExecuted && !isRejected && action.requires_approval
  const isCompose = FLOATING_COMPOSE_ACTIONS.has(action.type)

  const toStr = formatFloatingRecipients(action.to)
  const ccStr = formatFloatingRecipients((action as AgentActionApi & { cc?: string | string[] }).cc)
  const subjectStr = (action.subject || "").trim()
  const bodyStr = (action.body || "").trim()
  const hasPreview = isCompose && (toStr || ccStr || subjectStr || bodyStr)
  const [bodyExpanded, setBodyExpanded] = useState(false)
  const BODY_SNIPPET = 220
  const bodyTooLong = bodyStr.length > BODY_SNIPPET
  const bodyShown = bodyExpanded || !bodyTooLong ? bodyStr : bodyStr.slice(0, BODY_SNIPPET).trimEnd() + "…"

  return (
    <div
      className={cn(
        "rounded-xl border transition-all text-xs",
        isExecuted
          ? "border-emerald-400/25 bg-emerald-500/[0.06]"
          : isRejected
            ? "border-red-400/25 bg-red-500/[0.06] opacity-60"
            : "border-amber-400/25 bg-amber-500/[0.06]",
      )}
    >
      <div className="flex items-start gap-2.5 px-3 py-2">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isExecuted ? "bg-emerald-500/10" : isRejected ? "bg-red-500/10" : "bg-amber-500/10",
        )}>
          <Icon className={cn(
            "h-3.5 w-3.5",
            isExecuted ? "text-emerald-500" : isRejected ? "text-red-500" : "text-amber-500",
          )} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-medium text-foreground truncate">
            {action.label || action.type.replace(/_/g, " ")}
          </p>
          {isExecuted && <p className="text-emerald-500 font-medium">Executed</p>}
          {isRejected && <p className="text-red-500 font-medium">Rejected</p>}
        </div>
        {showButtons && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onApprove?.(action)}
              disabled={isExecuting}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              title="Approve"
            >
              {isExecuting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </button>
            <button
              onClick={() => onReject?.(action)}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
              title="Reject"
            >
              <XCircle className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      {hasPreview && (
        <div className="mx-3 mb-2 rounded-lg border border-border/50 bg-background/40 px-2.5 py-2 space-y-1">
          {toStr && (
            <div className="flex gap-1.5">
              <span className="w-10 shrink-0 font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">To</span>
              <span className="flex-1 break-words text-foreground/90">{toStr}</span>
            </div>
          )}
          {ccStr && (
            <div className="flex gap-1.5">
              <span className="w-10 shrink-0 font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Cc</span>
              <span className="flex-1 break-words text-foreground/90">{ccStr}</span>
            </div>
          )}
          {subjectStr && (
            <div className="flex gap-1.5">
              <span className="w-10 shrink-0 font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Subj</span>
              <span className="flex-1 break-words font-medium text-foreground">{subjectStr}</span>
            </div>
          )}
          {bodyStr && (
            <div className="pt-1 mt-1 border-t border-border/40">
              <pre className="whitespace-pre-wrap font-sans leading-relaxed text-foreground/85">{bodyShown}</pre>
              {bodyTooLong && (
                <button
                  type="button"
                  onClick={() => setBodyExpanded((v) => !v)}
                  className="mt-1 text-[10px] font-medium text-primary hover:underline"
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

function FloatingChatBubble({
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
        "flex gap-2.5 animate-fade-in-up",
        isUser ? "flex-row-reverse" : ""
      )}
      style={{ animationDelay: `${Math.min(index * 50, 200)}ms` }}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5",
          isUser
            ? "bg-gradient-to-br from-primary to-primary/80 shadow-sm shadow-primary/20"
            : "bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-primary-foreground" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
      <div className={cn("flex-1 max-w-[88%]", isUser ? "flex flex-col items-end" : "")}>
        <div
          className={cn(
            "px-3.5 py-2.5 text-[13px] leading-relaxed",
            isUser
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-tr-sm shadow-md shadow-primary/15"
              : "bg-muted/50 border border-border/40 rounded-2xl rounded-tl-sm"
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
              return <span key={i}>{part}</span>
            })}
          </div>
        </div>

        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 space-y-1.5 w-full">
            {message.actions.map((action) => (
              <FloatingActionCard
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
          <Collapsible defaultOpen={false} className="mt-2 group/sources">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1.5 text-left hover:bg-muted/50 transition-colors">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <FileText className="h-3 w-3 text-primary/70" />
                  Sources ({message.sources.length})
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/sources:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 rounded-lg border border-border/40 bg-muted/20 p-2 space-y-0.5 max-h-32 overflow-y-auto">
                {message.sources.map((source) => (
                  <button
                    key={source.emailId}
                    className="flex items-center gap-2 w-full text-left text-[11px] text-muted-foreground hover:text-foreground transition-colors group rounded-md px-2 py-1 hover:bg-muted/50"
                  >
                    <FileText className="h-3 w-3 text-primary/60 shrink-0" />
                    <span className="truncate flex-1 group-hover:text-primary font-medium">
                      {source.subject}
                    </span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <span className={cn(
          "text-[9px] mt-1 font-medium block",
          isUser ? "text-primary-foreground/40" : "text-muted-foreground/40"
        )}>
          {new Date(message.timestamp).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  )
}

function FloatingTypingIndicator() {
  return (
    <div className="flex gap-2.5 animate-fade-in-up">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 mt-0.5">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted/50 border border-border/40 px-4 py-3">
        <p className="mb-1.5 text-[11px] font-medium text-foreground/80">Thinking...</p>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
          <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "1s" }} />
          <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1s" }} />
        </div>
      </div>
    </div>
  )
}

const QUICK_SUGGESTIONS = [
  "Summarize my unread emails",
  "What needs my attention today?",
  "Any urgent messages?",
]

const MINI_CAPABILITIES = [
  { icon: Search, label: "Search", desc: "Find any email", color: "text-sky-500", bg: "bg-sky-500/10" },
  { icon: MailOpen, label: "Summarize", desc: "Quick summaries", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Zap, label: "Actions", desc: "Send & reply", color: "text-emerald-500", bg: "bg-emerald-500/10" },
]

interface FloatingAiChatProps {
  activeView?: string
  onNavigateToAssistant?: () => void
}

/** Views where the floating launcher is hidden (same list as previous `hideOnViews`). */
const FLOATING_CHAT_HIDDEN_ON_VIEWS = new Set(["assistant", "agent"])

export function FloatingAiChat({ activeView, onNavigateToAssistant }: FloatingAiChatProps) {
  const { user } = useAuth()
  const { messages, setMessages, selectedMailbox, setSelectedMailbox, isQueryLoading, setIsQueryLoading } =
    useAiChat()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [mailboxList, setMailboxList] = useState<MailboxApi[]>([])
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  /** Email detail “AI Chat” strip from the right */
  const [isInboxAiPanelOpen, setIsInboxAiPanelOpen] = useState(false)
  /** Inbox list Smart Mail Filter dock (same width as layout shift) */
  const [isInboxAiFilterOpen, setIsInboxAiFilterOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollBottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const mailboxListFetchDoneRef = useRef(false)
  const refreshMailboxList = useCallback(() => {
    mailboxesApi
      .list()
      .then((list) => {
        setMailboxList(list)
        mailboxListFetchDoneRef.current = true
      })
      .catch(() => {
        mailboxListFetchDoneRef.current = true
      })
  }, [])

  const shouldHide = Boolean(activeView && FLOATING_CHAT_HIDDEN_ON_VIEWS.has(activeView))
  /** Align with inbox dock `min(92vw,400px)` + page padding so FAB clears the panel */
  const floatingRightClass =
    activeView === "inbox" && (isInboxAiPanelOpen || isInboxAiFilterOpen)
      ? "right-[calc(1rem+min(92vw,400px))] sm:right-[calc(1.5rem+400px)]"
      : "right-4 sm:right-6"
  const shouldHideRef = useRef(shouldHide)
  const isOpenRef = useRef(isOpen)
  shouldHideRef.current = shouldHide
  isOpenRef.current = isOpen

  useEffect(() => {
    refreshMailboxList()
  }, [refreshMailboxList])

  useEffect(() => {
    const onMailboxChange = () => refreshMailboxList()
    window.addEventListener("mailbox:updated", onMailboxChange)
    window.addEventListener("mailbox:sync-complete", onMailboxChange)
    return () => {
      window.removeEventListener("mailbox:updated", onMailboxChange)
      window.removeEventListener("mailbox:sync-complete", onMailboxChange)
    }
  }, [refreshMailboxList])

  useEffect(() => {
    const onInboxAiPanelToggled = (e: Event) => {
      const open = Boolean((e as CustomEvent<{ open?: boolean }>).detail?.open)
      setIsInboxAiPanelOpen(open)
    }
    window.addEventListener("inbox:aiChatPanelToggled", onInboxAiPanelToggled as EventListener)
    return () => {
      window.removeEventListener("inbox:aiChatPanelToggled", onInboxAiPanelToggled as EventListener)
    }
  }, [])

  useEffect(() => {
    const onInboxAiFilter = (e: Event) => {
      const open = Boolean((e as CustomEvent<{ open?: boolean }>).detail?.open)
      setIsInboxAiFilterOpen(open)
    }
    window.addEventListener("inbox:aiFilterSidebar", onInboxAiFilter as EventListener)
    return () => window.removeEventListener("inbox:aiFilterSidebar", onInboxAiFilter as EventListener)
  }, [])

  useEffect(() => {
    if (activeView !== "inbox") {
      setIsInboxAiPanelOpen(false)
      setIsInboxAiFilterOpen(false)
    }
  }, [activeView])

  useEffect(() => {
    if (selectedMailbox === "all") return
    if (!mailboxListFetchDoneRef.current) return
    if (mailboxList.length === 0) {
      setSelectedMailbox("all")
      return
    }
    if (!mailboxList.some((m) => m.id === selectedMailbox)) {
      setSelectedMailbox("all")
    }
  }, [mailboxList, selectedMailbox, setSelectedMailbox])

  const firstName = user?.name?.split(" ")[0] ?? "there"
  const hasConversation = messages.length > 0

  useEffect(() => {
    if (!isOpen || messages.length === 0) return
    requestAnimationFrame(() => {
      scrollBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [messages.length, isQueryLoading, isOpen])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldHideRef.current) return
      if ((e.ctrlKey || e.metaKey) && e.key === "j") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === "Escape" && isOpenRef.current) {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleRefresh = () => {
    setMessages([])
    setInput("")
    setIsQueryLoading(false)
    setExecutingId(null)
  }

  const handleApproveAction = useCallback(async (action: AgentActionApi) => {
    setExecutingId(action.id)
    try {
      const scopedMailboxId = selectedMailbox !== "all" ? selectedMailbox : undefined
      const scopedAction =
        !action.mailbox_id && scopedMailboxId
          ? { ...action, mailbox_id: scopedMailboxId }
          : action
      const result = await agentApi.execute(scopedAction)
      const isCompleted = (result.status || "").toLowerCase() === "completed"
      const failedCount = Number(result.failed || 0)
      const markedCount = Number(result.marked || 1)
      if (!isCompleted || failedCount > 0 || markedCount <= 0) {
        throw new Error(result.execution_details || "Action ran but no email matched the target.")
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
  }, [selectedMailbox])

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
      id: `fc-${Date.now()}`,
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
        id: `fc-${Date.now() + 1}`,
        role: "assistant",
        content: res.answer,
        sources:
          res.sources?.map((s) => ({ emailId: s.email_id, subject: s.subject })) ?? undefined,
        actions: res.actions?.length ? res.actions : undefined,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      if (!isOpen) setUnreadCount((c) => c + 1)
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `fc-${Date.now() + 1}`,
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
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`
  }

  return (
    <div className={cn(shouldHide && "hidden pointer-events-none")} aria-hidden={shouldHide}>
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[98] transition-opacity duration-300 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed z-[99] flex flex-col bg-background/95 backdrop-blur-xl border border-border/60 shadow-2xl shadow-black/10",
          "transition-all duration-300 ease-out",
          "bottom-4 sm:bottom-6",
          floatingRightClass,
          "w-[calc(100vw-2rem)] sm:w-[420px]",
          "h-[min(600px,calc(100vh-8rem))]",
          "rounded-2xl overflow-hidden",
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        )}
      >
        {/* Panel Header */}
        <div className="shrink-0 border-b border-border/40 bg-gradient-to-r from-primary/[0.04] via-transparent to-primary/[0.02]">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/20">
                  <Image src={smartMailLogoWhite} alt="Smart Mail Assistant" className="h-6 w-6 object-contain" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-[1.5px] border-background">
                  <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground leading-tight">Smart Mail Assistant</h3>
                <p className="text-[10px] text-muted-foreground">Ask anything about your emails</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {hasConversation && (
                <button
                  onClick={handleRefresh}
                  disabled={isQueryLoading}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                  title="New chat"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                </button>
              )}
              {onNavigateToAssistant && (
                <button
                  onClick={() => {
                    setIsOpen(false)
                    onNavigateToAssistant()
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="Open full assistant"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Minimize"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Mailbox selector */}
          {mailboxList.length > 0 && (
            <div className="px-4 pb-2.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all outline-none w-full text-left">
                    <Inbox className="h-3 w-3 shrink-0" />
                    <span className="truncate flex-1 text-left font-medium">
                      {selectedMailbox === "all"
                        ? `All Mailboxes (${mailboxList.length})`
                        : mailboxList.find((m) => m.id === selectedMailbox)?.name ?? "Mailbox"}
                    </span>
                    <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="z-[110] min-w-[200px] rounded-xl" sideOffset={4}>
                  <DropdownMenuItem
                    onClick={() => setSelectedMailbox("all")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 cursor-pointer text-xs",
                      selectedMailbox === "all" && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <Inbox className="h-3 w-3" />
                    All Mailboxes
                  </DropdownMenuItem>
                  {mailboxList.map((mb) => (
                    <DropdownMenuItem
                      key={mb.id}
                      onClick={() => setSelectedMailbox(mb.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 cursor-pointer text-xs",
                        selectedMailbox === mb.id && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: mb.color || "#64748b" }}
                      />
                      <span className="truncate flex-1 font-medium">{mb.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Chat Content */}
        {!hasConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5 overflow-y-auto">
            <div className="w-full max-w-sm flex flex-col items-center">
              <div className="relative mb-4">
                <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 blur-xl opacity-60" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/90 ring-1 ring-primary/20 shadow-lg shadow-primary/20">
                  <Image src={smartMailLogoWhite} alt="Smart Mail Assistant" className="h-8 w-8 object-contain" />
                </div>
              </div>

              <h4 className="text-base font-semibold text-foreground mb-1 tracking-tight">
                Hey {firstName}!
              </h4>
              <p className="text-xs text-muted-foreground text-center mb-5 leading-relaxed">
                I can search, summarize, and take actions on your emails.
              </p>

              {/* Mini capability pills */}
              <div className="flex gap-2 w-full mb-5">
                {MINI_CAPABILITIES.map((cap) => (
                  <div
                    key={cap.label}
                    className="flex-1 flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-card/50 p-2.5 text-center"
                  >
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", cap.bg)}>
                      <cap.icon className={cn("h-3.5 w-3.5", cap.color)} />
                    </div>
                    <p className="text-[10px] font-semibold text-foreground">{cap.label}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">{cap.desc}</p>
                  </div>
                ))}
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-col gap-1.5 w-full">
                {QUICK_SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="group flex items-center justify-between text-left text-xs px-3.5 py-2.5 rounded-xl border border-border/50 bg-card/30 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <span>{q}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 px-4 overflow-y-auto overflow-x-hidden" ref={scrollRef}>
            <div className="flex flex-col gap-4 py-4">
              {messages.map((message, idx) => (
                <FloatingChatBubble
                  key={message.id}
                  message={message}
                  index={idx}
                  onApprove={handleApproveAction}
                  onReject={handleRejectAction}
                  executingId={executingId}
                />
              ))}
              {isQueryLoading && <FloatingTypingIndicator />}
              <div ref={scrollBottomRef} className="min-h-0 shrink-0" aria-hidden />
            </div>
          </ScrollArea>
        )}

        {/* Input Area */}
        <div className="shrink-0 border-t border-border/40 bg-gradient-to-t from-background to-background/80">
          <div className="px-3.5 py-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend(input)
              }}
              className="relative flex items-end gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 transition-all duration-200 focus-within:border-primary/40 focus-within:shadow-md focus-within:shadow-primary/5 focus-within:ring-1 focus-within:ring-primary/20"
            >
              <textarea
                ref={inputRef}
                placeholder="Ask about your emails..."
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                disabled={isQueryLoading}
                rows={1}
                className="flex-1 resize-none bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50 max-h-[100px] py-0.5 leading-relaxed"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isQueryLoading}
                className={cn(
                  "h-8 w-8 shrink-0 rounded-lg transition-all duration-300",
                  input.trim()
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:scale-105 active:scale-95"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Send className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  input.trim() && "-translate-x-[1px] -translate-y-[1px]"
                )} />
              </Button>
            </form>
            <p className="text-[9px] text-muted-foreground/40 text-center mt-1.5 font-medium">
              Enter to send &middot; Ctrl+J to toggle
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "fixed z-[100] group",
          "bottom-4 sm:bottom-6",
          floatingRightClass,
          "transition-all duration-300 ease-out",
          isOpen && "opacity-0 scale-0 pointer-events-none"
        )}
        aria-label="Open Smart Mail Assistant"
      >
        {/* Outer glow ring */}
        <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient" />

        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-30" style={{ animationDuration: "3s" }} />

        {/* Button body */}
        <div className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-primary via-primary to-primary/90",
          "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
          "transition-all duration-300 hover:scale-110 active:scale-95",
          "ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
        )}>
          {isQueryLoading ? (
            <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
          ) : (
            <Image src={smartMailLogoWhite} alt="Smart Mail Assistant" className="h-7 w-7 object-contain transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
          )}
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md shadow-red-500/30 animate-bounce" style={{ animationDuration: "2s" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}

        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
          Smart Mail Assistant
          <span className="ml-1.5 text-[10px] opacity-60">Ctrl+J</span>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-foreground rotate-45" />
        </div>
      </button>
    </>
    </div>
  )
}
