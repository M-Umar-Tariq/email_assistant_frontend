"use client"

import { useState, useEffect, useRef, useMemo } from "react"
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
  PenLine,
  ChevronDown,
  Loader2,
  Save,
  FileText,
  RotateCcw,
  Check,
  Mail,
  Clock,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { compose as composeApi, emails as emailsApi, mailboxes as mailboxesApi } from "@/lib/api"
import type { MailboxApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

const DRAFT_KEY = "compose_draft"

export function ComposeView({
  initialTo,
  initialToName,
  onInitialComposeConsumed,
}: {
  initialTo?: string | null
  initialToName?: string | null
  onInitialComposeConsumed?: () => void
} = {}) {
  const { user } = useAuth()
  const [to, setTo] = useState(initialTo?.trim() ?? "")
  const [cc, setCc] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [customEmailType, setCustomEmailType] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [mailboxList, setMailboxList] = useState<MailboxApi[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState<MailboxApi | null>(null)
  const [showMailboxMenu, setShowMailboxMenu] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const mailboxRef = useRef<HTMLDivElement>(null)

  const wordCount = useMemo(() => {
    const words = body.trim().split(/\s+/).filter(Boolean)
    return words.length
  }, [body])

  const charCount = useMemo(() => body.length, [body])

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
        if (draft.savedAt) setDraftSavedAt(draft.savedAt)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (initialTo?.trim()) {
      setTo(initialTo.trim())
      onInitialComposeConsumed?.()
    }
  }, [initialTo, onInitialComposeConsumed])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mailboxRef.current && !mailboxRef.current.contains(e.target as Node)) {
        setShowMailboxMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
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
      setTo(""); setCc(""); setSubject(""); setBody(""); setShowCc(false); setDraftSavedAt(null)
    } catch (err) {
      toast.error((err as Error).message || "Failed to send email")
    } finally { setIsSending(false) }
  }

  const handleSaveDraft = () => {
    if (!to && !subject && !body) { toast.error("Nothing to save"); return }
    const now = new Date().toISOString()
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ to, cc, subject, body, savedAt: now }))
    setDraftSavedAt(now)
    toast.success("Draft saved")
  }

  const handleGenerate = async (contextPrompt?: string) => {
    setIsGenerating(true)
    try {
      const res = await composeApi.generate({ to: to || undefined, subject: subject || undefined, context: contextPrompt ?? (customEmailType.trim() || body || undefined), tone: "formal", sender_name: user?.name || undefined })
      setBody(res.draft ?? "")
      toast.success("Draft generated")
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
    setBody(body.substring(0, lineStart) + "• " + body.substring(lineStart))
    setTimeout(() => { ta.focus() }, 0)
  }
  const handleLink = () => { const url = prompt("Enter URL:"); if (url) insertFormatting("[", `](${url})`, "link text") }

  const handleClear = () => {
    setTo(""); setCc(""); setSubject(""); setBody(""); setShowCc(false)
    setDraftSavedAt(null); setCustomEmailType("")
    localStorage.removeItem(DRAFT_KEY)
    toast.success("Compose cleared")
  }

  const recipientCount = useMemo(() => {
    const toCount = to.split(/[,;\s]+/).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())).length
    const ccCount = cc.split(/[,;\s]+/).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())).length
    return toCount + ccCount
  }, [to, cc])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col bg-background">
        {/* ─── Header ──────────────────────────────────── */}
        <header className="relative flex items-center justify-between border-b border-border px-6 py-3.5">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-primary/[0.02]" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <PenLine className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight">Compose</h1>
              <p className="text-[11px] text-muted-foreground">AI-powered email drafting</p>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            {draftSavedAt && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/70 mr-1">
                <Clock className="h-3 w-3" />
                Saved {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleClear}
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Clear all</p></TooltipContent>
            </Tooltip>
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3.5 h-8 rounded-lg border transition-all duration-200 ${
                showAiPanel
                  ? "bg-primary/10 border-primary/20 text-primary shadow-sm shadow-primary/5"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/30"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{showAiPanel ? "Hide" : "Show"} Assistant</span>
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ─── Compose Area ──────────────────────────── */}
          <div className="flex flex-1 flex-col min-w-0">
            <div className="flex flex-col border-b border-border">
              {/* From */}
              <div
                ref={mailboxRef}
                className={`flex items-center gap-3 px-5 py-2.5 border-b transition-colors duration-150 ${
                  focusedField === "from" ? "bg-primary/[0.02] border-primary/15" : "border-border/50"
                }`}
              >
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">From</span>
                <div className="relative flex-1">
                  <button
                    onClick={() => { setShowMailboxMenu(!showMailboxMenu); setFocusedField("from") }}
                    onBlur={() => !showMailboxMenu && setFocusedField(null)}
                    className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors group"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    {selectedMailbox ? (
                      <span className="truncate">{selectedMailbox.email}</span>
                    ) : (
                      <span className="text-muted-foreground">Select mailbox...</span>
                    )}
                    <ChevronDown className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform duration-200 ${showMailboxMenu ? "rotate-180" : ""}`} />
                  </button>
                  {showMailboxMenu && (
                    <div className="absolute top-full left-0 mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl shadow-black/5 py-1 min-w-[300px] animate-fade-in-up">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Select Mailbox</p>
                      {mailboxList.map((mb) => (
                        <button
                          key={mb.id}
                          onClick={() => { setSelectedMailbox(mb); setShowMailboxMenu(false); setFocusedField(null) }}
                          className={`w-full text-left px-3 py-2.5 text-sm transition-all flex items-center gap-2.5 ${
                            selectedMailbox?.id === mb.id
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                            selectedMailbox?.id === mb.id ? "bg-primary/20" : "bg-muted/60"
                          }`}>
                            <Mail className={`h-3.5 w-3.5 ${selectedMailbox?.id === mb.id ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium text-sm">{mb.email}</p>
                            <p className="text-[11px] text-muted-foreground">{mb.name}</p>
                          </div>
                          {selectedMailbox?.id === mb.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                      {mailboxList.length === 0 && (
                        <p className="px-3 py-4 text-sm text-muted-foreground text-center">No mailboxes — add one in Settings</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* To */}
              <div className={`flex items-center gap-3 px-5 py-2.5 border-b transition-colors duration-150 ${
                focusedField === "to" ? "bg-primary/[0.02] border-primary/15" : "border-border/50"
              }`}>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">To</span>
                <Input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  onFocus={() => setFocusedField("to")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="recipients@email.com"
                  className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground/40 shadow-none focus-visible:ring-0 px-0 h-8 text-sm"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  {recipientCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-primary/10 text-primary border-0">
                      {recipientCount}
                    </Badge>
                  )}
                  {!showCc && (
                    <button onClick={() => setShowCc(true)} className="text-[11px] text-muted-foreground hover:text-primary font-medium transition-colors">
                      +Cc
                    </button>
                  )}
                </div>
              </div>

              {showCc && (
                <div className={`flex items-center gap-3 px-5 py-2.5 border-b transition-colors duration-150 animate-fade-in-up ${
                  focusedField === "cc" ? "bg-primary/[0.02] border-primary/15" : "border-border/50"
                }`}>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">Cc</span>
                  <Input
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    onFocus={() => setFocusedField("cc")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="cc@email.com"
                    className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground/40 shadow-none focus-visible:ring-0 px-0 h-8 text-sm"
                  />
                  <button onClick={() => { setShowCc(false); setCc("") }} className="text-muted-foreground hover:text-foreground shrink-0 p-1 rounded-md hover:bg-muted/50 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Subject */}
              <div className={`flex items-center gap-3 px-5 py-2.5 transition-colors duration-150 ${
                focusedField === "subject" ? "bg-primary/[0.02]" : ""
              }`}>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">Subject</span>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => setFocusedField("subject")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Email subject"
                  className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground/40 shadow-none focus-visible:ring-0 px-0 h-8 text-sm font-medium"
                />
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto relative">
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setFocusedField("body")}
                onBlur={() => setFocusedField(null)}
                placeholder="Write your email here, or let AI draft it for you..."
                className="h-full w-full min-h-[300px] resize-none bg-transparent text-foreground placeholder:text-muted-foreground/30 focus:outline-none text-sm leading-[1.8] px-5 py-5"
              />
              {!body && (
                <div className="absolute bottom-6 left-5 right-5 pointer-events-none">
                  <div className="flex items-center gap-2 text-muted-foreground/30">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-[11px]">Tip: Use the AI assistant to generate a draft instantly</span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Bottom Toolbar ──────────────────────── */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2">
              <div className="flex items-center gap-0.5">
                {[
                  { icon: Bold, handler: handleBold, tip: "Bold (Ctrl+B)" },
                  { icon: Italic, handler: handleItalic, tip: "Italic (Ctrl+I)" },
                  { icon: List, handler: handleList, tip: "Bullet list" },
                  { icon: Link2, handler: handleLink, tip: "Insert link" },
                ].map(({ icon: Icon, handler, tip }) => (
                  <Tooltip key={tip}>
                    <TooltipTrigger asChild>
                      <button onClick={handler} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
                        <Icon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p className="text-xs">{tip}</p></TooltipContent>
                  </Tooltip>
                ))}
                <Separator orientation="vertical" className="mx-1.5 h-4" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button disabled className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/30 cursor-not-allowed">
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p className="text-xs">Attachments (coming soon)</p></TooltipContent>
                </Tooltip>

                {body && (
                  <>
                    <Separator orientation="vertical" className="mx-1.5 h-4" />
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums ml-1">
                      {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount} chars
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleSaveDraft} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-all">
                      <Save className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Save draft</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p className="text-xs">Save as draft</p></TooltipContent>
                </Tooltip>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/95 hover:to-primary/85 gap-1.5 h-9 px-5 rounded-xl shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25 transition-all font-medium"
                  onClick={handleSend}
                  disabled={isSending}
                >
                  {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>

          {/* ─── AI Copilot Panel ──────────────────────── */}
          {showAiPanel && (
            <div className="hidden lg:flex w-[320px] flex-col border-l border-border bg-gradient-to-b from-muted/20 to-background">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Writing Assistant</span>
                </div>
                <button onClick={() => setShowAiPanel(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {/* Custom email type */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <FileText className="h-3 w-3" />
                      Email Type
                    </p>
                    <div className="relative">
                      <textarea
                        value={customEmailType}
                        onChange={(e) => setCustomEmailType(e.target.value)}
                        placeholder="e.g. thank you email, meeting request, apology..."
                        rows={2}
                        className="w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none transition-all"
                      />
                      {customEmailType && (
                        <button
                          onClick={() => setCustomEmailType("")}
                          className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="space-y-2.5">
                    <button
                      onClick={() => handleGenerate()}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 hover:from-primary/95 hover:to-primary/75 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4" />
                          <span>Generate Draft</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
