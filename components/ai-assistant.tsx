"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Sparkles, FileText, ExternalLink, Loader2, ChevronDown, Inbox, Search, MailOpen, Zap, MessageCircle, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { ai, mailboxes as mailboxesApi, type MailboxApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import type { ChatMessage } from "@/lib/mock-data"

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-8 w-8 shrink-0 mt-1">
        <AvatarFallback
          className={`text-xs font-semibold ${
            isUser ? "bg-primary/20 text-primary" : "bg-secondary text-foreground"
          }`}
        >
          {isUser ? "AC" : "AI"}
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 max-w-[85%] ${isUser ? "flex flex-col items-end" : ""}`}>
        <div
          className={`rounded-xl px-4 py-3 ${
            isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"
          }`}
        >
          <div className="text-sm leading-relaxed whitespace-pre-line">
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

        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Sources</span>
            {message.sources.map((source) => (
              <button
                key={source.emailId}
                className="flex items-center gap-2 text-left text-xs text-muted-foreground hover:text-foreground transition-colors group"
              >
                <FileText className="h-3 w-3 shrink-0 text-primary/60" />
                <span className="truncate group-hover:text-primary transition-colors">{source.subject}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}

        <span className="text-[10px] text-muted-foreground mt-1.5">
          {new Date(message.timestamp).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  )
}

const FALLBACK_SUGGESTIONS = [
  "What are my open action items?",
  "Who is waiting on my response?",
  "Summarize important emails from this week",
]

export function AiAssistant() {
  const { user } = useAuth()
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(FALLBACK_SUGGESTIONS)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mailboxList, setMailboxList] = useState<MailboxApi[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState<string>("all")
  const [showMailboxMenu, setShowMailboxMenu] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ai.suggestedQuestions()
      .then((list) => setSuggestedQuestions((list.length ? list : FALLBACK_SUGGESTIONS).slice(0, 4)))
      .catch(() => {})
    mailboxesApi.list()
      .then((list) => setMailboxList(list))
      .catch(() => {})
  }, [])

  const firstName = user?.name?.split(" ")[0] ?? "there"
  const hasConversation = messages.length > 0

  // Smooth scroll to latest message when new message is sent or response arrives
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
    setShowMailboxMenu(false)
    ai.suggestedQuestions()
      .then((list) => setSuggestedQuestions((list.length ? list : FALLBACK_SUGGESTIONS).slice(0, 4)))
      .catch(() => {})
    mailboxesApi.list()
      .then((list) => setMailboxList(list))
      .catch(() => {})
  }

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
      const res = await ai.ask(query.trim(), mbId, recent)
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: res.answer,
        sources: res.sources?.map((s) => ({ emailId: s.email_id, subject: s.subject })) ?? undefined,
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
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Ask anything about your emails</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {mailboxList.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMailboxMenu((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <Inbox className="h-3.5 w-3.5" />
              <span className="max-w-[140px] truncate">
                {selectedMailbox === "all"
                  ? `All Mailboxes (${mailboxList.length})`
                  : mailboxList.find((m) => m.id === selectedMailbox)?.name ?? "Mailbox"}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {showMailboxMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMailboxMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-popover shadow-lg py-1">
                  <button
                    onClick={() => { setSelectedMailbox("all"); setShowMailboxMenu(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                      selectedMailbox === "all" ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Inbox className="h-3.5 w-3.5" />
                    All Mailboxes
                  </button>
                  {mailboxList.map((mb) => (
                    <button
                      key={mb.id}
                      onClick={() => { setSelectedMailbox(mb.id); setShowMailboxMenu(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                        selectedMailbox === mb.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: mb.color || "#64748b" }} />
                      <span className="truncate">{mb.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{mb.email}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          )}
        </div>
      </header>

      {!hasConversation ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-xl mx-auto">
          {/* Welcome Icon */}
          <div className="relative mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-4.5 w-4.5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
              <MessageCircle className="h-2.5 w-2.5 text-white" />
            </div>
          </div>

          {/* Greeting */}
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Hi {firstName}, how can I help?
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
            I can search, summarize, and answer questions about all your emails instantly.
          </p>

          {/* Capability Cards */}
          <div className="grid grid-cols-3 gap-2.5 w-full mb-6">
            {[
              { icon: Search, label: "Find emails", desc: "By sender, topic, or date", color: "text-primary", bg: "bg-primary/10" },
              { icon: MailOpen, label: "Summarize", desc: "Quick summaries of threads", color: "text-amber-400", bg: "bg-amber-400/10" },
              { icon: Zap, label: "Quick answers", desc: "Ask anything about inbox", color: "text-emerald-400", bg: "bg-emerald-400/10" },
            ].map((cap) => (
              <div
                key={cap.label}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card/50 p-3 text-center"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cap.bg}`}>
                  <cap.icon className={`h-3.5 w-3.5 ${cap.color}`} />
                </div>
                <p className="text-xs font-medium text-foreground">{cap.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{cap.desc}</p>
              </div>
            ))}
          </div>

          {/* Suggestions as chips */}
          <div className="flex flex-wrap gap-2 w-full justify-center">
            {suggestedQuestions.slice(0, 4).map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-6 overflow-y-auto overflow-x-hidden scroll-smooth" ref={scrollRef}>
          <div className="flex flex-col gap-6 py-6">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0 mt-1">
                  <AvatarFallback className="text-xs font-semibold bg-secondary text-foreground">AI</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Searching {selectedMailbox === "all" ? "across all mailboxes" : mailboxList.find((m) => m.id === selectedMailbox)?.name ?? "mailbox"}...
                  </span>
                </div>
              </div>
            )}
            <div ref={scrollBottomRef} className="min-h-0 shrink-0" aria-hidden />
          </div>
        </ScrollArea>
      )}

      {/* Input */}
      <div className="border-t border-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend(input)
          }}
          className="flex items-center gap-2"
        >
          <Input
            placeholder="Ask about your emails..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
