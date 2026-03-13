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
  Sparkles,
  MicOff,
  Bot,
  User,
  Zap,
  RotateCcw,
} from "lucide-react"
import {
  agent as agentApi,
  mailboxes as mailboxesApi,
  type MailboxApi,
  type AgentActionApi,
  type AgentSuggestion,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

/* ─── Types ──────────────────────────────────────────────────────────── */

type HistoryEntry = { role: "user" | "assistant"; content: string }

type DisplayMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  actions?: AgentActionApi[]
}

type AgentState = "idle" | "listening" | "thinking" | "speaking" | "confirming"

/* ─── Constants ──────────────────────────────────────────────────────── */

const TLDS = "com|org|net|io|ai|co|edu|gov|dev|info|biz|me|uk|pk|in"
const BAR_COUNT = 48
const SILENCE_TIMEOUT_MS = 2500
const VOLUME_SILENCE_THRESHOLD = 12

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

/* ─── Helpers ────────────────────────────────────────────────────────── */

function normalizeSpeechText(raw: string): string {
  let t = raw
  t = t.replace(/\bat the rate(?:\s+of)?\b/gi, "@")
  const emailRe = new RegExp(
    `(\\w[\\w.]*)\\s*(?:at|@)\\s*([\\w]+(?:\\s*(?:dot|\\.)\\s*\\w+)*)\\s*(?:dot|\\.)\\s*(${TLDS})`,
    "gi"
  )
  t = t.replace(emailRe, (_m, user: string, domain: string, tld: string) => {
    const cleanDomain = domain.replace(/\s*(?:dot|\.)\s*/gi, ".")
    return `${user.trim()}@${cleanDomain.trim()}.${tld.trim()}`
  })
  t = t.replace(/(\S+)\s*@\s*(\S+)/g, (_m, l: string, r: string) => {
    const right = r.replace(/\s*\.\s*/g, ".")
    return `${l.trim()}@${right}`
  })
  t = t.replace(new RegExp(`\\bdot\\s+(${TLDS})\\b`, "gi"), ".$1")
  t = t.replace(/\bfull stop\b/gi, ".")
  t = t.replace(/\b(?:new|next) line\b/gi, "\n")
  t = t.replace(/ {2,}/g, " ")
  return t.trim()
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

let msgIdCounter = 0
function nextMsgId(): string {
  return `msg-${++msgIdCounter}-${Date.now()}`
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export function AiAgent() {
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0] ?? "there"

  // ── Core state ──────────────────────────────────────────────────────
  const [state, setState] = useState<AgentState>("idle")
  const [liveText, setLiveText] = useState("")
  const [speakingText, setSpeakingText] = useState("")
  const [error, setError] = useState("")
  const [mailboxList, setMailboxList] = useState<MailboxApi[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState("all")
  const [showMailboxMenu, setShowMailboxMenu] = useState(false)
  const [pendingActions, setPendingActions] = useState<AgentActionApi[]>([])
  const [executingId, setExecutingId] = useState<string | null>(null)

  // ── New state for improvements ──────────────────────────────────────
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([])
  const [autoSilence, setAutoSilence] = useState(true)
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(3))
  const [tick, setTick] = useState(0)

  // ── Refs ────────────────────────────────────────────────────────────
  const greetedRef = useRef(false)
  const firstNameRef = useRef(firstName)
  firstNameRef.current = firstName

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
  const autoSilenceRef = useRef(autoSilence)
  autoSilenceRef.current = autoSilence

  // Audio visualization refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastSpeechTimeRef = useRef<number>(0)

  // ── Scroll ──────────────────────────────────────────────────────────
  const scrollToLatest = useCallback(() => {
    requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [])

  // ── Add message helper ─────────────────────────────────────────────
  const addMessage = useCallback((role: "user" | "assistant", content: string, actions?: AgentActionApi[]) => {
    const msg: DisplayMessage = {
      id: nextMsgId(),
      role,
      content,
      timestamp: new Date(),
      actions,
    }
    setMessages(prev => [...prev, msg])
    setTimeout(() => scrollToLatest(), 50)
    return msg
  }, [scrollToLatest])

  // ── Resume listening ────────────────────────────────────────────────
  const resumeListening = useCallback(() => {
    setTimeout(() => startListeningRef.current(), 400)
  }, [])

  // ── Typewriter ──────────────────────────────────────────────────────
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
    }, 200)
  }, [])

  const stopTypewriter = useCallback(() => {
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current)
      typewriterRef.current = null
    }
    setSpeakingText("")
  }, [])

  // ── Audio visualization ─────────────────────────────────────────────
  const startAudioVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const ctx = new AudioContext()
      audioContextRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.75
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const animate = () => {
        analyser.getByteFrequencyData(dataArray)

        const newBars: number[] = []
        const binCount = dataArray.length
        for (let i = 0; i < BAR_COUNT; i++) {
          const binIdx = Math.floor((i / BAR_COUNT) * binCount)
          const value = dataArray[binIdx] ?? 0
          const centerWeight = 1 - Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2) * 0.3
          newBars.push(Math.max(3, (value / 255) * 100 * centerWeight))
        }
        setBars(newBars)

        // Volume-based silence detection
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / binCount
        if (avg > VOLUME_SILENCE_THRESHOLD) {
          lastSpeechTimeRef.current = Date.now()
        }

        animFrameRef.current = requestAnimationFrame(animate)
      }
      animFrameRef.current = requestAnimationFrame(animate)
    } catch {
      // Fallback: random animation
    }
  }, [])

  const stopAudioVisualization = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close().catch(() => {})
    }
    audioContextRef.current = null
    analyserRef.current = null
    setBars(Array(BAR_COUNT).fill(3))
  }, [])

  // ── TTS ─────────────────────────────────────────────────────────────
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

  // ── Execute / reject actions ────────────────────────────────────────
  const executeAction = useCallback(async (action: AgentActionApi) => {
    setExecutingId(action.id)
    try {
      await agentApi.execute(action)
      setPendingActions(prev => prev.filter(a => a.id !== action.id))
      pendingActionsRef.current = pendingActionsRef.current.filter(a => a.id !== action.id)
      setState("speaking")
      const doneMsg = `Done! ${action.label} has been executed.`
      addMessage("assistant", doneMsg)
      await speak(doneMsg)
      if (pendingActionsRef.current.length === 0) {
        setState("idle")
        resumeListening()
      } else {
        setState("confirming")
      }
    } catch {
      setState("speaking")
      const errMsg = "Sorry, I couldn't complete that action. Please try again."
      addMessage("assistant", errMsg)
      await speak(errMsg)
      setState("confirming")
    } finally {
      setExecutingId(null)
    }
  }, [speak, addMessage, resumeListening])

  const rejectAction = useCallback(async (action: AgentActionApi) => {
    try { await agentApi.reject(action.id) } catch { /* ignore */ }
    setPendingActions(prev => prev.filter(a => a.id !== action.id))
    pendingActionsRef.current = pendingActionsRef.current.filter(a => a.id !== action.id)
    if (pendingActionsRef.current.length === 0) {
      setState("idle")
      resumeListening()
    }
  }, [resumeListening])

  // ── Voice confirmation ──────────────────────────────────────────────
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
      const msg = "Alright, I've cancelled those actions."
      addMessage("assistant", msg)
      await speak(msg)
      setState("idle")
      resumeListening()
    } else {
      addMessage("user", text)
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

        addMessage("assistant", reply, res.actions?.length ? res.actions : undefined)
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
  }, [executeAction, rejectAction, speak, addMessage, scrollToLatest, resumeListening])

  const handleVoiceConfirmationRef = useRef(handleVoiceConfirmation)
  handleVoiceConfirmationRef.current = handleVoiceConfirmation

  // ── Send to agent ───────────────────────────────────────────────────
  const sendToAgent = useCallback(async (text: string) => {
    if (!text.trim() || sendingRef.current) return

    if (pendingActionsRef.current.length > 0) {
      await handleVoiceConfirmationRef.current(text)
      return
    }

    sendingRef.current = true
    setLiveText("")
    setState("thinking")

    addMessage("user", text.trim())
    historyRef.current.push({ role: "user", content: text.trim() })
    scrollToLatest()

    try {
      const recent = historyRef.current.slice(-10)
      const mbId = selectedMailboxRef.current === "all" ? undefined : selectedMailboxRef.current
      const res = await agentApi.chat(text.trim(), recent, mbId)
      const reply = res.content || "I didn't catch that. Could you try again?"

      historyRef.current.push({ role: "assistant", content: reply })

      const actions = res.actions?.filter(a => a.requires_approval) ?? []
      if (actions.length > 0) {
        pendingActionsRef.current = actions
        setPendingActions(actions)
      }

      addMessage("assistant", reply, actions.length > 0 ? actions : undefined)
      setState("speaking")
      await speak(reply)

      if (actions.length > 0) {
        setState("speaking")
        const actionSummary = actions.map(a => a.label).join(", ")
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
  }, [speak, addMessage, scrollToLatest, resumeListening])

  // ── Speech Recognition ──────────────────────────────────────────────
  const startListening = useCallback(() => {
    setError("")
    recognizedTextRef.current = ""
    lastSpeechTimeRef.current = Date.now()

    const SR =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition: any }).webkitSpeechRecognition
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
      lastSpeechTimeRef.current = Date.now()

      // Reset silence timer on new speech
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (autoSilenceRef.current && normalized.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current && recognizedTextRef.current.trim()) {
            recognitionRef.current.stop()
          }
        }, SILENCE_TIMEOUT_MS)
      }
    }

    recognition.onerror = () => {
      stopAudioVisualization()
      if (pendingActionsRef.current.length > 0) setState("confirming")
      else setState("idle")
      setLiveText("")
    }

    recognition.onend = () => {
      stopAudioVisualization()
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

    startAudioVisualization()
  }, [sendToAgent, startAudioVisualization, stopAudioVisualization])

  startListeningRef.current = startListening

  // ── Fetch mailboxes & suggestions ───────────────────────────────────
  useEffect(() => {
    mailboxesApi.list().then(setMailboxList).catch(() => {})
    agentApi.suggestions().then(setSuggestions).catch(() => {})
  }, [])

  // ── Greeting ────────────────────────────────────────────────────────
  useEffect(() => {
    if (greetedRef.current) return
    greetedRef.current = true

    const greeting = `Hi ${firstNameRef.current}! I'm your voice assistant. How can I help you with your emails today?`

    const doGreet = async () => {
      setState("speaking")
      addMessage("assistant", greeting)
      try {
        startTypewriter(greeting)
        const { audio } = await agentApi.speak(greeting.slice(0, 500))
        const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: "audio/mp3" })
        const url = URL.createObjectURL(blob)
        const el = new Audio(url)
        audioRef.current = el
        await new Promise<void>((resolve) => {
          el.onended = () => { URL.revokeObjectURL(url); stopTypewriter(); resolve() }
          el.onerror = () => { stopTypewriter(); resolve() }
          el.play()
        })
      } catch {
        if ("speechSynthesis" in window) {
          startTypewriter(greeting)
          const utterance = new SpeechSynthesisUtterance(greeting)
          utterance.rate = 1.0
          await new Promise<void>((resolve) => {
            utterance.onend = () => { stopTypewriter(); resolve() }
            utterance.onerror = () => { stopTypewriter(); resolve() }
            window.speechSynthesis.speak(utterance)
          })
        }
      }
      setState("idle")
      setTimeout(() => startListeningRef.current(), 500)
    }

    const timer = setTimeout(doGreet, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cancel ──────────────────────────────────────────────────────────
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
    stopAudioVisualization()
    setLiveText("")
    setState("idle")
  }, [stopTypewriter, stopAudioVisualization])

  // ── Mic button ──────────────────────────────────────────────────────
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

  // ── Keyboard shortcut (Space) ───────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat &&
          !(e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        handleMicClick()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleMicClick])

  // ── Handle suggestion click ─────────────────────────────────────────
  const handleSuggestionClick = useCallback((suggestion: AgentSuggestion) => {
    const text = suggestion.type === "chat"
      ? suggestion.description
      : `${suggestion.title}: ${suggestion.description}`
    sendToAgent(text)
  }, [sendToAgent])

  // ── Clear conversation ──────────────────────────────────────────────
  const clearConversation = useCallback(() => {
    setMessages([])
    historyRef.current = []
    setPendingActions([])
    pendingActionsRef.current = []
    setState("idle")
  }, [])

  // ── Waveform fallback animations ────────────────────────────────────
  useEffect(() => {
    if (state === "speaking") {
      const interval = setInterval(() => {
        setBars(Array.from({ length: BAR_COUNT }, () => 8 + Math.random() * 75))
      }, 100)
      return () => clearInterval(interval)
    }
    if (state !== "listening") {
      setBars(Array(BAR_COUNT).fill(3))
    }
  }, [state])

  // ── Thinking / confirming animation tick ────────────────────────────
  useEffect(() => {
    if (state !== "thinking" && state !== "confirming") return
    const interval = setInterval(() => setTick(t => t + 1), 80)
    return () => clearInterval(interval)
  }, [state])

  // ── Auto-scroll on state changes ────────────────────────────────────
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [liveText, speakingText, state, pendingActions.length, messages.length])

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between gap-4 px-5 py-3 border-b border-border/60 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
              <Brain className="h-5 w-5" />
            </div>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background transition-colors",
              state === "idle" ? "bg-muted-foreground/40" :
              state === "listening" ? "bg-primary animate-pulse" :
              state === "thinking" ? "bg-amber-400 animate-pulse" :
              state === "speaking" ? "bg-emerald-400 animate-pulse" :
              "bg-amber-400 animate-pulse"
            )} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground truncate">Voice Agent</h1>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
              <span className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                state === "idle" ? "bg-muted-foreground/40" : "bg-emerald-400"
              )} />
              {state === "idle" ? "Ready" : state === "listening" ? "Listening" : state === "thinking" ? "Processing" : state === "speaking" ? "Speaking" : "Awaiting confirmation"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Clear conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          {mailboxList.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMailboxMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/80 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-colors"
              >
                <Inbox className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[100px] truncate">
                  {selectedMailbox === "all"
                    ? `All (${mailboxList.length})`
                    : mailboxList.find(m => m.id === selectedMailbox)?.name ?? "Mailbox"}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
              </button>
              {showMailboxMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMailboxMenu(false)} aria-hidden />
                  <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[220px] rounded-xl border border-border bg-popover shadow-xl py-1.5 backdrop-blur-lg">
                    <button
                      onClick={() => { setSelectedMailbox("all"); setShowMailboxMenu(false) }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors rounded-lg mx-1",
                        selectedMailbox === "all" ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Inbox className="h-4 w-4 shrink-0" />
                      All Mailboxes
                    </button>
                    {mailboxList.map(mb => (
                      <button
                        key={mb.id}
                        onClick={() => { setSelectedMailbox(mb.id); setShowMailboxMenu(false) }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors rounded-lg mx-1",
                          selectedMailbox === mb.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                        )}
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
        </div>
      </header>

      {/* ─── Scrollable Content ──────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {/* Suggestions (when idle with few or no messages) */}
          {suggestions.length > 0 && messages.length <= 1 && state === "idle" && (
            <div className="space-y-2.5 pb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Suggested for you</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 5).map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSuggestionClick(s)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                      "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
                      s.urgency === "high"
                        ? "border-red-400/30 bg-red-400/5 text-red-400 hover:bg-red-400/10 hover:shadow-red-500/10"
                        : "border-border/60 bg-muted/30 text-foreground hover:bg-muted/60 hover:shadow-primary/5"
                    )}
                  >
                    <Zap className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[200px]">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-md"
                  : "bg-muted/60 text-foreground rounded-tl-md border border-border/40"
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={cn(
                  "text-[10px] mt-1.5 font-medium",
                  msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground/60"
                )}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 mt-0.5">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}

          {/* Live State Indicators */}
          {state === "listening" && (
            <div className="flex gap-3 justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-primary/10 border border-primary/20 px-4 py-3">
                {liveText ? (
                  <p className="text-sm text-foreground/90 leading-relaxed">&ldquo;{liveText}&rdquo;</p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    Listening...
                  </p>
                )}
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 mt-0.5">
                <User className="h-4 w-4 text-primary" />
              </div>
            </div>
          )}

          {state === "thinking" && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 mt-0.5">
                <Brain className="h-4 w-4 text-amber-500 animate-pulse" />
              </div>
              <div className="rounded-2xl rounded-tl-md bg-muted/60 border border-border/40 px-4 py-3">
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {state === "speaking" && speakingText && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 mt-0.5">
                <Volume2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-emerald-500/5 border border-emerald-500/20 px-4 py-3">
                <p className="text-sm text-foreground leading-relaxed">{speakingText}</p>
              </div>
            </div>
          )}

          {/* Pending Actions */}
          {pendingActions.length > 0 && (state === "confirming" || state === "listening") && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs text-amber-500 font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Pending confirmation</span>
              </div>
              {pendingActions.map(action => {
                const Icon = ACTION_ICONS[action.type] || Mail
                return (
                  <div
                    key={action.id}
                    className="flex items-center gap-3 rounded-xl border border-amber-400/25 bg-gradient-to-r from-amber-500/[0.06] to-transparent px-4 py-3 transition-all hover:border-amber-400/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                      <Icon className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground">{action.label}</p>
                      {action.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{action.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => executeAction(action)}
                        disabled={executingId === action.id}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        title="Confirm"
                      >
                        {executingId === action.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => rejectAction(action)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all hover:scale-105"
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div ref={scrollAnchorRef} className="min-h-0 shrink-0" aria-hidden />
        </div>
      </main>

      {/* ─── Fixed Bottom Voice Interface ────────────────────────── */}
      <div className="shrink-0 border-t border-border/40 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col items-center gap-3">

          {/* Audio Visualizer */}
          <div className="flex items-center justify-center gap-[2px] h-12 w-full max-w-md">
            {bars.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all",
                  state === "listening" ? "bg-primary/70 duration-75" :
                  state === "speaking" ? "bg-emerald-500/60 duration-100" :
                  state === "thinking" ? "bg-amber-400/40 duration-150" :
                  state === "confirming" ? "bg-amber-400/30 duration-200" :
                  "bg-muted-foreground/15 duration-300"
                )}
                style={{
                  width: `${Math.max(2, 100 / BAR_COUNT - 0.5)}%`,
                  height: state === "listening" || state === "speaking"
                    ? `${Math.max(6, h)}%`
                    : state === "thinking"
                      ? `${10 + Math.sin(i * 0.4 + tick * 0.3) * 14}%`
                      : state === "confirming"
                        ? `${6 + Math.sin(i * 0.3 + tick * 0.15) * 8}%`
                        : "8%",
                }}
              />
            ))}
          </div>

          {/* Orb Mic Button */}
          <div className="relative">
            {/* Outer pulse rings */}
            {state === "listening" && (
              <>
                <div className="absolute -inset-4 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
                <div className="absolute -inset-2 rounded-full bg-primary/15 animate-pulse" style={{ animationDuration: "1.5s" }} />
              </>
            )}
            {state === "speaking" && (
              <div className="absolute -inset-3 rounded-full bg-emerald-500/10 animate-pulse" style={{ animationDuration: "2s" }} />
            )}
            {state === "confirming" && (
              <div className="absolute -inset-3 rounded-full bg-amber-500/10 animate-pulse" style={{ animationDuration: "1.5s" }} />
            )}

            {/* Gradient glow */}
            <div className={cn(
              "absolute -inset-1 rounded-full blur-md transition-opacity duration-500",
              state === "listening" ? "opacity-100 bg-primary/30" :
              state === "speaking" ? "opacity-80 bg-emerald-500/25" :
              state === "confirming" ? "opacity-70 bg-amber-500/20" :
              "opacity-0"
            )} />

            <button
              onClick={handleMicClick}
              disabled={state === "thinking"}
              className={cn(
                "relative z-10 flex h-20 w-20 items-center justify-center rounded-full",
                "transition-all duration-300 ease-out shadow-lg",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                "disabled:pointer-events-none",
                state === "listening"
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground scale-110 shadow-primary/30"
                  : state === "speaking"
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25"
                    : state === "thinking"
                      ? "bg-muted text-muted-foreground cursor-wait shadow-none"
                      : state === "confirming"
                        ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/25 hover:scale-105"
                        : "bg-gradient-to-br from-muted/80 to-muted text-muted-foreground hover:from-primary hover:to-primary/90 hover:text-primary-foreground hover:scale-105 hover:shadow-primary/20"
              )}
            >
              {state === "listening" ? (
                <Waves className="h-9 w-9" />
              ) : state === "speaking" ? (
                <Volume2 className="h-9 w-9" />
              ) : state === "thinking" ? (
                <Loader2 className="h-9 w-9 animate-spin" />
              ) : (
                <Mic className="h-9 w-9" />
              )}
            </button>
          </div>

          {/* Controls & hints */}
          <div className="flex flex-col items-center gap-2 w-full">
            {/* Status hint */}
            <p className="text-xs text-muted-foreground text-center">
              {state === "idle" && (
                <span className="flex items-center gap-2 justify-center">
                  Tap mic or press
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono font-medium">Space</kbd>
                  to talk
                </span>
              )}
              {state === "listening" && (
                autoSilence
                  ? "Auto-sends after you pause speaking"
                  : "Tap mic again to send your message"
              )}
              {state === "confirming" && "Say Yes/No or use the buttons above"}
              {state === "speaking" && (
                <button type="button" onClick={cancel} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" /> Stop speaking
                </button>
              )}
            </p>

            {/* Auto-silence toggle */}
            {(state === "idle" || state === "listening") && (
              <button
                onClick={() => setAutoSilence(v => !v)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all",
                  autoSilence
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {autoSilence ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                Auto-send: {autoSilence ? "On" : "Off"}
              </button>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center px-4">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
