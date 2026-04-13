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
const ORB_BARS = 64
const SILENCE_TIMEOUT_MS = 1800
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

let msgIdCounter = 0
function nextMsgId(): string {
  return `msg-${++msgIdCounter}-${Date.now()}`
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export function AiAgent() {
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0] ?? "there"

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

  const greetedRef = useRef(false)
  const firstNameRef = useRef(firstName)
  firstNameRef.current = firstName
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
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastSpeechTimeRef = useRef<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const useWhisperFallbackRef = useRef(false)

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
    setTimeout(() => startListeningRef.current(), 300)
  }, [])

  /* ── Typewriter ─────────────────────────────────────────────────── */
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
    }, 140)
  }, [])

  const stopTypewriter = useCallback(() => {
    if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null }
    setSpeakingText("")
  }, [])

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
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / binCount
        if (avg > VOLUME_SILENCE_THRESHOLD) {
          lastSpeechTimeRef.current = Date.now()
        } else if (
          recognizedTextRef.current.trim() &&
          lastSpeechTimeRef.current > 0 &&
          Date.now() - lastSpeechTimeRef.current > SILENCE_TIMEOUT_MS
        ) {
          recognitionRef.current?.stop()
        }
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
    try {
      const res = await agentApi.speak(text.slice(0, 500))
      if (gen !== ttsGenerationRef.current) return
      if (!res?.audio) throw new Error("No audio data")
      const bytes = Uint8Array.from(atob(res.audio), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: "audio/mp3" })
      const url = URL.createObjectURL(blob)
      ttsBlobUrlRef.current = url
      const el = new Audio(url)
      audioRef.current = el
      await new Promise<void>((resolve) => {
        let settled = false
        const finish = () => {
          if (settled) return; settled = true
          ttsPlaybackResolveRef.current = null
          if (ttsBlobUrlRef.current === url) { try { URL.revokeObjectURL(url) } catch { /* ignore */ } ttsBlobUrlRef.current = null }
          el.onended = null; el.onerror = null; resolve()
        }
        ttsPlaybackResolveRef.current = resolve
        el.onended = () => finish(); el.onerror = () => finish()
        el.onplay = () => { if (gen === ttsGenerationRef.current) startTypewriter(text) }
        void el.play().catch(() => finish())
      })
      if (gen !== ttsGenerationRef.current) return
    } catch {
      if (gen !== ttsGenerationRef.current) return
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 300))
        utterance.rate = 1.05
        await new Promise<void>((resolve) => {
          let settled = false
          const finish = () => { if (settled) return; settled = true; ttsPlaybackResolveRef.current = null; resolve() }
          ttsPlaybackResolveRef.current = resolve
          utterance.onstart = () => { if (gen === ttsGenerationRef.current) startTypewriter(text) }
          utterance.onend = () => finish(); utterance.onerror = () => finish()
          window.speechSynthesis.speak(utterance)
        })
      }
      if (gen !== ttsGenerationRef.current) return
    } finally {
      stopTypewriter()
    }
  }, [startTypewriter, stopTypewriter])

  /* ── Execute / reject actions ───────────────────────────────────── */
  const executeAction = useCallback(async (action: AgentActionApi) => {
    const runGen = ttsGenerationRef.current
    setExecutingId(action.id)
    try {
      await agentApi.execute(action)
      setPendingActions(prev => prev.filter(a => a.id !== action.id))
      pendingActionsRef.current = pendingActionsRef.current.filter(a => a.id !== action.id)
      setState("speaking")
      const doneMsg = `Done, ${action.label} has been executed.`
      addMessage("assistant", doneMsg)
      await speak(doneMsg)
      if (runGen !== ttsGenerationRef.current) return
      if (pendingActionsRef.current.length === 0) { setState("idle"); resumeListening() }
      else setState("confirming")
    } catch {
      setState("speaking")
      const errMsg = "Sorry, I couldn't complete that action."
      addMessage("assistant", errMsg)
      await speak(errMsg)
      if (runGen !== ttsGenerationRef.current) return
      setState("confirming")
    } finally { setExecutingId(null) }
  }, [speak, addMessage, resumeListening])

  const rejectAction = useCallback(async (action: AgentActionApi) => {
    try { await agentApi.reject(action.id) } catch { /* ignore */ }
    setPendingActions(prev => prev.filter(a => a.id !== action.id))
    pendingActionsRef.current = pendingActionsRef.current.filter(a => a.id !== action.id)
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
      const runGen = ttsGenerationRef.current
      for (const action of [...pendingActionsRef.current]) await rejectAction(action)
      setState("speaking")
      addMessage("assistant", "Alright, cancelled.")
      await speak("Alright, cancelled.")
      if (runGen !== ttsGenerationRef.current) return
      setState("idle"); resumeListening()
    } else {
      addMessage("user", text)
      historyRef.current.push({ role: "user", content: text })
      sendingRef.current = true
      const runGen = ttsGenerationRef.current
      setState("thinking"); scrollToLatest()
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
        setState("speaking"); await speak(reply)
        if (runGen !== ttsGenerationRef.current) return
        if (pendingActionsRef.current.length > 0) { setState("confirming"); resumeListening() }
        else { setState("idle"); resumeListening() }
      } catch {
        addMessage("assistant", "Something went wrong, try again.")
        setState("speaking"); await speak("Something went wrong, try again.")
        if (runGen !== ttsGenerationRef.current) return
        if (pendingActionsRef.current.length > 0) { setState("confirming"); resumeListening() }
        else { setState("idle"); resumeListening() }
      } finally { sendingRef.current = false }
    }
  }, [executeAction, rejectAction, speak, addMessage, scrollToLatest, resumeListening])

  const handleVoiceConfirmationRef = useRef(handleVoiceConfirmation)
  handleVoiceConfirmationRef.current = handleVoiceConfirmation

  /* ── Send to agent ──────────────────────────────────────────────── */
  const sendToAgent = useCallback(async (text: string) => {
    if (!text.trim() || sendingRef.current) return
    if (pendingActionsRef.current.length > 0) { await handleVoiceConfirmationRef.current(text); return }
    sendingRef.current = true
    setLiveText(""); setState("thinking")
    const runGen = ttsGenerationRef.current
    addMessage("user", text.trim())
    historyRef.current.push({ role: "user", content: text.trim() })
    scrollToLatest()
    try {
      const recent = historyRef.current.slice(-10)
      const mbId = selectedMailboxRef.current === "all" ? undefined : selectedMailboxRef.current
      const res = await agentApi.chat(text.trim(), recent, mbId)
      const reply = res.content || "I didn't catch that, could you try again?"
      historyRef.current.push({ role: "assistant", content: reply })
      const actions = res.actions?.filter(a => a.requires_approval) ?? []
      if (actions.length > 0) { pendingActionsRef.current = actions; setPendingActions(actions) }
      addMessage("assistant", reply, actions.length > 0 ? actions : undefined)
      setState("speaking"); await speak(reply)
      if (runGen !== ttsGenerationRef.current) return
      if (actions.length > 0) {
        setState("speaking")
        const summary = actions.map(a => a.label).join(", ")
        await speak(`I need your confirmation to ${summary}. Say yes or no.`)
        if (runGen !== ttsGenerationRef.current) return
        setState("confirming"); resumeListening()
      } else { setState("idle"); resumeListening() }
    } catch {
      addMessage("assistant", "I couldn't process that, please try again.")
      setState("speaking"); await speak("I couldn't process that, please try again.")
      if (runGen !== ttsGenerationRef.current) return
      setState("idle"); resumeListening()
    } finally { sendingRef.current = false }
  }, [speak, addMessage, scrollToLatest, resumeListening])

  /* ── MediaRecorder fallback (Whisper STT) for non-Chrome browsers ── */
  const stopMediaRecorder = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== "inactive") mr.stop()
    mediaRecorderRef.current = null
  }, [])

  const startMediaRecorderFallback = useCallback(async () => {
    setError(""); setLiveText("Recording..."); lastSpeechTimeRef.current = Date.now()
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
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        stopAudioVisualization()
        const chunks = recordedChunksRef.current
        if (chunks.length === 0) {
          if (pendingActionsRef.current.length > 0) setState("confirming"); else setState("idle")
          setLiveText("")
          return
        }
        const audioBlob = new Blob(chunks, { type: mr.mimeType || "audio/webm" })
        setLiveText("Transcribing..."); setState("thinking")
        try {
          const result = await agentApi.transcribe(audioBlob)
          const text = normalizeSpeechText(result.text || "")
          setLiveText("")
          if (text.trim()) sendToAgent(text)
          else {
            if (pendingActionsRef.current.length > 0) setState("confirming"); else setState("idle")
          }
        } catch {
          setError("Transcription failed. Please try again.")
          if (pendingActionsRef.current.length > 0) setState("confirming"); else setState("idle")
          setLiveText("")
        }
      }
      mr.start(250)
      setState("listening"); startAudioVisualization()

      const checkSilence = () => {
        if (!analyserRef.current || !mediaRecorderRef.current) return
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length
        if (avg > VOLUME_SILENCE_THRESHOLD) lastSpeechTimeRef.current = Date.now()
        else if (lastSpeechTimeRef.current > 0 && Date.now() - lastSpeechTimeRef.current > SILENCE_TIMEOUT_MS + 500) {
          stopMediaRecorder()
          return
        }
        if (mediaRecorderRef.current?.state === "recording") requestAnimationFrame(checkSilence)
      }
      setTimeout(checkSilence, 500)
    } catch {
      setError("Microphone access denied. Please allow mic permissions.")
      if (pendingActionsRef.current.length > 0) setState("confirming"); else setState("idle")
    }
  }, [sendToAgent, startAudioVisualization, stopAudioVisualization, stopMediaRecorder])

  /* ── Speech Recognition ─────────────────────────────────────────── */
  const startListening = useCallback(() => {
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
      setLiveText(normalized); recognizedTextRef.current = normalized; lastSpeechTimeRef.current = Date.now()
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (normalized.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current && recognizedTextRef.current.trim()) recognitionRef.current.stop()
        }, SILENCE_TIMEOUT_MS)
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
      if (captured) sendToAgent(normalizeSpeechText(captured))
      else if (pendingActionsRef.current.length > 0) setState("confirming")
      else setState("idle")
    }
    recognitionRef.current = recognition; recognition.start()
    setState("listening"); setLiveText(""); startAudioVisualization()
  }, [sendToAgent, startAudioVisualization, stopAudioVisualization, startMediaRecorderFallback])

  startListeningRef.current = startListening

  /* ── Init ───────────────────────────────────────────────────────── */
  useEffect(() => {
    mailboxesApi.list().then(setMailboxList).catch(() => {})
    agentApi.suggestions().then(setSuggestions).catch(() => {})
  }, [])

  useEffect(() => {
    if (greetedRef.current) return
    greetedRef.current = true
    const greeting = `Hey ${firstNameRef.current}! How can I help with your emails?`
    const doGreet = async () => {
      const gen = ttsGenerationRef.current
      setState("speaking"); addMessage("assistant", greeting)
      try {
        const res = await agentApi.speak(greeting.slice(0, 500))
        if (gen !== ttsGenerationRef.current) return
        if (!res?.audio) throw new Error("No audio")
        const bytes = Uint8Array.from(atob(res.audio), (c) => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: "audio/mp3" })
        const url = URL.createObjectURL(blob)
        ttsBlobUrlRef.current = url
        const el = new Audio(url)
        audioRef.current = el
        await new Promise<void>((resolve) => {
          let settled = false
          const finish = () => {
            if (settled) return; settled = true; ttsPlaybackResolveRef.current = null
            if (ttsBlobUrlRef.current === url) { try { URL.revokeObjectURL(url) } catch { /* */ } ttsBlobUrlRef.current = null }
            el.onended = null; el.onerror = null; stopTypewriter(); resolve()
          }
          ttsPlaybackResolveRef.current = resolve
          el.onended = () => finish(); el.onerror = () => finish()
          el.onplay = () => { if (gen === ttsGenerationRef.current) startTypewriter(greeting) }
          void el.play().catch(() => finish())
        })
        if (gen !== ttsGenerationRef.current) return
      } catch {
        if (gen !== ttsGenerationRef.current) return
        if ("speechSynthesis" in window) {
          const u = new SpeechSynthesisUtterance(greeting); u.rate = 1.05
          await new Promise<void>((resolve) => {
            let settled = false
            const finish = () => { if (settled) return; settled = true; ttsPlaybackResolveRef.current = null; stopTypewriter(); resolve() }
            ttsPlaybackResolveRef.current = resolve
            u.onstart = () => { if (gen === ttsGenerationRef.current) startTypewriter(greeting) }
            u.onend = () => finish(); u.onerror = () => finish()
            window.speechSynthesis.speak(u)
          })
        }
      }
      if (gen !== ttsGenerationRef.current) return
      setState("idle"); setTimeout(() => startListeningRef.current(), 400)
    }
    const timer = setTimeout(doGreet, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Cancel ─────────────────────────────────────────────────────── */
  const cancel = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    recognizedTextRef.current = ""; sendingRef.current = false
    recognitionRef.current?.stop(); recognitionRef.current = null
    stopMediaRecorder()
    haltTtsPlayback(); stopTypewriter(); stopAudioVisualization()
    setLiveText(""); setState("idle")
  }, [haltTtsPlayback, stopTypewriter, stopAudioVisualization, stopMediaRecorder])

  const handleMicClick = useCallback(() => {
    if (state === "listening") {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      recognitionRef.current?.stop()
      stopMediaRecorder()
    }
    else if (state === "idle" || state === "confirming") startListening()
    else if (state === "speaking") cancel()
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
    sendToAgent(s.type === "chat" ? s.description : `${s.title}: ${s.description}`)
  }, [sendToAgent])

  const clearConversation = useCallback(() => {
    setMessages([]); historyRef.current = []; setPendingActions([]); pendingActionsRef.current = []; setState("idle")
  }, [])

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
    if (state !== "listening") setBars(Array(ORB_BARS).fill(0))
  }, [state])

  useEffect(() => {
    if (state !== "thinking" && state !== "confirming") return
    const interval = setInterval(() => setTick(t => t + 1), 60)
    return () => clearInterval(interval)
  }, [state])

  /* ─── Derived ────────────────────────────────────────────────────── */
  const stateColor =
    state === "listening" ? "from-blue-500 to-cyan-400" :
    state === "speaking" ? "from-emerald-400 to-teal-500" :
    state === "thinking" ? "from-amber-400 to-orange-500" :
    state === "confirming" ? "from-amber-400 to-yellow-500" :
    "from-zinc-400/60 to-zinc-500/60 dark:from-zinc-500/40 dark:to-zinc-600/40"

  const stateGlow =
    state === "listening" ? "shadow-blue-500/25" :
    state === "speaking" ? "shadow-emerald-500/25" :
    state === "thinking" ? "shadow-amber-500/20" :
    state === "confirming" ? "shadow-amber-500/20" :
    "shadow-transparent"

  const stateLabel =
    state === "idle" ? "Tap to speak" :
    state === "listening" ? "Listening..." :
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
        <div className="w-full max-w-lg mb-8 min-h-[80px] flex flex-col items-center justify-end text-center">
          {state === "listening" && liveText && (
            <p className="text-lg text-foreground/80 font-light leading-relaxed animate-in fade-in-0 duration-200">
              &ldquo;{liveText}&rdquo;
            </p>
          )}
          {state === "listening" && !liveText && (
            <p className="text-sm text-muted-foreground/60 font-light">Listening...</p>
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
                const barHeight = state === "thinking"
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
                      state === "thinking" ? "stroke-amber-400/40 duration-150" :
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
            disabled={state === "thinking"}
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
            ) : state === "thinking" ? (
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

        {/* Stop / Keyboard hint */}
        <div className="h-8 flex items-center">
          {state === "speaking" && (
            <button onClick={cancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Square className="h-3 w-3 fill-current" /> Stop
            </button>
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

          {/* Pending actions */}
          {pendingActions.length > 0 && (state === "confirming" || state === "listening" || state === "idle") && (
            <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-300">
              <p className="text-[11px] text-amber-500/80 font-medium uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Pending
              </p>
              {pendingActions.map(action => {
                const Icon = ACTION_ICONS[action.type] || Mail
                return (
                  <div key={action.id} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm px-4 py-3 transition-all hover:border-border/60">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                      <Icon className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{action.label}</p>
                      {action.description && <p className="text-xs text-muted-foreground/60 truncate">{action.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => executeAction(action)} disabled={executingId === action.id} className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all disabled:opacity-50" title="Confirm">
                        {executingId === action.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => rejectAction(action)} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all" title="Reject">
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
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
