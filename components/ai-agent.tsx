"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Mic,
  Loader2,
  Volume2,
  X,
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
  Zap,
  RotateCcw,
  Square,
  Search,
} from "lucide-react"
import {
  agent as agentApi,
  mailboxes as mailboxesApi,
  type MailboxApi,
  type AgentActionApi,
  type AgentSuggestion,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/* ─── Types ──────────────────────────────────────────────────────────── */

type HistoryEntry = { role: "user" | "assistant"; content: string }

type DisplayMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  actions?: AgentActionApi[]
}

type AgentState = "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "confirming"

/* ─── Constants ──────────────────────────────────────────────────────── */

const TLDS = "com|org|net|io|ai|co|edu|gov|dev|info|biz|me|uk|pk|in"
const ORB_BARS = 64
/** Whisper fallback: poll transcription while recording so live text updates (like Web Speech interim). */
const WHISPER_INTERIM_MS = 1600
const MIN_WHISPER_INTERIM_BYTES = 6000
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
  "send_email", "send_reply", "reply_all", "forward_email", "draft_email", "draft_reply",
])

function formatRecipients(value: unknown): string {
  if (!value) return ""
  if (Array.isArray(value)) return value.filter(Boolean).map(String).join(", ")
  return String(value)
}

function VoiceActionCard({
  action,
  isExecuting,
  onApprove,
  onReject,
}: {
  action: AgentActionApi
  isExecuting: boolean
  onApprove: (action: AgentActionApi) => void
  onReject: (action: AgentActionApi) => void
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
  const BODY_SNIPPET = 280
  const bodyTooLong = bodyStr.length > BODY_SNIPPET
  const bodyShown = bodyExpanded || !bodyTooLong ? bodyStr : bodyStr.slice(0, BODY_SNIPPET).trimEnd() + "…"

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200",
      isExecuted
        ? "border-emerald-400/30 bg-gradient-to-r from-emerald-500/[0.08] to-transparent shadow-sm shadow-emerald-500/5"
        : isRejected
          ? "border-red-400/30 bg-gradient-to-r from-red-500/[0.06] to-transparent opacity-60"
          : "border-amber-400/30 bg-gradient-to-r from-amber-500/[0.08] to-transparent hover:border-amber-400/45",
    )}>
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
          {action.description && !isExecuted && !isRejected && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.description}</p>
          )}
          {isExecuted && <p className="text-xs text-emerald-500 mt-0.5 font-medium">Executed</p>}
          {isRejected && <p className="text-xs text-red-500 mt-0.5 font-medium">Rejected</p>}
        </div>
        {showButtons && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onApprove(action)}
              disabled={isExecuting}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              title="Approve"
            >
              {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onReject(action)}
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
                  onClick={() => setBodyExpanded(v => !v)}
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

let msgIdCounter = 0
function nextMsgId(): string {
  return `msg-${++msgIdCounter}-${Date.now()}`
}

function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]*/g) ?? [text]
  const result: string[] = []
  let acc = ""
  for (const p of parts) {
    const t = p.trim()
    if (!t) continue
    acc = acc ? `${acc} ${t}` : t
    if (acc.length >= 40) { result.push(acc); acc = "" }
  }
  if (acc) result.push(acc)
  return result.length ? result : [text]
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export function AiAgent() {
  const [state, setState] = useState<AgentState>("idle")
  const [liveText, setLiveText] = useState("")
  const [speakingText, setSpeakingText] = useState("")
  const [error, setError] = useState("")
  const [mailboxList, setMailboxList] = useState<MailboxApi[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState("all")
  const [showMailboxMenu, setShowMailboxMenu] = useState(false)
  const [pendingActions, setPendingActions] = useState<AgentActionApi[]>([])
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([])
  const [bars, setBars] = useState<number[]>(() => Array(ORB_BARS).fill(0))
  const [tick, setTick] = useState(0)

  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ttsGenerationRef = useRef(0)
  const ttsPlaybackResolveRef = useRef<(() => void) | null>(null)
  const ttsBlobUrlRef = useRef<string | null>(null)
  const historyRef = useRef<HistoryEntry[]>([])
  const recognizedTextRef = useRef("")
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendingRef = useRef(false)
  const selectedMailboxRef = useRef(selectedMailbox)
  selectedMailboxRef.current = selectedMailbox
  const startListeningRef = useRef<() => void>(() => {})
  const pendingActionsRef = useRef<AgentActionApi[]>([])
  const silenceCheckerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastSpeechTimeRef = useRef<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const useWhisperFallbackRef = useRef(false)
  const voiceSessionActiveRef = useRef(false)
  const voiceEpochRef = useRef(0)
  const skipRecorderTranscribeRef = useRef(false)
  const skipRecognitionResultRef = useRef(false)
  const whisperInterimPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const whisperSttSessionRef = useRef(0)
  const whisperInterimBusyRef = useRef(false)
  const refreshMailboxList = useCallback(() => {
    mailboxesApi.list().then(setMailboxList).catch(() => {})
  }, [])

  const bumpWhisperSttSessionAndClearPoll = useCallback(() => {
    if (whisperInterimPollRef.current) {
      clearInterval(whisperInterimPollRef.current)
      whisperInterimPollRef.current = null
    }
    whisperSttSessionRef.current += 1
  }, [])

  const scrollToLatest = useCallback(() => {
    requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [])

  const addMessage = useCallback((role: "user" | "assistant", content: string, actions?: AgentActionApi[]) => {
    const msg: DisplayMessage = { id: nextMsgId(), role, content, timestamp: new Date(), actions }
    setMessages(prev => [...prev, msg])
    setTimeout(() => scrollToLatest(), 50)
    return msg
  }, [scrollToLatest])

  const resumeListening = useCallback(() => {
    if (!voiceSessionActiveRef.current) return
    setTimeout(() => startListeningRef.current(), 300)
  }, [])

  const stopTypewriter = useCallback(() => setSpeakingText(""), [])

  /* ── Audio visualization ────────────────────────────────────────── */
  const startAudioVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const ctx = new AudioContext()
      audioContextRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const animate = () => {
        analyser.getByteFrequencyData(dataArray)
        const newBars: number[] = []
        const binCount = dataArray.length
        for (let i = 0; i < ORB_BARS; i++) {
          const binIdx = Math.floor((i / ORB_BARS) * binCount)
          const value = dataArray[binIdx] ?? 0
          const dist = Math.abs(i - ORB_BARS / 2) / (ORB_BARS / 2)
          const bellCurve = Math.exp(-dist * dist * 2.5)
          newBars.push((value / 255) * bellCurve)
        }
        setBars(newBars)
        animFrameRef.current = requestAnimationFrame(animate)
      }
      animFrameRef.current = requestAnimationFrame(animate)
    } catch {
      const fallback = () => {
        setBars(Array.from({ length: ORB_BARS }, (_, i) => {
          const dist = Math.abs(i - ORB_BARS / 2) / (ORB_BARS / 2)
          return (0.15 + Math.random() * 0.35) * Math.exp(-dist * dist * 2)
        }))
        animFrameRef.current = requestAnimationFrame(fallback)
      }
      animFrameRef.current = requestAnimationFrame(fallback)
    }
  }, [])

  const stopAudioVisualization = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null }
    if (audioContextRef.current?.state !== "closed") audioContextRef.current?.close().catch(() => {})
    audioContextRef.current = null
    analyserRef.current = null
    setBars(Array(ORB_BARS).fill(0))
  }, [])

  /* ── TTS control ────────────────────────────────────────────────── */
  const haltTtsPlayback = useCallback(() => {
    ttsGenerationRef.current += 1
    const el = audioRef.current
    if (el) {
      el.onended = null; el.onerror = null; el.pause(); el.currentTime = 0
      try { el.removeAttribute("src"); el.load() } catch { /* ignore */ }
      audioRef.current = null
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    const blobUrl = ttsBlobUrlRef.current
    if (blobUrl) { try { URL.revokeObjectURL(blobUrl) } catch { /* ignore */ } ttsBlobUrlRef.current = null }
    ttsPlaybackResolveRef.current?.()
    ttsPlaybackResolveRef.current = null
  }, [])

  const speak = useCallback(async (text: string) => {
    const gen = ttsGenerationRef.current
    const sentences = splitSentences(text)
    setSpeakingText("")

    const fetchAudio = async (sentence: string): Promise<Blob | null> => {
      try {
        const res = await agentApi.speak(sentence)
        if (!res?.audio) return null
        const bytes = Uint8Array.from(atob(res.audio), (c) => c.charCodeAt(0))
        return new Blob([bytes], { type: "audio/mp3" })
      } catch { return null }
    }

    const playBlob = async (blob: Blob, sentence: string): Promise<void> => {
      const url = URL.createObjectURL(blob)
      ttsBlobUrlRef.current = url
      const el = new Audio(url)
      audioRef.current = el
      return new Promise<void>((resolve) => {
        let settled = false
        const finish = () => {
          if (settled) return; settled = true
          ttsPlaybackResolveRef.current = null
          try { URL.revokeObjectURL(url) } catch { /* ignore */ }
          if (ttsBlobUrlRef.current === url) ttsBlobUrlRef.current = null
          el.onended = null; el.onerror = null; resolve()
        }
        ttsPlaybackResolveRef.current = resolve
        el.onended = () => finish(); el.onerror = () => finish()
        el.onplay = () => { if (gen === ttsGenerationRef.current) setSpeakingText(prev => prev ? `${prev} ${sentence}` : sentence) }
        void el.play().catch(() => finish())
      })
    }

    // Pipeline: fetch next sentence while playing current for low latency
    let nextFetch = fetchAudio(sentences[0])
    let anyPlayed = false

    for (let i = 0; i < sentences.length; i++) {
      if (gen !== ttsGenerationRef.current) return
      const blob = await nextFetch
      if (gen !== ttsGenerationRef.current) return
      if (i + 1 < sentences.length) nextFetch = fetchAudio(sentences[i + 1])

      if (blob) {
        anyPlayed = true
        await playBlob(blob, sentences[i])
      }
      if (gen !== ttsGenerationRef.current) return
    }

    // Fallback to browser SpeechSynthesis if TTS completely failed
    if (!anyPlayed && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 400))
      utterance.rate = 1.05
      const voices = window.speechSynthesis.getVoices()
      const best = voices.find(v => v.name.toLowerCase().includes("google") && v.lang.startsWith("en"))
        || voices.find(v => v.lang === "en-US")
        || voices.find(v => v.lang.startsWith("en"))
      if (best) utterance.voice = best
      await new Promise<void>((resolve) => {
        let settled = false
        const finish = () => { if (settled) return; settled = true; ttsPlaybackResolveRef.current = null; resolve() }
        ttsPlaybackResolveRef.current = resolve
        utterance.onstart = () => { if (gen === ttsGenerationRef.current) setSpeakingText(text) }
        utterance.onend = () => finish(); utterance.onerror = () => finish()
        window.speechSynthesis.speak(utterance)
      })
    }

    if (gen !== ttsGenerationRef.current) return
    setSpeakingText("")
  }, [])

  /* ── Execute / reject actions ───────────────────────────────────── */
  const executeAction = useCallback(async (action: AgentActionApi) => {
    const epochAtStart = voiceEpochRef.current
    const runGen = ttsGenerationRef.current
    setExecutingId(action.id)
    try {
      const scopedMailboxId = selectedMailboxRef.current !== "all" ? selectedMailboxRef.current : undefined
      const scopedAction =
        !action.mailbox_id && scopedMailboxId
          ? { ...action, mailbox_id: scopedMailboxId }
          : action
      const result = await agentApi.execute(scopedAction)
      if (epochAtStart !== voiceEpochRef.current) return
      const isCompleted = (result.status || "").toLowerCase() === "completed"
      const failedCount = Number(result.failed || 0)
      const markedCount = Number(result.marked || 1)
      if (!isCompleted || failedCount > 0 || markedCount <= 0) {
        throw new Error(result.execution_details || "Action ran but no email matched the target.")
      }

      // Mark as executed (stays visible, turns green) then auto-remove after 3s
      setPendingActions(prev => prev.map(a => a.id === action.id ? { ...a, status: "executed" } : a))
      pendingActionsRef.current = pendingActionsRef.current.filter(a => a.id !== action.id)
      setTimeout(() => setPendingActions(prev => prev.filter(a => a.id !== action.id)), 3000)

      toast.success(`${action.label} executed!`)
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

      setState("speaking")
      const doneMsg = `Done, ${action.label} has been executed.`
      addMessage("assistant", doneMsg)
      await speak(doneMsg)
      if (runGen !== ttsGenerationRef.current) return
      if (epochAtStart !== voiceEpochRef.current) return
      if (pendingActionsRef.current.length === 0) { setState("idle"); resumeListening() }
      else setState("confirming")
    } catch (e) {
      if (epochAtStart !== voiceEpochRef.current) return
      const detail = e instanceof Error && e.message ? e.message : "Action could not be completed."
      toast.error(detail)
      setState("speaking")
      const errMsg = `Sorry, I couldn't complete that action. ${detail}`
      addMessage("assistant", errMsg)
      await speak(errMsg)
      if (runGen !== ttsGenerationRef.current) return
      if (epochAtStart !== voiceEpochRef.current) return
      setState("confirming")
    } finally { setExecutingId(null) }
  }, [speak, addMessage, resumeListening])

  const rejectAction = useCallback(async (action: AgentActionApi) => {
    try { await agentApi.reject(action.id) } catch { /* ignore */ }
    // Mark as rejected (stays visible, turns red) then auto-remove after 2s
    setPendingActions(prev => prev.map(a => a.id === action.id ? { ...a, status: "rejected" } : a))
    pendingActionsRef.current = pendingActionsRef.current.filter(a => a.id !== action.id)
    setTimeout(() => setPendingActions(prev => prev.filter(a => a.id !== action.id)), 2000)
    if (pendingActionsRef.current.length === 0) { setState("idle"); resumeListening() }
  }, [resumeListening])

  /* ── Voice confirmation ─────────────────────────────────────────── */
  const handleVoiceConfirmation = useCallback(async (text: string) => {
    const lower = text.toLowerCase().trim()
    const isYes = /^(yes|yeah|yep|yup|haan|ha+n|ok|okay|sure|go ahead|do it|send it|confirm|approve|kar do|bhej do)/.test(lower)
    const isNo = /^(no|nah|nope|cancel|don't|nahi|mat|ruk|stop|reject)/.test(lower)

    if (isYes && pendingActionsRef.current.length > 0) {
      for (const action of [...pendingActionsRef.current]) await executeAction(action)
    } else if (isNo) {
      const epochAtStart = voiceEpochRef.current
      const runGen = ttsGenerationRef.current
      for (const action of [...pendingActionsRef.current]) await rejectAction(action)
      if (epochAtStart !== voiceEpochRef.current) return
      setState("speaking")
      addMessage("assistant", "Alright, cancelled.")
      await speak("Alright, cancelled.")
      if (runGen !== ttsGenerationRef.current) return
      if (epochAtStart !== voiceEpochRef.current) return
      setState("idle"); resumeListening()
    } else {
      const epochAtStart = voiceEpochRef.current
      addMessage("user", text)
      historyRef.current.push({ role: "user", content: text })
      sendingRef.current = true
      const runGen = ttsGenerationRef.current
      setState("thinking"); scrollToLatest()
      try {
        const recent = historyRef.current.slice(-10)
        const mbId = selectedMailboxRef.current === "all" ? undefined : selectedMailboxRef.current
        const res = await agentApi.chat(text.trim(), recent, mbId)
        if (epochAtStart !== voiceEpochRef.current) return
        const reply = res.content || "I didn't catch that."
        historyRef.current.push({ role: "assistant", content: reply })
        const newActions = res.actions ?? []
        if (newActions.length > 0) {
          pendingActionsRef.current = [...pendingActionsRef.current, ...newActions]
          setPendingActions([...pendingActionsRef.current])
        }
        addMessage("assistant", reply, newActions.length ? newActions : undefined)
        setState("speaking"); await speak(reply)
        if (runGen !== ttsGenerationRef.current) return
        if (epochAtStart !== voiceEpochRef.current) return
        if (pendingActionsRef.current.length > 0) { setState("confirming"); resumeListening() }
        else { setState("idle"); resumeListening() }
      } catch {
        if (epochAtStart !== voiceEpochRef.current) return
        addMessage("assistant", "Something went wrong, try again.")
        setState("speaking"); await speak("Something went wrong, try again.")
        if (runGen !== ttsGenerationRef.current) return
        if (epochAtStart !== voiceEpochRef.current) return
        if (pendingActionsRef.current.length > 0) { setState("confirming"); resumeListening() }
        else { setState("idle"); resumeListening() }
      } finally { sendingRef.current = false }
    }
  }, [executeAction, rejectAction, speak, addMessage, scrollToLatest, resumeListening])

  const handleVoiceConfirmationRef = useRef(handleVoiceConfirmation)
  handleVoiceConfirmationRef.current = handleVoiceConfirmation

  /* ── Send to agent (streaming pipeline: LLM tokens → sentences → TTS in parallel) ── */
  const sendToAgent = useCallback(async (text: string) => {
    if (!text.trim() || sendingRef.current) return
    if (pendingActionsRef.current.length > 0) { await handleVoiceConfirmationRef.current(text); return }
    const epochAtStart = voiceEpochRef.current
    sendingRef.current = true
    setLiveText(""); setState("thinking")
    const runGen = ttsGenerationRef.current
    addMessage("user", text.trim())
    historyRef.current.push({ role: "user", content: text.trim() })
    scrollToLatest()

    const fetchAudioBlob = async (sentence: string): Promise<Blob | null> => {
      try {
        const res = await agentApi.speak(sentence)
        if (!res?.audio) return null
        const bytes = Uint8Array.from(atob(res.audio), c => c.charCodeAt(0))
        return new Blob([bytes], { type: "audio/mp3" })
      } catch { return null }
    }

    const playBlobInline = (blob: Blob, sentence: string): Promise<void> => {
      const url = URL.createObjectURL(blob)
      ttsBlobUrlRef.current = url
      const el = new Audio(url)
      audioRef.current = el
      return new Promise<void>((resolve) => {
        let settled = false
        const finish = () => {
          if (settled) return; settled = true
          ttsPlaybackResolveRef.current = null
          try { URL.revokeObjectURL(url) } catch { /* ignore */ }
          if (ttsBlobUrlRef.current === url) ttsBlobUrlRef.current = null
          el.onended = null; el.onerror = null; resolve()
        }
        ttsPlaybackResolveRef.current = resolve
        el.onended = () => finish(); el.onerror = () => finish()
        el.onplay = () => { if (runGen === ttsGenerationRef.current) setSpeakingText(prev => prev ? `${prev} ${sentence}` : sentence) }
        void el.play().catch(() => finish())
      })
    }

    const tSend = performance.now()

    try {
      const recent = historyRef.current.slice(-10)
      const mbId = selectedMailboxRef.current === "all" ? undefined : selectedMailboxRef.current

      // Sentence accumulation + in-flight TTS fetches
      const sentenceTexts: string[] = []
      const ttsFetches: Array<Promise<Blob | null>> = []
      let tokenBuf = ""
      let finalContent = ""
      let finalActions: AgentActionApi[] = []
      let finalSources: { email_id: string; subject: string }[] = []
      let spokenAny = false
      let tFirstToken: number | null = null
      let tFirstSentence: number | null = null

      const tryFlushSentence = () => {
        // First clause: fire ASAP on . ! ? , ; : at >=12 chars (kicks TTS earlier).
        // Subsequent: require sentence-ending punctuation at >=20 chars (better prosody).
        const isFirst = sentenceTexts.length === 0
        const re = isFirst ? /^(.*?[.!?,;:]+)(\s+|$)/ : /^(.*?[.!?]+)(\s+|$)/
        const minLen = isFirst ? 12 : 20
        const m = tokenBuf.match(re)
        if (m && m[1].trim().length >= minLen) {
          const sentence = m[1].trim()
          tokenBuf = tokenBuf.slice(m[0].length)
          if (tFirstSentence === null) {
            tFirstSentence = performance.now()
            console.log(`%c[3] First sentence ready: ${((tFirstSentence - tSend) / 1000).toFixed(2)}s  — firing TTS`, "color:#34d399")
          }
          sentenceTexts.push(sentence)
          ttsFetches.push(fetchAudioBlob(sentence))
          if (!spokenAny) { spokenAny = true; setState("speaking") }
          return true
        }
        return false
      }

      for await (const event of agentApi.chatStream(text.trim(), recent, mbId)) {
        if (epochAtStart !== voiceEpochRef.current || runGen !== ttsGenerationRef.current) return
        if (event.type === "token" && event.content) {
          if (tFirstToken === null) {
            tFirstToken = performance.now()
            console.log(`%c[2] First LLM token:     ${((tFirstToken - tSend) / 1000).toFixed(2)}s  (RAG + queue)`, "color:#f59e0b")
          }
          tokenBuf += event.content
          finalContent += event.content
          while (tryFlushSentence()) { /* drain */ }
        } else if (event.type === "done") {
          if (tokenBuf.trim().length >= 5) {
            if (tFirstSentence === null) {
              tFirstSentence = performance.now()
              console.log(`%c[3] First sentence ready: ${((tFirstSentence - tSend) / 1000).toFixed(2)}s  — firing TTS`, "color:#34d399")
            }
            sentenceTexts.push(tokenBuf.trim())
            ttsFetches.push(fetchAudioBlob(tokenBuf.trim()))
          }
          const tDone = performance.now()
          console.log(`%c[4] LLM stream done:     ${((tDone - tSend) / 1000).toFixed(2)}s  (${sentenceTexts.length} sentence(s))`, "color:#f59e0b")
          finalActions = event.actions ?? []
          finalSources = event.sources ?? []
          finalContent = event.content ?? finalContent
        }
      }

      if (epochAtStart !== voiceEpochRef.current) return

      if (sentenceTexts.length === 0 && !finalContent) {
        console.groupEnd()
        addMessage("assistant", "I didn't catch that, could you try again?")
        setState("speaking"); await speak("I didn't catch that, could you try again?")
        setState("idle"); resumeListening()
        return
      }

      historyRef.current.push({ role: "assistant", content: finalContent })
      if (finalActions.length > 0) { pendingActionsRef.current = finalActions; setPendingActions(finalActions) }
      addMessage("assistant", finalContent, finalActions.length > 0 ? finalActions : undefined)

      setState("speaking")
      setSpeakingText("")

      // Play sentences in order — TTS fetches are already in flight
      for (let i = 0; i < sentenceTexts.length; i++) {
        if (runGen !== ttsGenerationRef.current || epochAtStart !== voiceEpochRef.current) return
        const blob = await ttsFetches[i]
        if (runGen !== ttsGenerationRef.current || epochAtStart !== voiceEpochRef.current) return
        if (i === 0) {
          const tAudio = performance.now()
          console.log(`%c[5] First audio ready:   ${((tAudio - tSend) / 1000).toFixed(2)}s  (TTS latency)`, "color:#34d399")
        }
        if (blob) {
          if (i === 0) {
            const tPlay = performance.now()
            console.log(`%c[6] First audio playing: ${((tPlay - tSend) / 1000).toFixed(2)}s  ← perceived latency`, "color:#4ade80;font-weight:bold")
          }
          await playBlobInline(blob, sentenceTexts[i])
        }
      }

      if (runGen !== ttsGenerationRef.current || epochAtStart !== voiceEpochRef.current) return
      setSpeakingText("")

      const tEnd = performance.now()
      console.log(`%c[7] All audio done:      ${((tEnd - tSend) / 1000).toFixed(2)}s  (full response)`, "color:#a78bfa")
      console.groupEnd()

      if (finalActions.length > 0) {
        setState("confirming"); resumeListening()
      } else { setState("idle"); resumeListening() }
    } catch {
      console.groupEnd()
      if (epochAtStart !== voiceEpochRef.current) return
      addMessage("assistant", "I couldn't process that, please try again.")
      setState("speaking"); await speak("I couldn't process that, please try again.")
      if (runGen !== ttsGenerationRef.current || epochAtStart !== voiceEpochRef.current) return
      setState("idle"); resumeListening()
    } finally { sendingRef.current = false }
  }, [speak, addMessage, scrollToLatest, resumeListening])

  const sendToAgentRef = useRef(sendToAgent)
  sendToAgentRef.current = sendToAgent

  /* ── MediaRecorder fallback (Whisper STT) for non-Chrome browsers ── */
  const stopMediaRecorder = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== "inactive") mr.stop()
    mediaRecorderRef.current = null
  }, [])

  const startMediaRecorderFallback = useCallback(async () => {
    skipRecorderTranscribeRef.current = false
    bumpWhisperSttSessionAndClearPoll()
    setError("")
    setLiveText("")
    lastSpeechTimeRef.current = Date.now()
    recordedChunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : ""
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
      const sttSession = whisperSttSessionRef.current

      // VAD silence detection using the recording stream's audio levels
      const silenceCtx = new AudioContext()
      const silenceSource = silenceCtx.createMediaStreamSource(stream)
      const silenceAnalyser = silenceCtx.createAnalyser()
      silenceAnalyser.fftSize = 256
      silenceSource.connect(silenceAnalyser)
      const silenceData = new Uint8Array(silenceAnalyser.frequencyBinCount)
      let hadSpeech = false
      let silenceSince = 0
      silenceCheckerRef.current = setInterval(() => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") return
        silenceAnalyser.getByteFrequencyData(silenceData)
        const avg = silenceData.reduce((a, b) => a + b, 0) / silenceData.length
        if (avg > 12) { hadSpeech = true; silenceSince = Date.now() }
        else if (hadSpeech && Date.now() - silenceSince > 800) {
          if (silenceCheckerRef.current) { clearInterval(silenceCheckerRef.current); silenceCheckerRef.current = null }
          if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop()
        }
      }, 150)

      mr.onstop = async () => {
        if (silenceCheckerRef.current) { clearInterval(silenceCheckerRef.current); silenceCheckerRef.current = null }
        silenceCtx.close().catch(() => {})
        bumpWhisperSttSessionAndClearPoll()
        stream.getTracks().forEach(t => t.stop())
        stopAudioVisualization()
        if (skipRecorderTranscribeRef.current) {
          skipRecorderTranscribeRef.current = false
          return
        }
        const chunks = recordedChunksRef.current
        const epochAtStart = voiceEpochRef.current
        if (chunks.length === 0) {
          if (pendingActionsRef.current.length > 0) setState("confirming"); else setState("idle")
          setLiveText("")
          return
        }
        const audioBlob = new Blob(chunks, { type: mr.mimeType || "audio/webm" })
        setState("transcribing")
        const t0 = performance.now()
        console.group("%c🎙 Voice Agent — timing", "color:#a78bfa;font-weight:bold")
        console.log(`Audio size: ${(audioBlob.size / 1024).toFixed(1)} KB`)
        try {
          const result = await agentApi.transcribe(audioBlob)
          const tTranscribed = performance.now()
          console.log(`%c[1] STT (Whisper):       ${((tTranscribed - t0) / 1000).toFixed(2)}s`, "color:#60a5fa")
          if (epochAtStart !== voiceEpochRef.current) { console.groupEnd(); return }
          const text = normalizeSpeechText(result.text || "")
          if (text.trim()) {
            console.log(`     Transcript: "${text.trim()}"`)
            setLiveText("")
            sendToAgentRef.current(text)
          } else {
            console.groupEnd()
            setError("No speech detected. Try again.")
            if (pendingActionsRef.current.length > 0) setState("confirming"); else setState("idle")
          }
        } catch {
          console.groupEnd()
          if (epochAtStart !== voiceEpochRef.current) return
          setError("Transcription failed. Please try again.")
          if (pendingActionsRef.current.length > 0) setState("confirming"); else setState("idle")
        }
      }
      mr.start(250)
      setState("listening")
      startAudioVisualization()
      whisperInterimPollRef.current = setInterval(() => {
        void (async () => {
          if (sttSession !== whisperSttSessionRef.current) return
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") return
          if (whisperInterimBusyRef.current) return
          const chunks = [...recordedChunksRef.current]
          if (chunks.length === 0) return
          const interimBlob = new Blob(chunks, { type: mr.mimeType || "audio/webm" })
          if (interimBlob.size < MIN_WHISPER_INTERIM_BYTES) return
          whisperInterimBusyRef.current = true
          try {
            const result = await agentApi.transcribe(interimBlob)
            if (sttSession !== whisperSttSessionRef.current) return
            const text = normalizeSpeechText(result.text || "")
            if (text.trim()) setLiveText(text)
          } catch {
            /* ignore interim errors */
          } finally {
            whisperInterimBusyRef.current = false
          }
        })()
      }, WHISPER_INTERIM_MS)
    } catch {
      setError("Microphone access denied. Please allow mic permissions.")
      if (pendingActionsRef.current.length > 0) setState("confirming"); else setState("idle")
    }
  }, [bumpWhisperSttSessionAndClearPoll, startAudioVisualization, stopAudioVisualization, stopMediaRecorder])

  /* ── Speech Recognition ─────────────────────────────────────────── */
  const startListening = useCallback(() => {
    skipRecognitionResultRef.current = false
    setError(""); recognizedTextRef.current = ""; lastSpeechTimeRef.current = Date.now()

    if (useWhisperFallbackRef.current) {
      startMediaRecorderFallback()
      return
    }

    const SR = typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as unknown as { webkitSpeechRecognition: any }).webkitSpeechRecognition
      : null
    if (!SR) {
      useWhisperFallbackRef.current = true
      startMediaRecorderFallback()
      return
    }
    const recognition = new SR()
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-US"
    recognition.onresult = (event: any) => {
      let final = "", interim = ""
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript
      }
      const normalized = normalizeSpeechText(final + interim)
      setLiveText(normalized)
      recognizedTextRef.current = normalized
      lastSpeechTimeRef.current = Date.now()
      // Auto-stop 1.2 s after last final result → fast submit without manual tap
      if (final) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null
          recognitionRef.current?.stop()
        }, 1200)
      }
    }
    recognition.onerror = (event: any) => {
      const errType = event?.error ?? "unknown"
      if (errType === "network" || errType === "service-not-allowed" || errType === "not-allowed") {
        stopAudioVisualization()
        recognitionRef.current = null
        if (errType === "not-allowed") {
          setError("Microphone access denied. Please allow mic permissions.")
          if (pendingActionsRef.current.length > 0) setState("confirming"); else setState("idle")
          setLiveText("")
          return
        }
        useWhisperFallbackRef.current = true
        startMediaRecorderFallback()
        return
      }
      stopAudioVisualization()
      if (pendingActionsRef.current.length > 0) setState("confirming"); else setState("idle")
      setLiveText("")
      if (errType !== "aborted" && errType !== "no-speech") setError(`Speech recognition error: ${errType}`)
    }
    recognition.onend = () => {
      stopAudioVisualization()
      const captured = recognizedTextRef.current.trim()
      recognizedTextRef.current = ""
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
      if (skipRecognitionResultRef.current) {
        skipRecognitionResultRef.current = false
        return
      }
      if (captured) {
        setLiveText("")
        sendToAgentRef.current(normalizeSpeechText(captured))
      } else if (pendingActionsRef.current.length > 0) {
        setState("confirming")
      } else {
        setState("idle")
      }
    }
    recognitionRef.current = recognition; recognition.start()
    setState("listening"); setLiveText(""); startAudioVisualization()
  }, [startAudioVisualization, stopAudioVisualization, startMediaRecorderFallback])

  startListeningRef.current = startListening

  /* ── Init ───────────────────────────────────────────────────────── */
  useEffect(() => {
    refreshMailboxList()
    agentApi.suggestions().then(setSuggestions).catch(() => {})
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
    if (selectedMailbox === "all") return
    if (!mailboxList.some((m) => m.id === selectedMailbox)) {
      setSelectedMailbox("all")
    }
  }, [mailboxList, selectedMailbox])

  /* ── Cancel / teardown ───────────────────────────────────────────── */
  const teardownVoiceResources = useCallback(() => {
    bumpWhisperSttSessionAndClearPoll()
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (silenceCheckerRef.current) { clearInterval(silenceCheckerRef.current); silenceCheckerRef.current = null }
    recognizedTextRef.current = ""
    sendingRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    stopMediaRecorder()
    haltTtsPlayback()
    stopTypewriter()
    stopAudioVisualization()
  }, [bumpWhisperSttSessionAndClearPoll, haltTtsPlayback, stopTypewriter, stopAudioVisualization, stopMediaRecorder])

  const cancel = useCallback(() => {
    voiceEpochRef.current += 1
    voiceSessionActiveRef.current = false
    skipRecorderTranscribeRef.current = true
    skipRecognitionResultRef.current = true
    teardownVoiceResources()
    setLiveText("")
    setState("idle")
  }, [teardownVoiceResources])

  // Keep a ref so the unmount cleanup always calls the latest version without
  // re-subscribing the effect (which would fire the cleanup on every render
  // that produces a new teardownVoiceResources reference, briefly killing
  // the recognition that was just started).
  const teardownVoiceResourcesRef = useRef(teardownVoiceResources)
  teardownVoiceResourcesRef.current = teardownVoiceResources

  useEffect(() => () => {
    voiceEpochRef.current += 1
    voiceSessionActiveRef.current = false
    skipRecorderTranscribeRef.current = true
    skipRecognitionResultRef.current = true
    teardownVoiceResourcesRef.current()
  }, [])

  const handleMicClick = useCallback(() => {
    if (state === "listening") {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      recognitionRef.current?.stop()
      stopMediaRecorder()
      return
    }
    if (state === "idle" || state === "confirming") {
      voiceSessionActiveRef.current = true
      startListening()
      return
    }
    if (state === "speaking") {
      cancel()
      return
    }
  }, [state, startListening, cancel, stopMediaRecorder])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement)) {
        e.preventDefault(); handleMicClick()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleMicClick])

  const handleSuggestionClick = useCallback((s: AgentSuggestion) => {
    voiceSessionActiveRef.current = true
    sendToAgent(s.type === "chat" ? s.description : `${s.title}: ${s.description}`)
  }, [sendToAgent])

  const clearConversation = useCallback(() => {
    voiceEpochRef.current += 1
    voiceSessionActiveRef.current = false
    skipRecorderTranscribeRef.current = true
    skipRecognitionResultRef.current = true
    teardownVoiceResources()
    setMessages([])
    historyRef.current = []
    setPendingActions([])
    pendingActionsRef.current = []
    setState("idle")
    setLiveText("")
  }, [teardownVoiceResources])

  /* ── Animations ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (state === "speaking") {
      const interval = setInterval(() => {
        setBars(Array.from({ length: ORB_BARS }, (_, i) => {
          const dist = Math.abs(i - ORB_BARS / 2) / (ORB_BARS / 2)
          return (0.2 + Math.random() * 0.7) * Math.exp(-dist * dist * 1.8)
        }))
      }, 80)
      return () => clearInterval(interval)
    }
    if (state !== "listening" && state !== "transcribing") setBars(Array(ORB_BARS).fill(0))
  }, [state])

  useEffect(() => {
    if (state !== "thinking" && state !== "confirming" && state !== "transcribing") return
    const interval = setInterval(() => setTick(t => t + 1), 60)
    return () => clearInterval(interval)
  }, [state])

  /* ─── Derived ────────────────────────────────────────────────────── */
  const stateColor =
    state === "listening" ? "from-blue-500 to-cyan-400" :
    state === "speaking" ? "from-emerald-400 to-teal-500" :
    state === "thinking" ? "from-amber-400 to-orange-500" :
    state === "transcribing" ? "from-amber-400 to-orange-500" :
    state === "confirming" ? "from-amber-400 to-yellow-500" :
    "from-zinc-400/60 to-zinc-500/60 dark:from-zinc-500/40 dark:to-zinc-600/40"

  const stateGlow =
    state === "listening" ? "shadow-blue-500/25" :
    state === "speaking" ? "shadow-emerald-500/25" :
    state === "thinking" ? "shadow-amber-500/20" :
    state === "transcribing" ? "shadow-amber-500/20" :
    state === "confirming" ? "shadow-amber-500/20" :
    "shadow-transparent"

  const stateLabel =
    state === "idle" ? "Tap to speak" :
    state === "listening" ? "Listening..." :
    state === "transcribing" ? "Transcribing..." :
    state === "thinking" ? "Thinking..." :
    state === "speaking" ? "Speaking..." :
    "Confirm action"

  const lastAssistant = [...messages].reverse().find(m => m.role === "assistant")

  /* ─── Render ────────────────────────────────────────────────────── */
  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* ── Minimal top bar ──────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 z-10">
        <div className="flex items-center gap-2 min-w-0">
          {messages.length > 0 && (
            <button onClick={clearConversation} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="New conversation">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mailboxList.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowMailboxMenu(v => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Inbox className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[100px] truncate">
                  {selectedMailbox === "all" ? `All (${mailboxList.length})` : mailboxList.find(m => m.id === selectedMailbox)?.name ?? "Mailbox"}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
              </button>
              {showMailboxMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMailboxMenu(false)} aria-hidden />
                  <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px] rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl py-1">
                    <button onClick={() => { setSelectedMailbox("all"); setShowMailboxMenu(false) }} className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors", selectedMailbox === "all" ? "text-primary font-medium" : "text-foreground hover:bg-muted/60")}>
                      <Inbox className="h-3.5 w-3.5 shrink-0" /> All Mailboxes
                    </button>
                    {mailboxList.map(mb => (
                      <button key={mb.id} onClick={() => { setSelectedMailbox(mb.id); setShowMailboxMenu(false) }} className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors", selectedMailbox === mb.id ? "text-primary font-medium" : "text-foreground hover:bg-muted/60")}>
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: mb.color || "#64748b" }} />
                        <span className="truncate">{mb.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main voice interface ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden relative">

        {/* Transcript / live text area — centered above orb */}
        <div className="w-full max-w-lg mb-8 min-h-[80px] flex flex-col items-center justify-end text-center gap-2">
          {state === "listening" && liveText && (
            <p className="text-lg text-foreground/80 font-light leading-relaxed animate-in fade-in-0 duration-200">
              &ldquo;{liveText}&rdquo;
            </p>
          )}
          {state === "listening" && !liveText && (
            <p className="text-sm text-muted-foreground/60 font-light">Listening...</p>
          )}
          {state === "transcribing" && (
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-light">Transcribing...</span>
            </div>
          )}
          {state === "thinking" && (
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-light">Thinking...</span>
            </div>
          )}
          {state === "speaking" && speakingText && (
            <p className="text-base text-foreground/70 font-light leading-relaxed max-w-md">
              {speakingText}
            </p>
          )}
          {state === "idle" && lastAssistant && messages.length > 1 && (
            <p className="text-sm text-muted-foreground/50 font-light line-clamp-2 max-w-sm">
              {lastAssistant.content}
            </p>
          )}
        </div>

        {/* ── Central Orb ──────────────────────────────────────── */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Ambient glow ring */}
          <div className={cn(
            "absolute rounded-full transition-all duration-700",
            state === "idle" ? "w-44 h-44 opacity-0" : "w-52 h-52 opacity-100",
            state === "listening" ? "bg-blue-500/[0.06]" :
            state === "speaking" ? "bg-emerald-500/[0.06]" :
            state === "thinking" ? "bg-amber-500/[0.04]" :
            state === "transcribing" ? "bg-amber-500/[0.05]" :
            state === "confirming" ? "bg-amber-500/[0.05]" : ""
          )} />

          {/* Waveform ring around orb */}
          <div className="absolute w-48 h-48 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
              {bars.map((v, i) => {
                const angle = (i / ORB_BARS) * Math.PI * 2
                const radius = 85
                const x = 100 + Math.cos(angle) * radius
                const y = 100 + Math.sin(angle) * radius
                const barHeight = state === "thinking" || state === "transcribing"
                  ? 4 + Math.sin(i * 0.5 + tick * 0.25) * 6
                  : state === "confirming"
                    ? 2 + Math.sin(i * 0.4 + tick * 0.15) * 4
                    : Math.max(1.5, v * 28)
                const x2 = 100 + Math.cos(angle) * (radius + barHeight)
                const y2 = 100 + Math.sin(angle) * (radius + barHeight)
                return (
                  <line
                    key={i} x1={x} y1={y} x2={x2} y2={y2}
                    className={cn(
                      "transition-all",
                      state === "listening" ? "stroke-blue-500/60 duration-75" :
                      state === "speaking" ? "stroke-emerald-500/50 duration-100" :
                      state === "thinking" || state === "transcribing" ? "stroke-amber-400/40 duration-150" :
                      state === "confirming" ? "stroke-amber-400/30 duration-200" :
                      "stroke-muted-foreground/10 duration-500"
                    )}
                    strokeWidth="2" strokeLinecap="round"
                  />
                )
              })}
            </svg>
          </div>

          {/* Orb button */}
          <button
            onClick={handleMicClick}
            disabled={state === "thinking" || state === "transcribing"}
            title={undefined}
            className={cn(
              "relative z-10 flex items-center justify-center rounded-full w-32 h-32",
              "bg-gradient-to-br transition-all duration-500 ease-out",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
              "disabled:pointer-events-none",
              stateColor, stateGlow,
              state === "idle" ? "shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer" :
              state === "listening" ? "shadow-2xl scale-105" :
              state === "speaking" ? "shadow-xl cursor-pointer" :
              state === "thinking" ? "shadow-md cursor-wait opacity-80" :
              state === "transcribing" ? "shadow-md cursor-wait opacity-80" :
              "shadow-xl cursor-pointer hover:scale-105"
            )}
          >
            <div className="absolute inset-0 rounded-full bg-white/10" />
            {state === "listening" ? (
              <div className="flex items-end gap-[3px] h-8">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="w-[3px] bg-white rounded-full animate-pulse" style={{
                    height: `${12 + Math.random() * 20}px`,
                    animationDelay: `${i * 120}ms`,
                    animationDuration: "600ms",
                  }} />
                ))}
              </div>
            ) : state === "speaking" ? (
              <Volume2 className="h-10 w-10 text-white drop-shadow-sm" />
            ) : state === "thinking" || state === "transcribing" ? (
              <Loader2 className="h-10 w-10 text-white/90 animate-spin" />
            ) : (
              <Mic className="h-10 w-10 text-white drop-shadow-sm" />
            )}
          </button>
        </div>

        {/* State label */}
        <p className="text-xs text-muted-foreground/60 font-medium tracking-wide uppercase mb-2">
          {stateLabel}
        </p>

        {/* Stop / hints */}
        <div className="min-h-8 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(state === "listening" || state === "speaking" || state === "thinking" || state === "confirming" || state === "transcribing") && (
              <button type="button" onClick={cancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Square className="h-3 w-3 fill-current" /> Stop
              </button>
            )}
          </div>
          {state === "listening" && (
            <span className="text-[11px] text-muted-foreground/50 text-center">Speaking will auto-submit — or tap Stop</span>
          )}
          {state === "idle" && (
            <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1.5">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted/80 border border-border/50 text-[10px] font-mono">Space</kbd> to talk
            </span>
          )}
          {state === "confirming" && (
            <span className="text-[11px] text-muted-foreground/60">Say &ldquo;yes&rdquo; or &ldquo;no&rdquo;</span>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500/80 text-center mt-2 max-w-xs">{error}</p>
        )}
      </main>

      {/* ── Bottom panel: actions + suggestions ──────────────────── */}
      <div className="shrink-0 max-h-[40%] overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 pb-4 space-y-3">

          {/* Pending / executed / rejected actions */}
          {pendingActions.length > 0 && (
            <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-300">
              {pendingActions.some(a => !a.status || a.status === "awaiting_approval") && (
                <p className="text-[11px] text-amber-500/80 font-medium uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Actions
                </p>
              )}
              {pendingActions.map(action => (
                <VoiceActionCard
                  key={action.id}
                  action={action}
                  isExecuting={executingId === action.id}
                  onApprove={executeAction}
                  onReject={rejectAction}
                />
              ))}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && messages.length <= 1 && state === "idle" && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground/50 font-medium uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> Suggestions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 4).map(s => (
                  <button key={s.id} onClick={() => handleSuggestionClick(s)} className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    "border hover:shadow-sm active:scale-95",
                    s.urgency === "high"
                      ? "border-red-400/25 bg-red-500/5 text-red-500/80 hover:bg-red-500/10"
                      : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}>
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={scrollAnchorRef} className="h-1 shrink-0" aria-hidden />
        </div>
      </div>
    </div>
  )
}
