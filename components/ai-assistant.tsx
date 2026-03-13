"use client"

import { useState, useRef, useEffect, useCallback } from "react"
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
  Pencil,
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
import type { ChatMessage } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const ACTION_ICONS: Record<string, typeof Mail> = {
  send_email: Mail,
  draft_reply: Reply,
  send_reply: Reply,
  forward_email: Forward,
  send_whatsapp: MessageSquare,
  set_reminder: Clock,
  trash_email: Trash2,
  archive_email: Archive,
  mark_read: MailOpen,
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
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-1 transition-transform duration-200 hover:scale-110",
          isUser
            ? "bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20"
            : "bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10"
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
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-tr-md shadow-lg shadow-primary/15"
              : "bg-card border border-border/60 rounded-2xl rounded-tl-md shadow-sm hover:shadow-md transition-shadow duration-300"
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
            {message.actions.map((action) => {
              const Icon = ACTION_ICONS[action.type] || Mail
              const isExecuted = action.status === "executed"
              const isRejected = action.status === "rejected"
              const isExecuting = executingId === action.id
              const showButtons = !isExecuted && !isRejected && action.requires_approval

              return (
                <div
                  key={action.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
                    isExecuted
                      ? "border-emerald-400/25 bg-gradient-to-r from-emerald-500/[0.06] to-transparent"
                      : isRejected
                        ? "border-red-400/25 bg-gradient-to-r from-red-500/[0.06] to-transparent opacity-60"
                        : "border-amber-400/25 bg-gradient-to-r from-amber-500/[0.06] to-transparent hover:border-amber-400/40"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    isExecuted ? "bg-emerald-500/10" : isRejected ? "bg-red-500/10" : "bg-amber-500/10"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5",
                      isExecuted ? "text-emerald-500" : isRejected ? "text-red-500" : "text-amber-500"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground">
                      {action.label || action.type.replace(/_/g, " ")}
                    </p>
                    {action.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{action.description}</p>
                    )}
                    {isExecuted && (
                      <p className="text-xs text-emerald-500 mt-0.5 font-medium">Executed</p>
                    )}
                    {isRejected && (
                      <p className="text-xs text-red-500 mt-0.5 font-medium">Rejected</p>
                    )}
                  </div>
                  {showButtons && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onApprove?.(action as AgentActionApi)}
                        disabled={isExecuting}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        title="Approve"
                      >
                        {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => onReject?.(action as AgentActionApi)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all hover:scale-105"
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
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
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 mt-1">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-md bg-card border border-border/60 px-5 py-4 shadow-sm">
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

export function AiAssistant() {
  const { user } = useAuth()
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(FALLBACK_SUGGESTIONS)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mailboxList, setMailboxList] = useState<MailboxApi[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState<string>("all")
  const [executingId, setExecutingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollBottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    aiApi.suggestedQuestions()
      .then((list) =>
        setSuggestedQuestions((list.length ? list : FALLBACK_SUGGESTIONS).slice(0, 4))
      )
      .catch(() => {})
    mailboxesApi
      .list()
      .then((list) => setMailboxList(list))
      .catch(() => {})
  }, [])

  const firstName = user?.name?.split(" ")[0] ?? "there"
  const hasConversation = messages.length > 0

  useEffect(() => {
    if (messages.length === 0) return
    requestAnimationFrame(() => {
      scrollBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [messages.length, isLoading])

  const handleRefresh = () => {
    setMessages([])
    setInput("")
    setIsLoading(false)
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
      await agentApi.execute(action)
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          actions: msg.actions?.map((a) =>
            a.id === action.id ? { ...a, status: "executed" } : a
          ),
        }))
      )
      toast.success(`${action.label || action.type.replace(/_/g, " ")} executed!`)
    } catch {
      toast.error("Failed to execute action")
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
    setIsLoading(true)

    try {
      const mbId = selectedMailbox === "all" ? undefined : selectedMailbox
      const recent = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
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
      setIsLoading(false)
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
    <div className="flex h-full flex-col bg-background">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="relative shrink-0 border-b border-border/50 overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-primary/[0.02]" />
        <div className="relative flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 shadow-sm">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background shadow-sm">
                <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight">
                AI Assistant
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Ask anything or take actions on your emails
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasConversation && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New chat</span>
              </Button>
            )}
            {mailboxList.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/80 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2"
                    aria-label="Select mailbox"
                  >
                    <Inbox className="h-3.5 w-3.5" />
                    <span className="max-w-[140px] truncate font-medium">
                      {selectedMailbox === "all"
                        ? `All Mailboxes (${mailboxList.length})`
                        : mailboxList.find((m) => m.id === selectedMailbox)?.name ?? "Mailbox"}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0" />
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
                      "flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer",
                      selectedMailbox === "all" && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <Inbox className="h-3.5 w-3.5" />
                    All Mailboxes
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
        <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
          <div className="max-w-lg w-full flex flex-col items-center">
            {/* Animated hero icon */}
            <div className="relative mb-6 group">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 blur-2xl opacity-60 animate-gradient" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 shadow-lg shadow-primary/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Sparkles className="h-8 w-8 text-primary transition-transform duration-500 group-hover:scale-110" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center shadow-md">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-1.5 tracking-tight">
              Hi {firstName}, how can I help?
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-sm leading-relaxed">
              I can search, summarize, answer questions, and take actions like sending,
              replying, and forwarding emails.
            </p>

            {/* Capability cards */}
            <div className="grid grid-cols-3 gap-3 w-full mb-8">
              {CAPABILITIES.map((cap, i) => (
                <div
                  key={cap.label}
                  className={cn(
                    "group/card relative flex flex-col items-center gap-2 rounded-2xl border border-border/60 p-4 text-center",
                    "bg-gradient-to-b from-card to-card/80 backdrop-blur-sm",
                    "transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
                    "cursor-default animate-fade-in-up"
                  )}
                  style={{ animationDelay: `${i * 100 + 200}ms` }}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ring-1 transition-all duration-300 group-hover/card:scale-110 group-hover/card:shadow-md",
                      cap.gradient,
                      cap.ring
                    )}
                  >
                    <cap.icon className={cn("h-4 w-4", cap.iconColor)} />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{cap.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 w-full justify-center">
              {suggestedQuestions.slice(0, 4).map((q, i) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className={cn(
                    "group/chip flex items-center gap-2 text-xs px-4 py-2.5 rounded-full",
                    "border border-border/80 bg-card/50 backdrop-blur-sm",
                    "text-muted-foreground hover:text-foreground",
                    "hover:border-primary/30 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/5",
                    "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
                    "animate-fade-in-up"
                  )}
                  style={{ animationDelay: `${i * 80 + 500}ms` }}
                >
                  <span>{q}</span>
                  <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover/chip:opacity-100 group-hover/chip:translate-x-0 transition-all duration-200" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ScrollArea
          className="flex-1 px-6 overflow-y-auto overflow-x-hidden scroll-smooth"
          ref={scrollRef}
        >
          <div className="flex flex-col gap-5 py-6 max-w-2xl mx-auto">
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
            {isLoading && <TypingIndicator />}
            <div ref={scrollBottomRef} className="min-h-0 shrink-0" aria-hidden />
          </div>
        </ScrollArea>
      )}

      {/* ── Input Area ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/50 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend(input)
            }}
            className="relative flex items-end gap-2 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm px-4 py-2.5 shadow-sm transition-all duration-200 focus-within:border-primary/40 focus-within:shadow-lg focus-within:shadow-primary/5 focus-within:ring-1 focus-within:ring-primary/20"
          >
            <textarea
              ref={inputRef}
              placeholder="Ask about your emails..."
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50 max-h-[120px] py-1 leading-relaxed"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className={cn(
                "h-9 w-9 shrink-0 rounded-xl transition-all duration-300",
                input.trim()
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Send
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  input.trim() && "-translate-x-[1px] -translate-y-[1px]"
                )}
              />
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2 font-medium">
            Press Enter to send &middot; Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
