"use client"

import { useState, useEffect, useRef } from "react"
import {
  Send,
  Paperclip,
  Wand2,
  X,
  Bold,
  Italic,
  List,
  Link2,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Save,
  CalendarPlus,
  XCircle,
  MessageSquare,
  PenLine,
  ArrowRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { compose as composeApi, emails as emailsApi, mailboxes as mailboxesApi } from "@/lib/api"
import type { MailboxApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

const toneOptions = [
  { id: "formal", label: "Formal", emoji: "\uD83D\uDC54" },
  { id: "concise", label: "Concise", emoji: "\u26A1" },
  { id: "friendly", label: "Friendly", emoji: "\uD83D\uDE0A" },
  { id: "firm", label: "Firm", emoji: "\uD83D\uDCAA" },
]

const quickTemplates = [
  { id: "acknowledge", label: "Acknowledge & follow up", icon: CheckCircle2, preview: "Thank you for your email. I'll review the details and get back to you by...", prompt: "Write an acknowledgement email that says I'll review the details and get back to them soon." },
  { id: "request_info", label: "Request more info", icon: MessageSquare, preview: "To better assist you, could you please provide...", prompt: "Write a polite email requesting additional information to better assist them." },
  { id: "schedule", label: "Schedule meeting", icon: CalendarPlus, preview: "I'd like to schedule a meeting to discuss this further...", prompt: "Write an email proposing to schedule a meeting to discuss further, offering a few time slots." },
  { id: "decline", label: "Decline politely", icon: XCircle, preview: "After careful consideration, we've decided to...", prompt: "Write a polite and professional decline email, thanking them for the proposal." },
]

const DRAFT_KEY = "compose_draft"

export function ComposeView() {
  const { user } = useAuth()
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [selectedTone, setSelectedTone] = useState("formal")
  const [customEmailType, setCustomEmailType] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [mailboxList, setMailboxList] = useState<MailboxApi[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState<MailboxApi | null>(null)
  const [showMailboxMenu, setShowMailboxMenu] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    mailboxesApi.list().then((list) => {
      setMailboxList(list)
      if (list.length > 0) setSelectedMailbox(list[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        if (draft.to) setTo(draft.to)
        if (draft.cc) { setCc(draft.cc); setShowCc(true) }
        if (draft.subject) setSubject(draft.subject)
        if (draft.body) setBody(draft.body)
      }
    } catch {}
  }, [])

  const handleSend = async () => {
    if (!selectedMailbox) { toast.error("Please select a mailbox first"); return }
    const toList = to.split(/[,;\s]+/).map((s) => s.trim()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    if (toList.length === 0) { toast.error("Enter at least one valid recipient email"); return }
    if (!subject.trim()) { toast.error("Please enter a subject"); return }
    if (!body.trim()) { toast.error("Please write an email body"); return }

    setIsSending(true)
    try {
      const ccList = cc ? cc.split(/[,;\s]+/).map((s) => s.trim()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) : []
      await emailsApi.send({ mailbox_id: selectedMailbox.id, to: toList, cc: ccList.length > 0 ? ccList : undefined, subject: subject.trim(), body: body.trim() })
      toast.success("Email sent successfully!")
      localStorage.removeItem(DRAFT_KEY)
      setTo(""); setCc(""); setSubject(""); setBody(""); setShowCc(false)
    } catch (err) {
      toast.error((err as Error).message || "Failed to send email")
    } finally { setIsSending(false) }
  }

  const handleSaveDraft = () => {
    if (!to && !subject && !body) { toast.error("Nothing to save"); return }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ to, cc, subject, body, savedAt: new Date().toISOString() }))
    toast.success("Draft saved")
  }

  const handleGenerate = async (templatePrompt?: string) => {
    setIsGenerating(true)
    try {
      const res = await composeApi.generate({ to: to || undefined, subject: subject || undefined, context: templatePrompt || body || undefined, tone: selectedTone, sender_name: user?.name || undefined })
      setBody(res.draft ?? "")
      toast.success(templatePrompt ? "Template applied" : "Draft generated")
    } catch { toast.error("Failed to generate draft") } finally { setIsGenerating(false) }
  }

  const insertFormatting = (prefix: string, suffix: string, placeholder: string) => {
    const ta = bodyRef.current; if (!ta) return
    const start = ta.selectionStart; const end = ta.selectionEnd
    const text = body.substring(start, end) || placeholder
    setBody(body.substring(0, start) + prefix + text + suffix + body.substring(end))
    setTimeout(() => { ta.focus(); const pos = start + prefix.length + text.length + suffix.length; ta.setSelectionRange(pos, pos) }, 0)
  }

  const handleBold = () => insertFormatting("**", "**", "bold text")
  const handleItalic = () => insertFormatting("*", "*", "italic text")
  const handleList = () => {
    const ta = bodyRef.current; if (!ta) return
    const start = ta.selectionStart; const lineStart = body.lastIndexOf("\n", start - 1) + 1
    setBody(body.substring(0, lineStart) + "\u2022 " + body.substring(lineStart))
    setTimeout(() => { ta.focus() }, 0)
  }
  const handleLink = () => { const url = prompt("Enter URL:"); if (url) insertFormatting("[", `](${url})`, "link text") }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <PenLine className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Compose</h1>
            <p className="text-[11px] text-muted-foreground">AI-powered email drafting</p>
          </div>
        </div>
        <button
          onClick={() => setShowAiPanel(!showAiPanel)}
          className={`flex items-center gap-1.5 text-xs px-3 h-8 rounded-md border transition-colors ${
            showAiPanel
              ? "bg-primary/10 border-primary/20 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
            <Wand2 className="h-3.5 w-3.5" />
            {showAiPanel ? "Hide Assistant" : "Show Assistant"}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Compose Area */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col border-b border-border">
            {/* From */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border/50">
              <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">From</span>
              <div className="relative flex-1">
                <button
                  onClick={() => setShowMailboxMenu(!showMailboxMenu)}
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  {selectedMailbox ? (
                    <span className="truncate">{selectedMailbox.email}</span>
                  ) : (
                    <span className="text-muted-foreground">Select mailbox...</span>
                  )}
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
                {showMailboxMenu && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl py-1.5 min-w-[280px]">
                    {mailboxList.map((mb) => (
                      <button
                        key={mb.id}
                        onClick={() => { setSelectedMailbox(mb); setShowMailboxMenu(false) }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 ${
                          selectedMailbox?.id === mb.id ? "bg-primary/10 text-primary" : "text-foreground"
                        }`}
                      >
                        <span className="truncate">{mb.email}</span>
                        <span className="text-muted-foreground text-xs ml-auto shrink-0">{mb.name}</span>
                      </button>
                    ))}
                    {mailboxList.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No mailboxes — add one in Settings</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* To */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border/50">
              <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">To</span>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipients@email.com"
                className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground/50 shadow-none focus-visible:ring-0 px-0 h-8 text-sm"
              />
              {!showCc && (
                <button onClick={() => setShowCc(true)} className="text-[11px] text-muted-foreground hover:text-foreground shrink-0">
                  +Cc
                </button>
              )}
            </div>

            {showCc && (
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border/50">
                <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">Cc</span>
                <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@email.com" className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground/50 shadow-none focus-visible:ring-0 px-0 h-8 text-sm" />
                <button onClick={() => { setShowCc(false); setCc("") }} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Subject */}
            <div className="flex items-center gap-3 px-5 py-2.5">
              <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">Subject</span>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground/50 shadow-none focus-visible:ring-0 px-0 h-8 text-sm font-medium" />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 px-5 py-4 overflow-auto">
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here, or let AI draft it for you..."
              className="h-full w-full min-h-[300px] resize-none bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none text-sm leading-relaxed"
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
            <div className="flex items-center gap-0.5">
              {[
                { icon: Bold, handler: handleBold, tip: "Bold" },
                { icon: Italic, handler: handleItalic, tip: "Italic" },
                { icon: List, handler: handleList, tip: "Bullet list" },
                { icon: Link2, handler: handleLink, tip: "Insert link" },
              ].map(({ icon: Icon, handler, tip }) => (
                <button key={tip} onClick={handler} title={tip} className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <Icon className="h-4 w-4" />
                </button>
              ))}
              <Separator orientation="vertical" className="mx-2 h-4" />
              <button title="Attachments (coming soon)" disabled className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground/40 cursor-not-allowed">
                <Paperclip className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSaveDraft} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                <Save className="h-3.5 w-3.5" />
                Save draft
              </button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-8 px-4 rounded-lg"
                onClick={handleSend}
                disabled={isSending}
              >
                {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── AI Copilot Panel ──────────────────────────────────── */}
        {showAiPanel && (
          <div className="hidden lg:flex w-[300px] flex-col border-l border-border bg-background">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Writing Assistant</span>
              </div>
              <button onClick={() => setShowAiPanel(false)} className="text-muted-foreground hover:text-foreground p-1 rounded">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* Tone */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Tone</p>
                  <div className="flex flex-wrap gap-1.5">
                    {toneOptions.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => setSelectedTone(tone.id)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                          selectedTone === tone.id
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                            : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="text-[10px]">{tone.emoji}</span>
                        {tone.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom email type */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Apna email type</p>
                  <textarea
                    value={customEmailType}
                    onChange={(e) => setCustomEmailType(e.target.value)}
                    placeholder="e.g. shukriya email, meeting request, apology..."
                    rows={2}
                    className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none"
                  />
                </div>

                {/* Templates */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Quick Templates</p>
                  <div className="flex flex-col gap-1.5">
                    {quickTemplates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleGenerate(t.prompt)}
                        disabled={isGenerating}
                        className="group flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all border border-transparent hover:border-primary/15 hover:bg-primary/[0.03] disabled:opacity-50"
                      >
                        <div className="h-7 w-7 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                          <t.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{t.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{t.preview}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-primary/60 mt-1 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate */}
                <button
                  onClick={() => handleGenerate(customEmailType.trim() || undefined)}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-semibold shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 transition-all disabled:opacity-60"
                >
                  {isGenerating ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                  ) : (
                    <><Wand2 className="h-3.5 w-3.5" /> Generate Draft</>
                  )}
                </button>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}
