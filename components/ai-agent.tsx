"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Mic,
  Loader2,
  Volume2,
  Waves,
  X,
  Brain,
  Inbox,
  ChevronDown,
  Check,
  XCircle,
  Mail,
  Forward,
  Reply,
  MessageSquare,
  Clock,
  Trash2,
  Archive,
  MailOpen,
} from "lucide-react"
import { agent as agentApi, mailboxes as mailboxesApi, type MailboxApi, type AgentActionApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

type HistoryEntry = { role: "user" | "assistant"; content: string }

const TLDS = "com|org|net|io|ai|co|edu|gov|dev|info|biz|me|uk|pk|in"

function normalizeSpeechText(raw: string): string {
  let t = raw

  // "at the rate" / "at the rate of" → @
  t = t.replace(/\bat the rate(?:\s+of)?\b/gi, "@")

  // Full email pattern: "ahmed at gmail dot com"
  // Handles multiple dots: "ahmed at some dot thing dot com"
  const emailRe = new RegExp(
    `(\\w[\\w.]*)\\s*(?:at|@)\\s*([\\w]+(?:\\s*(?:dot|\\.)\\s*\\w+)*)\\s*(?:dot|\\.)\\s*(${TLDS})`,
    "gi"
  )
  t = t.replace(emailRe, (_m, user: string, domain: string, tld: string) => {
    const cleanDomain = domain.replace(/\s*(?:dot|\.)\s*/gi, ".")
    return `${user.trim()}@${cleanDomain.trim()}.${tld.trim()}`
  })

  // Collapse spaces around @ and dots inside anything that looks like an email
  t = t.replace(/(\S+)\s*@\s*(\S+)/g, (_m, l: string, r: string) => {
    const right = r.replace(/\s*\.\s*/g, ".")
    return `${l.trim()}@${right}`
  })

  // Standalone "dot com" etc. at word boundary (e.g. "visit google dot com")
  t = t.replace(new RegExp(`\\bdot\\s+(${TLDS})\\b`, "gi"), ".$1")

  // "full stop" → "."
  t = t.replace(/\bfull stop\b/gi, ".")

  // "new line" / "next line" → newline
  t = t.replace(/\b(?:new|next) line\b/gi, "\n")

  // Normalize multiple spaces
  t = t.replace(/ {2,}/g, " ")

  return t.trim()
}

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

export function AiAgent() {
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0] ?? "there"

  const [state, setState] = useState<
    "idle" | "listening" | "thinking" | "speaking" | "confirming"
  >("idle")
  const [liveText, setLiveText] = useState("")
  const [speakingText, setSpeakingText] = useState("")
  const [error, setError] = useState("")
  const [mailboxList, setMailboxList] = useState<MailboxApi[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState("all")
  const [showMailboxMenu, setShowMailboxMenu] = useState(false)
  const [pendingActions, setPendingActions] = useState<AgentActionApi[]>([])
  const [executingId, setExecutingId] = useState<string | null>(null)

  const greetedRef = useRef(false)
  const firstNameRef = useRef(firstName)
  firstNameRef.current = firstName

  useEffect(() => {
    mailboxesApi.list().then(setMailboxList).catch(() => {})
  }, [])

  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const historyRef = useRef<HistoryEntry[]>([])
  const recognizedTextRef = useRef("")
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendingRef = useRef(false)
  const selectedMailboxRef = useRef(selectedMailbox)
  selectedMailboxRef.current = selectedMailbox
  const startListeningRef = useRef<() => void>(() => {})
  const pendingActionsRef = useRef<AgentActionApi[]>([])
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)

  const scrollToLatest = useCallback(() => {
    requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [])

  const resumeListening = useCallback(() => {
    setTimeout(() => startListeningRef.current(), 400)
  }, [])

  const startTypewriter = useCallback((text: string) => {
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    const words = text.split(" ")
    let index = 0
    setSpeakingText("")
    typewriterRef.current = setInterval(() => {
      index++
      setSpeakingText(words.slice(0, index).join(" "))
      if (index >= words.length) {
        if (typewriterRef.current) clearInterval(typewriterRef.current)
        typewriterRef.current = null
      }
    }, 250)
  }, [])

  const stopTypewriter = useCallback(() => {
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current)
      typewriterRef.current = null
    }
    setSpeakingText("")
  }, [])

  // ── TTS ────────────────────────────────────────────────────────────────────

  const speak = useCallback(async (text: string) => {
    startTypewriter(text)
    try {
      const { audio } = await agentApi.speak(text.slice(0, 500))
      const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: "audio/mp3" })
      const url = URL.createObjectURL(blob)
      const el = new Audio(url)
      audioRef.current = el
      await new Promise<void>((resolve) => {
        el.onended = () => { URL.revokeObjectURL(url); resolve() }
        el.onerror = () => resolve()
        el.play()
      })
    } catch {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 300))
        utterance.rate = 1.0
        await new Promise<void>((resolve) => {
          utterance.onend = () => resolve()
          utterance.onerror = () => resolve()
          window.speechSynthesis.speak(utterance)
        })
      }
    } finally {
      stopTypewriter()
    }
  }, [startTypewriter, stopTypewriter])

  // ── Execute / reject actions ───────────────────────────────────────────────

  const executeAction = useCallback(async (action: AgentActionApi) => {
    setExecutingId(action.id)
    try {
      await agentApi.execute(action)
      setPendingActions((prev) => prev.filter((a) => a.id !== action.id))
      pendingActionsRef.current = pendingActionsRef.current.filter((a) => a.id !== action.id)
      setState("speaking")
      await speak(`Done! ${action.label} has been executed.`)
      if (pendingActionsRef.current.length === 0) {
        setState("idle")
        resumeListening()
      } else {
        setState("confirming")
      }
    } catch {
      setState("speaking")
      await speak(`Sorry, I couldn't complete that action. Please try again.`)
      setState("confirming")
    } finally {
      setExecutingId(null)
    }
  }, [speak])

  const rejectAction = useCallback(async (action: AgentActionApi) => {
    try { await agentApi.reject(action.id) } catch { /* ignore */ }
    setPendingActions((prev) => prev.filter((a) => a.id !== action.id))
    pendingActionsRef.current = pendingActionsRef.current.filter((a) => a.id !== action.id)
    if (pendingActionsRef.current.length === 0) {
      setState("idle")
      resumeListening()
    }
  }, [resumeListening])

  // ── Handle voice confirmation (yes/no after action proposal) ───────────────

  const handleVoiceConfirmation = useCallback(async (text: string) => {
    const lower = text.toLowerCase().trim()
    const isYes = /^(yes|yeah|yep|yup|haan|ha+n|ok|okay|sure|go ahead|do it|send it|confirm|approve|kar do|bhej do)/.test(lower)
    const isNo = /^(no|nah|nope|cancel|don't|nahi|mat|ruk|stop|reject)/.test(lower)

    if (isYes && pendingActionsRef.current.length > 0) {
      for (const action of [...pendingActionsRef.current]) {
        await executeAction(action)
      }
    } else if (isNo) {
      for (const action of [...pendingActionsRef.current]) {
        await rejectAction(action)
      }
      setState("speaking")
      await speak("Alright, I've cancelled those actions.")
      setState("idle")
      resumeListening()
    } else {
      historyRef.current.push({ role: "user", content: text })
      sendingRef.current = true
      setState("thinking")
      scrollToLatest()
      try {
        const recent = historyRef.current.slice(-10)
        const mbId = selectedMailboxRef.current === "all" ? undefined : selectedMailboxRef.current
        const res = await agentApi.chat(text.trim(), recent, mbId)
        const reply = res.content || "I didn't catch that."
        historyRef.current.push({ role: "assistant", content: reply })

        if (res.actions?.length > 0) {
          pendingActionsRef.current = [...pendingActionsRef.current, ...res.actions]
          setPendingActions([...pendingActionsRef.current])
        }

        setState("speaking")
        await speak(reply)

        if (pendingActionsRef.current.length > 0) {
          setState("confirming")
          resumeListening()
        } else {
          setState("idle")
          resumeListening()
        }
      } catch {
        setState("confirming")
      } finally {
        sendingRef.current = false
      }
    }
  }, [executeAction, rejectAction, speak, scrollToLatest])

  const handleVoiceConfirmationRef = useRef(handleVoiceConfirmation)
  handleVoiceConfirmationRef.current = handleVoiceConfirmation

  // ── Send captured voice to AI ──────────────────────────────────────────────

  const sendToAgent = useCallback(async (text: string) => {
    if (!text.trim() || sendingRef.current) return

    if (pendingActionsRef.current.length > 0) {
      await handleVoiceConfirmationRef.current(text)
      return
    }

    sendingRef.current = true
    setLiveText("")
    setState("thinking")
    scrollToLatest()

    historyRef.current.push({ role: "user", content: text.trim() })

    try {
      const recent = historyRef.current.slice(-10)
      const mbId = selectedMailboxRef.current === "all" ? undefined : selectedMailboxRef.current
      const res = await agentApi.chat(text.trim(), recent, mbId)
      const reply = res.content || "I didn't catch that. Could you try again?"

      historyRef.current.push({ role: "assistant", content: reply })

      const actions = res.actions?.filter((a) => a.requires_approval) ?? []
      if (actions.length > 0) {
        pendingActionsRef.current = actions
        setPendingActions(actions)
      }

      setState("speaking")
      await speak(reply)

      if (actions.length > 0) {
        setState("speaking")
        const actionSummary = actions.map((a) => a.label).join(", ")
        await speak(`I need your confirmation to: ${actionSummary}. Say yes to confirm or no to cancel.`)
        setState("confirming")
        resumeListening()
      } else {
        setState("idle")
        resumeListening()
      }
    } catch {
      setState("idle")
    } finally {
      sendingRef.current = false
    }
  }, [speak, scrollToLatest])

  // ── Speech Recognition (auto-send on silence) ─────────────────────────────

  const startListening = useCallback(() => {
    setError("")
    recognizedTextRef.current = ""

    const SR =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition: any })
            .webkitSpeechRecognition
        : null

    if (!SR) {
      setError("Voice not supported in this browser. Try Chrome or Edge.")
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: any) => {
      let final = ""
      let interim = ""
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      const combined = final + interim
      const normalized = normalizeSpeechText(combined)
      setLiveText(normalized)
      recognizedTextRef.current = normalized
      // No auto-stop on silence — user must tap mic again to submit
    }

    recognition.onerror = () => {
      if (pendingActionsRef.current.length > 0) setState("confirming")
      else setState("idle")
      setLiveText("")
    }

    recognition.onend = () => {
      const captured = recognizedTextRef.current.trim()
      recognizedTextRef.current = ""
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      if (captured) {
        sendToAgent(normalizeSpeechText(captured))
      } else {
        if (pendingActionsRef.current.length > 0) setState("confirming")
        else setState("idle")
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setState("listening")
    setLiveText("")
  }, [sendToAgent])

  startListeningRef.current = startListening

  useEffect(() => {
    if (greetedRef.current) return
    greetedRef.current = true

    const greeting = `Hi ${firstNameRef.current}! I'm your voice assistant. How can I help you with your emails today?`

    if (!("speechSynthesis" in window)) return

    const doGreet = () => {
      setState("speaking")
      startTypewriter(greeting)
      const utterance = new SpeechSynthesisUtterance(greeting)
      utterance.rate = 1.0
      utterance.onend = () => {
        stopTypewriter()
        setState("idle")
        setTimeout(() => startListeningRef.current(), 400)
      }
      utterance.onerror = () => {
        stopTypewriter()
        setState("idle")
      }
      window.speechSynthesis.speak(utterance)
    }

    const timer = setTimeout(doGreet, 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cancel = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    recognizedTextRef.current = ""
    sendingRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    stopTypewriter()
    setLiveText("")
    setState("idle")
  }, [])

  // ── Mic button ─────────────────────────────────────────────────────────────

  const handleMicClick = useCallback(() => {
    if (state === "listening") {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      recognitionRef.current?.stop()
    } else if (state === "idle" || state === "confirming") {
      startListening()
    } else if (state === "speaking") {
      cancel()
    }
  }, [state, startListening, cancel])

  // ── Waveform bars ──────────────────────────────────────────────────────────

  const barCount = 40
  const [bars, setBars] = useState<number[]>(() => Array(barCount).fill(4))

  useEffect(() => {
    if (state !== "listening" && state !== "speaking") {
      setBars(Array(barCount).fill(4))
      return
    }
    const interval = setInterval(() => {
      setBars(Array.from({ length: barCount }, () => 12 + Math.random() * 80))
    }, 120)
    return () => clearInterval(interval)
  }, [state])

  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (state !== "thinking" && state !== "confirming") return
    const interval = setInterval(() => setTick((t) => t + 1), 80)
    return () => clearInterval(interval)
  }, [state])

  // Smooth scroll to latest content when transcript or actions change
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [liveText, speakingText, state, pendingActions.length])

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header — compact */}
      <header className="shrink-0 flex items-center justify-between gap-4 px-5 py-3 border-b border-border/80 bg-background/95">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground truncate">Voice Agent</h1>
            <p className="text-xs text-muted-foreground truncate">Tap mic → talk → tap again to send</p>
          </div>
        </div>
        {mailboxList.length > 0 && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMailboxMenu((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/80 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-colors"
            >
              <Inbox className="h-4 w-4 shrink-0" />
              <span className="max-w-[120px] truncate">
                {selectedMailbox === "all"
                  ? `All (${mailboxList.length})`
                  : mailboxList.find((m) => m.id === selectedMailbox)?.name ?? "Mailbox"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
            </button>
            {showMailboxMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMailboxMenu(false)} aria-hidden />
                <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[220px] rounded-xl border border-border bg-popover shadow-xl py-1.5">
                  <button
                    onClick={() => { setSelectedMailbox("all"); setShowMailboxMenu(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors rounded-lg mx-1 ${
                      selectedMailbox === "all" ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Inbox className="h-4 w-4 shrink-0" />
                    All Mailboxes
                  </button>
                  {mailboxList.map((mb) => (
                    <button
                      key={mb.id}
                      onClick={() => { setSelectedMailbox(mb.id); setShowMailboxMenu(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors rounded-lg mx-1 ${
                        selectedMailbox === mb.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: mb.color || "#64748b" }} />
                      <span className="truncate font-medium">{mb.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0 truncate max-w-[100px]">{mb.email}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main — centered card feel, scrollable with smooth behavior */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto px-6 py-8 gap-6 overflow-y-auto overflow-x-hidden scroll-smooth">
        {/* Status pill */}
        <div className="flex items-center justify-center min-h-[2rem]">
          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${
            state === "idle" ? "bg-muted/60 text-muted-foreground" :
            state === "listening" ? "bg-primary/15 text-primary" :
            state === "thinking" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
            state === "speaking" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
            "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          }`}>
            {state === "thinking" && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
            {state === "idle" && `Hi ${firstName}, tap the mic to start`}
            {state === "listening" && (pendingActions.length > 0 ? "Listening for confirmation…" : "Listening… tap mic again to send")}
            {state === "thinking" && "Thinking…"}
            {state === "speaking" && "Speaking…"}
            {state === "confirming" && "Say Yes or No, or use the buttons"}
          </span>
        </div>

        {/* Transcript / response area */}
        <div className="w-full min-h-[4rem] flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-muted/30 px-5 py-4 text-center">
          {state === "listening" && (
            <>
              {liveText ? (
                <p className="text-base text-foreground/90 leading-relaxed">&ldquo;{liveText}&rdquo;</p>
              ) : (
                <p className="text-sm text-muted-foreground">Start speaking…</p>
              )}
            </>
          )}
          {state === "speaking" && speakingText && (
            <p className="text-base text-emerald-700 dark:text-emerald-300 leading-relaxed">&ldquo;{speakingText}&rdquo;</p>
          )}
          {state === "thinking" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Preparing response…</span>
            </div>
          )}
          {state === "idle" && !liveText && (
            <p className="text-sm text-muted-foreground">Your words will appear here when you talk</p>
          )}
          {state === "confirming" && !speakingText && !liveText && (
            <p className="text-sm text-muted-foreground">Confirm or cancel the actions below</p>
          )}
        </div>

        {/* Waveform — subtle, below transcript */}
        <div className="flex items-center justify-center gap-1 h-16 w-full max-w-sm">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                state === "listening" ? "bg-primary/80" :
                state === "speaking" ? "bg-emerald-500/70" :
                state === "thinking" ? "bg-amber-400/50" :
                state === "confirming" ? "bg-amber-400/40" :
                "bg-muted-foreground/20"
              }`}
              style={{
                height:
                  state === "listening" || state === "speaking"
                    ? `${Math.max(8, h)}%`
                    : state === "thinking"
                      ? `${12 + Math.sin(i * 0.4 + tick * 0.3) * 12}%`
                      : state === "confirming"
                        ? `${8 + Math.sin(i * 0.3 + tick * 0.15) * 8}%`
                        : "8px",
              }}
            />
          ))}
        </div>

        {/* Pending actions */}
        {pendingActions.length > 0 && (state === "confirming" || state === "listening") && (
          <div className="w-full flex flex-col gap-2">
            {pendingActions.map((action) => {
              const Icon = ACTION_ICONS[action.type] || Mail
              return (
                <div
                  key={action.id}
                  className="flex items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-500/5 px-4 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                    <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    {action.description && (
                      <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => executeAction(action)}
                      disabled={executingId === action.id}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                    >
                      {executingId === action.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => rejectAction(action)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Scroll anchor — smooth scroll brings new content into view */}
        <div ref={scrollAnchorRef} className="min-h-0 shrink-0" aria-hidden />

        {/* Mic — main CTA */}
        <div className="relative mt-2">
          {state === "listening" && (
            <div className="absolute -inset-2 rounded-full bg-primary/15 animate-pulse" style={{ animationDuration: "2s" }} />
          )}
          {state === "speaking" && (
            <div className="absolute -inset-2 rounded-full bg-emerald-500/10 animate-pulse" style={{ animationDuration: "2.5s" }} />
          )}
          {state === "confirming" && (
            <div className="absolute -inset-2 rounded-full bg-amber-500/10 animate-pulse" style={{ animationDuration: "2s" }} />
          )}
          <button
            onClick={handleMicClick}
            disabled={state === "thinking"}
            className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none ${
              state === "listening"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                : state === "speaking"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : state === "thinking"
                    ? "bg-muted text-muted-foreground cursor-wait"
                    : state === "confirming"
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:scale-[1.02]"
                      : "bg-muted/80 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
            }`}
          >
            {state === "listening" ? (
              <Waves className="h-10 w-10" />
            ) : state === "speaking" ? (
              <Volume2 className="h-10 w-10" />
            ) : state === "thinking" ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : state === "confirming" ? (
              <Mic className="h-10 w-10" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </button>
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          {state === "idle" && "Tap once to start, tap again when you're done"}
          {state === "listening" && "Tap mic again to send your message"}
          {state === "confirming" && "Confirm or cancel with voice or buttons"}
          {state === "speaking" && (
            <button type="button" onClick={cancel} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" /> Stop
            </button>
          )}
        </p>

        {error && (
          <p className="text-sm text-red-500 text-center px-4">{error}</p>
        )}
      </main>
    </div>
  )
}
