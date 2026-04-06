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
} from "lucide-react"
import { toast } from "sonner"
import { calendar as calendarApi, mailboxes as mailboxesApi, type CalendarMeeting } from "@/lib/api"
import { mapMailboxApi } from "@/lib/mappers"
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

type ViewMode = "month" | "week" | "day"

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

export function CalendarView() {
  const [view, setView] = useState<ViewMode>("month")
  const [anchor, setAnchor] = useState(() => new Date())
  const [mailboxFilter, setMailboxFilter] = useState<string>("all")
  const [mailboxNameById, setMailboxNameById] = useState<Record<string, string>>({})
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
  const [formAttendees, setFormAttendees] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false)
  const [pendingCreateBody, setPendingCreateBody] = useState<{
    title: string
    start: string
    end: string
    location?: string
    attendees?: string[]
    notes?: string
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

  const refreshMailboxNames = useCallback(() => {
    mailboxesApi
      .list()
      .then((list) => {
        const m: Record<string, string> = {}
        for (const x of list.map(mapMailboxApi)) {
          m[x.id] = x.name?.trim() || x.email || x.id
        }
        setMailboxNameById(m)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshMailboxNames()
  }, [refreshMailboxNames])

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
    setFormAttendees("")
    setFormNotes("")
    setFormOpen(true)
  }, [anchor])

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
    setFormAttendees((m.attendees ?? []).join(", "))
    setFormNotes(m.notes ?? "")
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
    const attendees = formAttendees
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const body = {
      title: formTitle.trim() || "Meeting",
      start: times.start,
      end: times.end,
      location: formLocation.trim() || undefined,
      attendees: attendees.length ? attendees : undefined,
      notes: formNotes.trim() || undefined,
      ...(mailboxFilter !== "all" ? { mailbox_id: mailboxFilter } : {}),
    }

    if (editingId) {
      setSaving(true)
      try {
        await calendarApi.update(editingId, body)
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
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="flex min-h-[3.25rem] flex-col items-center justify-center border-b border-border px-6 py-3 shrink-0 gap-0.5">
          <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight text-center">
            {headerLabel}
          </h1>
          {mailboxFilter !== "all" && (
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Mailbox:{" "}
              <span className="font-medium text-foreground/90">
                {mailboxNameById[mailboxFilter] ?? "Selected account"}
              </span>
            </p>
          )}
        </header>

        <div className="flex-1 min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <div className="grid grid-cols-7 gap-px rounded-lg border border-border overflow-hidden bg-border">
                  {monthGridDays.map((day) => {
                    const key = format(day, "yyyy-MM-dd")
                    const dayMeetings = meetingsByDay.get(key) ?? []
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
                          "min-h-[88px] bg-background p-1.5 text-left transition-colors hover:bg-muted/40 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
                          !inMonth && "opacity-40",
                          isToday && "ring-1 ring-inset ring-primary/40",
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
                    const dayMs = (meetingsByDay.get(key) ?? []).filter((m) => {
                      try {
                        return isSameDay(parseISO(m.start), d)
                      } catch {
                        return false
                      }
                    })
                    return (
                      <div key={key} className="flex flex-col min-w-0 border border-border rounded-lg overflow-hidden bg-card/30">
                        <div className="text-center py-2 border-b border-border text-xs font-semibold">
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
                <div className="flex-1 relative border border-border rounded-lg bg-card/20" style={{ height: HOURS.length * pxPerHour }}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/40"
                      style={{ top: (h - HOURS[0]) * pxPerHour }}
                    />
                  ))}
                  {(meetingsByDay.get(format(anchor, "yyyy-MM-dd")) ?? []).map((m) => {
                    const { top, height } = placeMeeting(m, anchor)
                    return (
                      <MeetingBlock
                        key={m.id}
                        meeting={m}
                        meetings={meetings}
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
          <DialogContent className="sm:max-w-md">
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
                {(selectedMeeting.attendees?.length ?? 0) > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Attendees</span>
                    <p className="text-xs">{selectedMeeting.attendees!.join(", ")}</p>
                  </div>
                )}
                {selectedMeeting.notes && (
                  <div>
                    <span className="text-xs text-muted-foreground">Notes</span>
                    <p className="text-xs whitespace-pre-wrap">{selectedMeeting.notes}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedMeeting.source === "email" && selectedMeeting.email_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
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
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(selectedMeeting)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
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
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit meeting" : "New meeting"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="cal-title">Title</Label>
                <Input id="cal-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Sprint planning" />
              </div>
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
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
                <Label htmlFor="cal-att">Attendees (comma-separated)</Label>
                <Input id="cal-att" value={formAttendees} onChange={(e) => setFormAttendees(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cal-notes">Notes</Label>
                <Textarea id="cal-notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {editingId ? "Save" : "Create"}
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
      </div>
    </TooltipProvider>
  )
}

function MeetingPill({
  meeting,
  meetings,
  compact,
  onOpen,
}: {
  meeting: CalendarMeeting
  meetings: CalendarMeeting[]
  compact?: boolean
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
        "w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium transition-colors",
        meeting.conflict ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary hover:bg-primary/25",
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
  onOpen,
}: {
  meeting: CalendarMeeting
  meetings: CalendarMeeting[]
  style: CSSProperties
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
            "absolute z-[1] overflow-hidden rounded-md border px-1 py-0.5 text-left text-[10px] shadow-sm transition-transform hover:z-[2] hover:scale-[1.02]",
            meeting.conflict
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-primary/30 bg-primary/10 text-foreground",
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
