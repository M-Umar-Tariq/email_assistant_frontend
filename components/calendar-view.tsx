"use client"

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import {
  Loader2,
  Mail,
  Pencil,
  Trash2,
  AlertTriangle,
  Sparkles,
  Send,
} from "lucide-react"
import { toast } from "sonner"
import {
  calendar as calendarApi,
  mailboxes as mailboxesApi,
  compose,
  emails as emailsApi,
  type CalendarMeeting,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { mapMailboxApi } from "@/lib/mappers"
import type { Mailbox } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar as DayPicker } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ViewMode = "month" | "week" | "day"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseAttendeeEmails(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[,;]/)) {
    const e = part.trim()
    if (e && EMAIL_RE.test(e) && !seen.has(e.toLowerCase())) {
      seen.add(e.toLowerCase())
      out.push(e)
    }
  }
  return out
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6am–10pm

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

function meetingOverlapTitles(m: CalendarMeeting, others: CalendarMeeting[]): string[] {
  const s = parseISO(m.start)
  const e = parseISO(m.end)
  return others
    .filter((o) => o.id !== m.id)
    .filter((o) => overlaps(s, e, parseISO(o.start), parseISO(o.end)))
    .map((o) => o.title)
}

/** On the calendar cell that is "today", hide meetings once their end time has passed. */
function isMeetingEndedOnTodayCell(meeting: CalendarMeeting, cellDay: Date, now: Date): boolean {
  if (!isSameDay(cellDay, now)) return false
  try {
    return parseISO(meeting.end).getTime() <= now.getTime()
  } catch {
    return false
  }
}

/** Meeting is currently happening (start ≤ now < end) on today's cell only. */
function isMeetingInProgressOnCell(meeting: CalendarMeeting, cellDay: Date, now: Date): boolean {
  if (!isSameDay(cellDay, now)) return false
  try {
    const s = parseISO(meeting.start).getTime()
    const e = parseISO(meeting.end).getTime()
    const t = now.getTime()
    return s <= t && t < e
  } catch {
    return false
  }
}

export function CalendarView() {
  const { user } = useAuth()
  const [view, setView] = useState<ViewMode>("month")
  const [anchor, setAnchor] = useState(() => new Date())
  const [mailboxFilter, setMailboxFilter] = useState<string>("all")
  const [mailboxNameById, setMailboxNameById] = useState<Record<string, string>>({})
  const [mailboxList, setMailboxList] = useState<Mailbox[]>([])
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeeting, setSelectedMeeting] = useState<CalendarMeeting | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState("")
  const [formDate, setFormDate] = useState<Date | undefined>(new Date())
  const [formStart, setFormStart] = useState("09:00")
  const [formEnd, setFormEnd] = useState("10:00")
  const [formLocation, setFormLocation] = useState("")
  const [formMeetingLink, setFormMeetingLink] = useState("")
  const [formAttendees, setFormAttendees] = useState("")
  /** Which connected mailbox owns this meeting (required for new manual events). */
  const [formMailboxId, setFormMailboxId] = useState("")
  const [saving, setSaving] = useState(false)

  /** AI meeting invite: send after create */
  const [sendInviteEmail, setSendInviteEmail] = useState(false)
  const [inviteSelection, setInviteSelection] = useState<Record<string, boolean>>({})
  const [sendFromMailboxId, setSendFromMailboxId] = useState("")
  const [inviteTone, setInviteTone] = useState<"formal" | "friendly">("formal")
  const [sendingInvite, setSendingInvite] = useState(false)
  /** Review before send */
  const [invitePreviewOpen, setInvitePreviewOpen] = useState(false)
  const [inviteDraftLoading, setInviteDraftLoading] = useState(false)
  const [invitePreviewSubject, setInvitePreviewSubject] = useState("")
  const [invitePreviewBody, setInvitePreviewBody] = useState("")
  const [invitePreviewTo, setInvitePreviewTo] = useState<string[]>([])
  const [invitePreviewMailboxId, setInvitePreviewMailboxId] = useState("")

  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false)
  /** Bumps on an interval so the calendar can hide ended meetings and highlight live ones. */
  const [nowTick, setNowTick] = useState(0)
  const [pendingCreateBody, setPendingCreateBody] = useState<{
    title: string
    start: string
    end: string
    location?: string
    meeting_link?: string
    attendees?: string[]
    mailbox_id?: string
  } | null>(null)
  const [overlapTitles, setOverlapTitles] = useState<string[]>([])

  const range = useMemo(() => {
    if (view === "month") {
      const ms = startOfMonth(anchor)
      const me = endOfMonth(anchor)
      return {
        start: startOfWeek(ms, { weekStartsOn: 0 }),
        end: endOfWeek(me, { weekStartsOn: 0 }),
      }
    }
    if (view === "week") {
      return {
        start: startOfWeek(anchor, { weekStartsOn: 0 }),
        end: endOfWeek(anchor, { weekStartsOn: 0 }),
      }
    }
    const d = startOfDay(anchor)
    return { start: d, end: addDays(d, 1) }
  }, [anchor, view])

  const parsedInviteEmails = useMemo(() => parseAttendeeEmails(formAttendees), [formAttendees])

  useEffect(() => {
    setInviteSelection((prev) => {
      const next: Record<string, boolean> = {}
      for (const e of parsedInviteEmails) {
        next[e] = prev[e] !== false
      }
      return next
    })
  }, [parsedInviteEmails])

  const resolveSendMailboxId = useCallback(() => {
    if (mailboxFilter !== "all") return mailboxFilter
    if (sendFromMailboxId) return sendFromMailboxId
    if (formMailboxId.trim()) return formMailboxId.trim()
    return mailboxList[0]?.id ?? ""
  }, [mailboxFilter, sendFromMailboxId, formMailboxId, mailboxList])

  const openMeetingInvitePreview = useCallback(
    async (params: {
      title: string
      start: string
      end: string
      location?: string
      meeting_link?: string
      to: string[]
    }) => {
      const mbId = resolveSendMailboxId()
      if (!mbId) {
        toast.error("Select a mailbox to send from (connect an account in Mailboxes first).")
        return
      }
      if (params.to.length === 0) return

      const subject = `Meeting: ${params.title}`
      setInvitePreviewTo(params.to)
      setInvitePreviewMailboxId(mbId)
      setInvitePreviewSubject(subject)
      setInvitePreviewBody("")
      setInvitePreviewOpen(true)
      setInviteDraftLoading(true)
      try {
        const startStr = format(parseISO(params.start), "PPpp")
        const endStr = format(parseISO(params.end), "PPpp")
        let context =
          `Write a meeting invitation email. Meeting title: ${params.title}. ` +
          `Start: ${startStr}. End: ${endStr}.`
        if (params.location) context += ` Location: ${params.location}.`
        if (params.meeting_link) {
          context += ` Include this join link clearly in the email (as a clickable URL line): ${params.meeting_link}`
        }
        context +=
          " Invite recipients to attend; ask for RSVP or a reply if they cannot make it. Keep the body concise."

        const { draft } = await compose.generate({
          to: params.to.join(", "),
          subject,
          context,
          tone: inviteTone,
          sender_name: user?.name?.trim() || "Me",
        })
        setInvitePreviewBody(draft)
      } catch (e) {
        toast.error((e as Error).message || "Could not generate invite draft")
        setInvitePreviewOpen(false)
      } finally {
        setInviteDraftLoading(false)
      }
    },
    [inviteTone, resolveSendMailboxId, user?.name]
  )

  const handleConfirmSendInvite = useCallback(async () => {
    const sub = invitePreviewSubject.trim()
    const body = invitePreviewBody.trim()
    if (!sub || !body) {
      toast.error("Subject and message body cannot be empty")
      return
    }
    if (!invitePreviewMailboxId || invitePreviewTo.length === 0) {
      toast.error("Missing mailbox or recipients")
      return
    }
    setSendingInvite(true)
    try {
      await emailsApi.send({
        mailbox_id: invitePreviewMailboxId,
        to: invitePreviewTo,
        subject: sub,
        body,
      })
      toast.success(`Invite sent to ${invitePreviewTo.length} recipient(s)`)
      setInvitePreviewOpen(false)
    } catch (e) {
      toast.error((e as Error).message || "Send failed")
    } finally {
      setSendingInvite(false)
    }
  }, [invitePreviewSubject, invitePreviewBody, invitePreviewMailboxId, invitePreviewTo])

  const refreshMailboxNames = useCallback(() => {
    mailboxesApi
      .list()
      .then((list) => {
        const mapped = list.map(mapMailboxApi)
        setMailboxList(mapped)
        const m: Record<string, string> = {}
        for (const x of mapped) {
          m[x.id] = x.name?.trim() || x.email || x.id
        }
        setMailboxNameById(m)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshMailboxNames()
  }, [refreshMailboxNames])

  const now = useMemo(() => new Date(), [nowTick])
  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 15_000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    const bump = () => setNowTick((n) => n + 1)
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") bump()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  useEffect(() => {
    const onMb = () => refreshMailboxNames()
    window.addEventListener("mailbox:updated", onMb)
    return () => window.removeEventListener("mailbox:updated", onMb)
  }, [refreshMailboxNames])

  useEffect(() => {
    const onSet = (e: Event) => {
      const id = (e as CustomEvent<{ mailboxId?: string }>).detail?.mailboxId
      if (id === "all" || (typeof id === "string" && id.length > 0)) {
        setMailboxFilter(id)
      }
    }
    window.addEventListener("calendar:setMailboxFilter", onSet as EventListener)
    return () => window.removeEventListener("calendar:setMailboxFilter", onSet)
  }, [])

  const loadMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await calendarApi.list({
        start_date: range.start.toISOString(),
        end_date: range.end.toISOString(),
        mailbox_id: mailboxFilter,
      })
      setMeetings(res.meetings ?? [])
    } catch (e) {
      toast.error((e as Error).message || "Failed to load calendar")
      setMeetings([])
    } finally {
      setLoading(false)
    }
  }, [range.start, range.end, mailboxFilter])

  useEffect(() => {
    loadMeetings()
  }, [loadMeetings])

  useEffect(() => {
    const onUpdated = () => loadMeetings()
    window.addEventListener("calendar:updated", onUpdated)
    return () => window.removeEventListener("calendar:updated", onUpdated)
  }, [loadMeetings])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id
      if (!id) return
      const m = meetings.find((x) => x.id === id)
      if (m) {
        setSelectedMeeting(m)
        setDetailOpen(true)
        try {
          setAnchor(parseISO(m.start))
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener("calendar:openMeeting", onOpen as EventListener)
    return () => window.removeEventListener("calendar:openMeeting", onOpen as EventListener)
  }, [meetings])

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, CalendarMeeting[]>()
    for (const m of meetings) {
      try {
        const d = format(parseISO(m.start), "yyyy-MM-dd")
        if (!map.has(d)) map.set(d, [])
        map.get(d)!.push(m)
      } catch {
        /* skip */
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime())
    }
    return map
  }, [meetings])

  const openCreate = useCallback((day?: Date) => {
    setEditingId(null)
    setFormTitle("")
    setFormDate(day ?? anchor)
    setFormStart("09:00")
    setFormEnd("10:00")
    setFormLocation("")
    setFormMeetingLink("")
    setFormAttendees("")
    setFormMailboxId(mailboxFilter !== "all" ? mailboxFilter : "")
    setSendInviteEmail(false)
    setInviteSelection({})
    setSendFromMailboxId(mailboxFilter !== "all" ? mailboxFilter : "")
    setFormOpen(true)
  }, [anchor, mailboxFilter])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("calendar:viewChanged", { detail: { view } }))
  }, [view])

  useEffect(() => {
    const onOpenCreate = () => openCreate()
    const onSetView = (e: Event) => {
      const v = (e as CustomEvent<{ view?: ViewMode }>).detail?.view
      if (v === "month" || v === "week" || v === "day") setView(v)
    }
    const onReload = () => {
      void loadMeetings()
    }
    window.addEventListener("calendar:openCreate", onOpenCreate)
    window.addEventListener("calendar:setView", onSetView as EventListener)
    window.addEventListener("calendar:reload", onReload)
    return () => {
      window.removeEventListener("calendar:openCreate", onOpenCreate)
      window.removeEventListener("calendar:setView", onSetView as EventListener)
      window.removeEventListener("calendar:reload", onReload)
    }
  }, [openCreate, loadMeetings])

  useEffect(() => {
    const onToday = () => setAnchor(new Date())
    const onPrev = () => {
      if (view === "month") setAnchor(subMonths(anchor, 1))
      else if (view === "week") setAnchor(addDays(anchor, -7))
      else setAnchor(addDays(anchor, -1))
    }
    const onNext = () => {
      if (view === "month") setAnchor(addMonths(anchor, 1))
      else if (view === "week") setAnchor(addDays(anchor, 7))
      else setAnchor(addDays(anchor, 1))
    }
    window.addEventListener("calendar:goToday", onToday)
    window.addEventListener("calendar:goPrev", onPrev)
    window.addEventListener("calendar:goNext", onNext)
    return () => {
      window.removeEventListener("calendar:goToday", onToday)
      window.removeEventListener("calendar:goPrev", onPrev)
      window.removeEventListener("calendar:goNext", onNext)
    }
  }, [view, anchor])

  const openEdit = (m: CalendarMeeting) => {
    setEditingId(m.id)
    setSendInviteEmail(false)
    setFormTitle(m.title)
    try {
      const s = parseISO(m.start)
      setFormDate(s)
      setFormStart(format(s, "HH:mm"))
      setFormEnd(format(parseISO(m.end), "HH:mm"))
    } catch {
      setFormDate(new Date())
    }
    setFormLocation(m.location ?? "")
    setFormMeetingLink(m.meeting_link ?? "")
    setFormAttendees((m.attendees ?? []).join(", "))
    setFormMailboxId(m.mailbox_id?.trim() ?? "")
    setFormOpen(true)
    setDetailOpen(false)
  }

  const buildIsoRange = () => {
    if (!formDate) return null
    const [sh, sm] = formStart.split(":").map(Number)
    const [eh, em] = formEnd.split(":").map(Number)
    const start = new Date(formDate)
    start.setHours(sh || 0, sm || 0, 0, 0)
    const end = new Date(formDate)
    end.setHours(eh || 0, em || 0, 0, 0)
    if (end <= start) end.setTime(start.getTime() + 60 * 60 * 1000)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  const submitForm = async () => {
    const times = buildIsoRange()
    if (!times) {
      toast.error("Pick a date and valid times")
      return
    }
    if (!editingId && mailboxList.length === 0) {
      toast.error("Connect at least one mailbox (Mailboxes) before creating a meeting.")
      return
    }
    const mbForMeeting = formMailboxId.trim()
    if (!mbForMeeting) {
      toast.error("Select which mailbox this meeting belongs to.")
      return
    }
    const attendees = formAttendees
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const body = {
      title: formTitle.trim() || "Meeting",
      start: times.start,
      end: times.end,
      location: formLocation.trim() || undefined,
      meeting_link: formMeetingLink.trim() || undefined,
      attendees: attendees.length ? attendees : undefined,
      mailbox_id: mbForMeeting,
    }

    if (!editingId && sendInviteEmail) {
      const emails = parseAttendeeEmails(formAttendees)
      const selected = emails.filter((e) => inviteSelection[e] !== false)
      if (emails.length === 0) {
        toast.error("Add attendee email addresses (e.g. name@company.com) to send an AI invite")
        return
      }
      if (selected.length === 0) {
        toast.error("Select at least one recipient for the invite")
        return
      }
      if (!resolveSendMailboxId()) {
        toast.error("Choose which mailbox to send from")
        return
      }
    }

    if (editingId) {
      setSaving(true)
      try {
        await calendarApi.update(editingId, {
          title: body.title,
          start: body.start,
          end: body.end,
          location: body.location,
          meeting_link: body.meeting_link,
          attendees: body.attendees,
          mailbox_id: mbForMeeting,
        })
        toast.success("Meeting updated")
        setFormOpen(false)
        window.dispatchEvent(new CustomEvent("calendar:updated"))
      } catch (e) {
        toast.error((e as Error).message || "Update failed")
      } finally {
        setSaving(false)
      }
      return
    }

    const s = parseISO(body.start)
    const e = parseISO(body.end)
    const titles: string[] = []
    for (const m of meetings) {
      if (overlaps(s, e, parseISO(m.start), parseISO(m.end))) {
        titles.push(m.title)
      }
    }
    if (titles.length > 0) {
      setPendingCreateBody(body)
      setOverlapTitles(titles)
      setOverlapDialogOpen(true)
      return
    }

    setSaving(true)
    try {
      const res = await calendarApi.create(body)
      if (res.has_overlap) {
        toast.warning(`Saved with conflicts: ${res.overlapping_titles.join(", ")}`)
      } else {
        toast.success("Event added to calendar")
      }
      setFormOpen(false)
      window.dispatchEvent(new CustomEvent("calendar:updated"))
      if (sendInviteEmail) {
        const to = parseAttendeeEmails(formAttendees).filter((e) => inviteSelection[e] !== false)
        if (to.length > 0) {
          void openMeetingInvitePreview({
            title: body.title,
            start: body.start,
            end: body.end,
            location: body.location,
            meeting_link: body.meeting_link,
            to,
          })
        }
      }
    } catch (err) {
      toast.error((err as Error).message || "Create failed")
    } finally {
      setSaving(false)
    }
  }

  const confirmOverlapCreate = async () => {
    if (!pendingCreateBody) return
    setSaving(true)
    try {
      const res = await calendarApi.create(pendingCreateBody)
      if (res.has_overlap) {
        toast.warning(`Overlaps with: ${res.overlapping_titles.join(", ")}`)
      } else {
        toast.success("Event added to calendar")
      }
      setFormOpen(false)
      setOverlapDialogOpen(false)
      setPendingCreateBody(null)
      window.dispatchEvent(new CustomEvent("calendar:updated"))
      if (sendInviteEmail) {
        const to = parseAttendeeEmails(formAttendees).filter((e) => inviteSelection[e] !== false)
        if (to.length > 0) {
          void openMeetingInvitePreview({
            title: pendingCreateBody.title,
            start: pendingCreateBody.start,
            end: pendingCreateBody.end,
            location: pendingCreateBody.location,
            meeting_link: pendingCreateBody.meeting_link,
            to,
          })
        }
      }
    } catch (e) {
      toast.error((e as Error).message || "Create failed")
    } finally {
      setSaving(false)
    }
  }

  const deleteMeeting = async (m: CalendarMeeting) => {
    try {
      await calendarApi.delete(m.id)
      toast.success("Meeting removed")
      setDetailOpen(false)
      setSelectedMeeting(null)
      window.dispatchEvent(new CustomEvent("calendar:updated"))
    } catch (e) {
      toast.error((e as Error).message || "Delete failed")
    }
  }

  const monthGridDays = useMemo(() => {
    const ms = startOfMonth(anchor)
    const me = endOfMonth(anchor)
    return eachDayOfInterval({
      start: startOfWeek(ms, { weekStartsOn: 0 }),
      end: endOfWeek(me, { weekStartsOn: 0 }),
    })
  }, [anchor])

  const weekDays = useMemo(() => {
    const ws = startOfWeek(anchor, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  }, [anchor])

  const headerLabel =
    view === "month"
      ? format(anchor, "MMMM yyyy")
      : view === "week"
        ? `Week of ${format(startOfWeek(anchor, { weekStartsOn: 0 }), "MMM d, yyyy")}`
        : format(anchor, "EEEE, MMM d, yyyy")

  const pxPerHour = 52

  function setHourMinute(d: Date, h: number, mi: number) {
    const x = new Date(d)
    x.setHours(h, mi, 0, 0)
    return x
  }

  const placeMeeting = (m: CalendarMeeting, dayStart: Date) => {
    try {
      const s = parseISO(m.start)
      const e = parseISO(m.end)
      const day0 = startOfDay(dayStart)
      const gridStart = setHourMinute(day0, HOURS[0], 0)
      const gridEnd = setHourMinute(day0, HOURS[HOURS.length - 1] + 1, 0)
      const total = gridEnd.getTime() - gridStart.getTime()
      const msStart = Math.max(0, s.getTime() - gridStart.getTime())
      const msEnd = Math.min(total, Math.max(msStart + 60_000, e.getTime() - gridStart.getTime()))
      const trackPx = HOURS.length * pxPerHour
      const top = (msStart / total) * trackPx
      const h = Math.max(22, ((msEnd - msStart) / total) * trackPx)
      return { top, height: h }
    } catch {
      return { top: 0, height: 24 }
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-background to-muted/[0.12]">
        <header className="relative flex min-h-[3.5rem] flex-col items-center justify-center border-b border-border/60 px-6 py-3.5 shrink-0 gap-0.5 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.04] via-transparent to-violet-500/[0.03]" />
          <div className="absolute top-0 right-0 h-44 w-44 rounded-full bg-primary/[0.05] blur-3xl -translate-y-1/2 translate-x-1/2" />
          <h1 className="relative text-base sm:text-lg font-extrabold text-foreground tracking-tight text-center">
            {headerLabel}
          </h1>
          {mailboxFilter !== "all" && (
            <p className="relative text-xs text-muted-foreground/80 text-center max-w-md font-medium">
              Mailbox:{" "}
              <span className="font-medium text-foreground/90">
                {mailboxNameById[mailboxFilter] ?? "Selected account"}
              </span>
            </p>
          )}
        </header>

        <div className="flex-1 min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/65 backdrop-blur-[1px]">
              <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/80 px-4 py-2 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Loading calendar...</span>
              </div>
            </div>
          )}

          {view === "month" && (
            <ScrollArea className="h-full">
              <div className="px-6 py-4 max-w-5xl mx-auto">
                <div className="grid grid-cols-7 gap-px text-center text-[11px] font-semibold text-muted-foreground mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px rounded-xl border border-border/70 overflow-hidden bg-border/60 shadow-sm">
                  {monthGridDays.map((day) => {
                    const key = format(day, "yyyy-MM-dd")
                    const dayMeetings = (meetingsByDay.get(key) ?? []).filter(
                      (m) => !isMeetingEndedOnTodayCell(m, day, now),
                    )
                    const inMonth = isSameMonth(day, anchor)
                    const isToday = isSameDay(day, new Date())
                    return (
                      <div
                        key={key}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setAnchor(day)
                          setView("day")
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setAnchor(day)
                            setView("day")
                          }
                        }}
                        className={cn(
                          "min-h-[92px] bg-card/80 p-1.5 text-left transition-all hover:bg-muted/40 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
                          !inMonth && "opacity-40",
                          isToday && "ring-1 ring-inset ring-primary/50 bg-primary/[0.03]",
                        )}
                      >
                        <span className={cn("text-xs font-semibold", isToday && "text-primary")}>{format(day, "d")}</span>
                        <div className="mt-1 flex flex-col gap-0.5">
                          {dayMeetings.slice(0, 3).map((m) => (
                            <MeetingPill
                              key={m.id}
                              meeting={m}
                              meetings={meetings}
                              compact
                              isLive={isMeetingInProgressOnCell(m, day, now)}
                              onOpen={() => {
                                setSelectedMeeting(m)
                                setDetailOpen(true)
                              }}
                            />
                          ))}
                          {dayMeetings.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{dayMeetings.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollArea>
          )}

          {view === "week" && (
            <ScrollArea className="h-full">
              <div className="flex min-w-[720px] px-6 py-4">
                <div className="w-12 shrink-0 pt-8 text-[10px] text-muted-foreground text-right pr-1 space-y-0" style={{ height: HOURS.length * pxPerHour + 32 }}>
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: pxPerHour }} className="border-t border-transparent">
                      {format(setHourMinute(new Date(), h, 0), "h a")}
                    </div>
                  ))}
                </div>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {weekDays.map((d) => {
                    const key = format(d, "yyyy-MM-dd")
                    const dayMs = (meetingsByDay.get(key) ?? [])
                      .filter((m) => {
                        try {
                          return isSameDay(parseISO(m.start), d)
                        } catch {
                          return false
                        }
                      })
                      .filter((m) => !isMeetingEndedOnTodayCell(m, d, now))
                    return (
                      <div key={key} className="flex flex-col min-w-0 border border-border/70 rounded-xl overflow-hidden bg-card/55 shadow-sm">
                        <div className="text-center py-2 border-b border-border/70 text-xs font-semibold bg-muted/20">
                          <div className="text-muted-foreground">{format(d, "EEE")}</div>
                          <div className={cn(isSameDay(d, new Date()) && "text-primary")}>{format(d, "d")}</div>
                        </div>
                        <div className="relative" style={{ height: HOURS.length * pxPerHour }}>
                          {HOURS.map((h) => (
                            <div
                              key={h}
                              className="absolute left-0 right-0 border-t border-border/40"
                              style={{ top: (h - HOURS[0]) * pxPerHour }}
                            />
                          ))}
                          {dayMs.map((m) => {
                            const { top, height } = placeMeeting(m, d)
                            return (
                              <MeetingBlock
                                key={m.id}
                                meeting={m}
                                meetings={meetings}
                                isLive={isMeetingInProgressOnCell(m, d, now)}
                                style={{ top, height }}
                                onOpen={() => {
                                  setSelectedMeeting(m)
                                  setDetailOpen(true)
                                }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollArea>
          )}

          {view === "day" && (
            <ScrollArea className="h-full">
              <div className="flex max-w-3xl mx-auto px-6 py-4">
                <div className="w-14 shrink-0 text-[10px] text-muted-foreground text-right pr-2">
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: pxPerHour }} className="border-t border-border/30 pt-0.5">
                      {format(setHourMinute(new Date(), h, 0), "h a")}
                    </div>
                  ))}
                </div>
                <div className="flex-1 relative border border-border/70 rounded-xl bg-card/55 shadow-sm" style={{ height: HOURS.length * pxPerHour }}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/40"
                      style={{ top: (h - HOURS[0]) * pxPerHour }}
                    />
                  ))}
                  {(meetingsByDay.get(format(anchor, "yyyy-MM-dd")) ?? [])
                    .filter((m) => !isMeetingEndedOnTodayCell(m, anchor, now))
                    .map((m) => {
                      const { top, height } = placeMeeting(m, anchor)
                      return (
                        <MeetingBlock
                          key={m.id}
                          meeting={m}
                          meetings={meetings}
                          isLive={isMeetingInProgressOnCell(m, anchor, now)}
                          style={{ top, height, left: 4, right: 4 }}
                          onOpen={() => {
                            setSelectedMeeting(m)
                            setDetailOpen(true)
                          }}
                        />
                      )
                    })}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Detail popover-style dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-md border-border/60 bg-card/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 pr-8">
                {selectedMeeting?.title}
                {selectedMeeting?.conflict && (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Conflict
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedMeeting && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  {format(parseISO(selectedMeeting.start), "PPp")} – {format(parseISO(selectedMeeting.end), "p")}
                </p>
                {selectedMeeting.conflict && (
                  <p className="text-xs text-destructive flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Overlaps with: {meetingOverlapTitles(selectedMeeting, meetings).join(", ") || "another event"}
                  </p>
                )}
                {selectedMeeting.mailbox_id && (
                  <div>
                    <span className="text-xs text-muted-foreground">Mailbox</span>
                    <p className="text-xs">
                      {mailboxNameById[selectedMeeting.mailbox_id] ?? selectedMeeting.mailbox_id}
                    </p>
                  </div>
                )}
                {selectedMeeting.location && (
                  <div>
                    <span className="text-xs text-muted-foreground">Location</span>
                    <p>{selectedMeeting.location}</p>
                  </div>
                )}
                {selectedMeeting.meeting_link && (
                  <div>
                    <span className="text-xs text-muted-foreground">Join link</span>
                    <a
                      href={selectedMeeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary break-all underline-offset-2 hover:underline block"
                    >
                      {selectedMeeting.meeting_link}
                    </a>
                  </div>
                )}
                {(selectedMeeting.attendees?.length ?? 0) > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Attendees</span>
                    <p className="text-xs">{selectedMeeting.attendees!.join(", ")}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedMeeting.source === "email" && selectedMeeting.email_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-xl"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("followups:navigate", {
                            detail: { emailId: selectedMeeting.email_id },
                          })
                        )
                        setDetailOpen(false)
                      }}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Open email
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => openEdit(selectedMeeting)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 rounded-xl"
                    onClick={() => deleteMeeting(selectedMeeting)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create / edit */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-border/60 bg-card/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit meeting" : "New meeting"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="cal-mailbox">
                  Mailbox <span className="text-destructive">*</span>
                </Label>
                <Select value={formMailboxId || undefined} onValueChange={setFormMailboxId}>
                  <SelectTrigger id="cal-mailbox" className="rounded-xl w-full">
                    <SelectValue placeholder="Select mailbox for this meeting" />
                  </SelectTrigger>
                  <SelectContent>
                    {mailboxList.map((mb) => (
                      <SelectItem key={mb.id} value={mb.id}>
                        {mb.name?.trim() || mb.email || mb.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The meeting is saved under this account. Use the calendar sidebar to show all mailboxes or only one.
                </p>
                {mailboxList.length === 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    No mailboxes connected. Add one in Mailboxes first.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="cal-title">Title</Label>
                <Input id="cal-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Sprint planning" />
              </div>
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl">
                      {formDate ? format(formDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DayPicker mode="single" selected={formDate} onSelect={setFormDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cal-start">Start</Label>
                  <Input id="cal-start" type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="cal-end">End</Label>
                  <Input id="cal-end" type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="cal-loc">Location</Label>
                <Input id="cal-loc" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="Zoom" />
              </div>
              <div>
                <Label htmlFor="cal-link">Meeting link</Label>
                <Input
                  id="cal-link"
                  value={formMeetingLink}
                  onChange={(e) => setFormMeetingLink(e.target.value)}
                  placeholder="https://zoom.us/j/... or meet.google.com/..."
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Paste your Zoom, Google Meet, or Teams join link. It will be saved on the event and included in AI invites.
                </p>
              </div>
              <div>
                <Label htmlFor="cal-att">Attendees (emails, comma-separated)</Label>
                <Input
                  id="cal-att"
                  value={formAttendees}
                  onChange={(e) => setFormAttendees(e.target.value)}
                  placeholder="ana@company.com, bob@company.com"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Use full email addresses. Names without @ are kept on the calendar only — not for email invites.
                </p>
              </div>

              {!editingId && (
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <Label htmlFor="cal-send-invite" className="text-sm font-semibold cursor-pointer">
                          Send AI meeting invite by email
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                        After the event is saved, you’ll preview the AI-written email, edit if you like, then send.
                      </p>
                    </div>
                    <Switch
                      id="cal-send-invite"
                      checked={sendInviteEmail}
                      onCheckedChange={setSendInviteEmail}
                    />
                  </div>

                  {sendInviteEmail && (
                    <div className="space-y-3 pl-0 sm:pl-6 border-t border-border/50 pt-3">
                      {parsedInviteEmails.length > 0 ? (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">Send to</Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto rounded-lg border border-border/60 bg-background/80 p-2">
                            {parsedInviteEmails.map((email) => (
                              <label
                                key={email}
                                className="flex items-center gap-2.5 cursor-pointer rounded-md px-1 py-1 hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={inviteSelection[email] !== false}
                                  onCheckedChange={(checked) => {
                                    setInviteSelection((prev) => ({
                                      ...prev,
                                      [email]: checked === true,
                                    }))
                                  }}
                                />
                                <span className="text-sm truncate">{email}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Add at least one email above to choose recipients.
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tone</Label>
                          <Select value={inviteTone} onValueChange={(v) => setInviteTone(v as "formal" | "friendly")}>
                            <SelectTrigger className="rounded-xl h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="formal">Formal</SelectItem>
                              <SelectItem value="friendly">Friendly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {mailboxFilter === "all" && mailboxList.length > 0 && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Send from</Label>
                            <Select value={sendFromMailboxId || mailboxList[0]?.id} onValueChange={setSendFromMailboxId}>
                              <SelectTrigger className="rounded-xl h-9">
                                <SelectValue placeholder="Mailbox" />
                              </SelectTrigger>
                              <SelectContent>
                                {mailboxList.map((mb) => (
                                  <SelectItem key={mb.id} value={mb.id}>
                                    {mb.name || mb.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {mailboxFilter !== "all" && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Send className="h-3 w-3 shrink-0" />
                          Invites will be sent from{" "}
                          <span className="font-medium text-foreground">
                            {mailboxNameById[mailboxFilter] ?? "this mailbox"}
                          </span>{" "}
                          (calendar filter).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                className="rounded-xl gap-2"
                onClick={submitForm}
                disabled={saving || (!editingId && mailboxList.length === 0)}
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingId ? "Save" : sendInviteEmail ? "Create & preview invite" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={overlapDialogOpen} onOpenChange={setOverlapDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Scheduling conflict</AlertDialogTitle>
              <AlertDialogDescription>
                This overlaps with: {overlapTitles.join(", ")}. Create anyway?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setPendingCreateBody(null)
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmOverlapCreate}>Create anyway</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Review AI invite before send */}
        <Dialog
          open={invitePreviewOpen}
          onOpenChange={(open) => {
            setInvitePreviewOpen(open)
            if (!open) {
              setInviteDraftLoading(false)
            }
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-border/60 bg-card/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                Review invite email
              </DialogTitle>
              <DialogDescription>
                Edit the subject or body below, then send. The meeting is already saved on your calendar.
              </DialogDescription>
            </DialogHeader>

            {inviteDraftLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="h-9 w-9 animate-spin text-primary" />
                <p className="text-sm">Writing your invite with AI…</p>
              </div>
            ) : (
              <div className="space-y-4 py-1">
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <p className="text-sm mt-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 break-all">
                    {invitePreviewTo.join(", ")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="invite-preview-subject">Subject</Label>
                  <Input
                    id="invite-preview-subject"
                    value={invitePreviewSubject}
                    onChange={(e) => setInvitePreviewSubject(e.target.value)}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="invite-preview-body">Message</Label>
                  <Textarea
                    id="invite-preview-body"
                    value={invitePreviewBody}
                    onChange={(e) => setInvitePreviewBody(e.target.value)}
                    rows={12}
                    className="rounded-xl mt-1 min-h-[200px] resize-y font-sans text-sm leading-relaxed"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={inviteDraftLoading || sendingInvite}
                onClick={() => setInvitePreviewOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl gap-2"
                disabled={inviteDraftLoading || sendingInvite}
                onClick={() => void handleConfirmSendInvite()}
              >
                {sendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

function MeetingPill({
  meeting,
  meetings,
  compact,
  isLive,
  onOpen,
}: {
  meeting: CalendarMeeting
  meetings: CalendarMeeting[]
  compact?: boolean
  isLive?: boolean
  onOpen: () => void
}) {
  const others = meetingOverlapTitles(meeting, meetings)
  const inner = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className={cn(
        "w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-semibold transition-all",
        isLive
          ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 border border-emerald-500/40 hover:bg-emerald-500/25"
          : meeting.conflict
            ? "bg-destructive/12 text-destructive border border-destructive/25"
            : "bg-primary/12 text-primary border border-primary/20 hover:bg-primary/20",
      )}
    >
      {format(parseISO(meeting.start), "h:mm a")} {meeting.title}
    </button>
  )
  if (compact && (meeting.conflict || others.length > 0)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent>
          {meeting.conflict || others.length > 0
            ? `Conflict with: ${others.length ? others.join(", ") : "another event"}`
            : meeting.title}
        </TooltipContent>
      </Tooltip>
    )
  }
  return inner
}

function MeetingBlock({
  meeting,
  meetings,
  style,
  isLive,
  onOpen,
}: {
  meeting: CalendarMeeting
  meetings: CalendarMeeting[]
  style: CSSProperties
  isLive?: boolean
  onOpen: () => void
}) {
  const others = meetingOverlapTitles(meeting, meetings)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "absolute z-[1] overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[10px] shadow-sm transition-all hover:z-[2] hover:scale-[1.02]",
            isLive
              ? "border-emerald-500/45 bg-emerald-500/12 text-foreground dark:text-emerald-50 hover:border-emerald-500/60 ring-1 ring-emerald-500/20"
              : meeting.conflict
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/25 bg-primary/[0.09] text-foreground hover:border-primary/40",
          )}
          style={style}
        >
          <span className="font-semibold block truncate">{meeting.title}</span>
          <span className="opacity-80">
            {format(parseISO(meeting.start), "h:mm a")} – {format(parseISO(meeting.end), "h:mm a")}
          </span>
          {meeting.conflict && <AlertTriangle className="h-3 w-3 absolute top-1 right-1" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{meeting.title}</p>
        {(meeting.conflict || others.length > 0) && (
          <p className="text-xs text-destructive mt-1">Overlaps: {others.join(", ") || "yes"}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
