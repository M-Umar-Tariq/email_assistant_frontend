"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import {
  LayoutDashboard,
  Inbox,
  PenSquare,
  BarChart3,
  Settings,
  Plus,
  Clock,
  Mic,
  Sun,
  Moon,
  Users,
  ChevronRight,
  ChevronDown,
  Menu,
  PanelRight,
  CalendarDays,
  CalendarPlus,
  Home,
  LayoutGrid,
  Columns2,
  Square,
  RefreshCw,
  ChevronLeft,
  Megaphone,
  Mails,
  Circle,
  Send,
  Trash2,
  ShieldAlert,
  Archive,
  Star,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { mailboxes as mailboxesApi, briefing, settingsApi, emails as emailsApi, type AiLabelRule, type FolderCountsApi } from "@/lib/api"
import type { LabelsUpdatedDetail } from "@/lib/labels-events"
import { useAuth } from "@/lib/auth-context"
import { mapMailboxApi } from "@/lib/mappers"
import type { Mailbox } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { AccountMenu } from "@/components/mailbox-account-menu"
import { BetaLabel } from "@/components/beta-label"
import smartMailLogo from "@/logo/Smart Mail Logo.png"
import smartMailLogoGray from "@/logo/Smart Mail Logo Gray.png"

const NAV_PANEL_STORAGE_KEY = "smart-mail-ai:nav-panel"

/** Primary icon rail width (matches broader “stamp-style” left strip) */
const RAIL_WIDTH = "w-[72px]"
/** Secondary nav / brand column — a bit wider than before */
const DETAIL_PANEL_WIDTH = "w-[260px] max-w-[260px]"

function userInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0]
    const b = parts[1][0]
    if (a && b) return `${a}${b}`.toUpperCase()
  }
  const compact = name.replace(/\s+/g, "").slice(0, 2)
  return compact ? compact.toUpperCase() : "U"
}

// ── Icon rail items ──────────────────────────────────────────────────────────

/** Narrow rail top row: Home + Calendar (Mailboxes is a separate control below these). */
const railTop = [
  { id: "dashboard", icon: Home, tip: "Home" },
  { id: "calendar", icon: CalendarDays, tip: "Calendar" },
]

const railBottom = [
  { id: "feedback", icon: Megaphone, tip: "Feedback" },
  { id: "settings", icon: Settings, tip: "Settings" },
]

function AssistantLogoIcon({ className }: { className?: string }) {
  return (
    <Image
      src={smartMailLogoGray}
      alt="Smart Mail Assistant"
      className={cn("h-3 w-3 object-contain", className)}
    />
  )
}

// ── Sidebar component ────────────────────────────────────────────────────────

export type EmailFolder = "inbox" | "sent" | "trash" | "archive" | "star" | "spam" | "snoozed"

const FOLDER_ITEMS: { id: EmailFolder; label: string; icon: React.ElementType }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "sent", label: "Sent", icon: Send },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "star", label: "Star", icon: Star },
  { id: "spam", label: "Spam", icon: ShieldAlert },
  { id: "snoozed", label: "Snoozed", icon: Clock },
]

export function AppSidebar({
  activeView,
  onViewChange,
  onAddMailboxClick,
  mailboxListKey = 0,
  onSelectLabel,
  activeFolder,
  onFolderChange,
}: {
  activeView: string
  onViewChange: (view: string) => void
  onAddMailboxClick?: () => void
  mailboxListKey?: number
  onSelectLabel?: (label: string) => void
  activeFolder?: EmailFolder
  onFolderChange?: (folder: EmailFolder) => void
}) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [badges, setBadges] = useState({ unread: 0, followUps: 0 })
  const [labelRules, setLabelRules] = useState<AiLabelRule[]>([])
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [activeMailboxFilter, setActiveMailboxFilter] = useState<string>("all")
  const [calendarSidebarView, setCalendarSidebarView] = useState<"month" | "week" | "day">("month")
  /** Which mailbox the calendar shows (synced with CalendarView via custom event). */
  const [calendarMailboxFilter, setCalendarMailboxFilter] = useState<string>("all")
  const [inboxExpanded, setInboxExpanded] = useState(false)
  const [folderCounts, setFolderCounts] = useState<FolderCountsApi | null>(null)
  const [pendingMeetingRequests, setPendingMeetingRequests] = useState(0)

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(NAV_PANEL_STORAGE_KEY) === "1") {
        setPanelCollapsed(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const toggleNavPanel = useCallback(() => {
    setPanelCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(NAV_PANEL_STORAGE_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  useEffect(() => {
    const onFilterChanged = (e: Event) => {
      const id = (e as CustomEvent<{ mailboxId?: string }>).detail?.mailboxId
      if (id === "all" || (typeof id === "string" && id.length > 0)) {
        setActiveMailboxFilter(id)
      }
    }
    window.addEventListener("inbox:filterMailboxChanged", onFilterChanged as EventListener)
    return () => window.removeEventListener("inbox:filterMailboxChanged", onFilterChanged as EventListener)
  }, [])

  useEffect(() => {
    const onCalView = (e: Event) => {
      const v = (e as CustomEvent<{ view?: string }>).detail?.view
      if (v === "month" || v === "week" || v === "day") setCalendarSidebarView(v)
    }
    window.addEventListener("calendar:viewChanged", onCalView as EventListener)
    return () => window.removeEventListener("calendar:viewChanged", onCalView as EventListener)
  }, [])

  useEffect(() => {
    if (activeView !== "calendar") return
    window.dispatchEvent(
      new CustomEvent("calendar:setMailboxFilter", { detail: { mailboxId: calendarMailboxFilter } }),
    )
  }, [activeView, calendarMailboxFilter])

  // Poll pending meeting-request count so the rail badge stays fresh after sync.
  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      emailsApi
        .withMeetings({ status: "pending" })
        .then((res) => {
          if (!cancelled) setPendingMeetingRequests(res.pending ?? 0)
        })
        .catch(() => {
          if (!cancelled) setPendingMeetingRequests(0)
        })
    }
    refresh()
    const onMeetingsUpdated = () => refresh()
    const onSync = () => refresh()
    window.addEventListener("meetings:updated", onMeetingsUpdated)
    window.addEventListener("email:sync", onSync)
    window.addEventListener("mailbox:sync-complete", onSync)
    return () => {
      cancelled = true
      window.removeEventListener("meetings:updated", onMeetingsUpdated)
      window.removeEventListener("email:sync", onSync)
      window.removeEventListener("mailbox:sync-complete", onSync)
    }
  }, [])

  useEffect(() => {
    if (
      calendarMailboxFilter !== "all" &&
      !mailboxes.some((m) => m.id === calendarMailboxFilter)
    ) {
      setCalendarMailboxFilter("all")
    }
  }, [mailboxes, calendarMailboxFilter])

  const refreshMailboxes = useCallback(() => {
    mailboxesApi.list().then((list) => setMailboxes(list.map(mapMailboxApi))).catch(() => { })
  }, [])

  const refreshFolderCounts = useCallback(() => {
    emailsApi.folderCounts().then((counts) => {
      setFolderCounts(counts)
      setBadges((prev) => ({ ...prev, unread: counts.inbox }))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    mailboxesApi.list().then((list) => setMailboxes(list.map(mapMailboxApi))).catch(() => { })
    briefing.get().then((b) => setBadges({
      unread: b.stats.unread_total,
      followUps: b.stats.overdue_follow_ups + b.stats.pending_follow_ups,
    })).catch(() => { })
    settingsApi.get().then((s) => {
      setLabelRules((s.ai_label_rules ?? []).filter((r) => r.name?.trim()))
    }).catch(() => { })
    refreshFolderCounts()
  }, [mailboxListKey, refreshFolderCounts])

  useEffect(() => {
    const onEmailRead = (e: Event) => {
      const mailboxId = (e as CustomEvent).detail?.mailboxId
      setBadges((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }))
      setFolderCounts((prev) => prev ? { ...prev, inbox: Math.max(0, prev.inbox - 1) } : prev)
      if (mailboxId) {
        setMailboxes((prev) =>
          prev.map((mb) =>
            mb.id === mailboxId ? { ...mb, unread: Math.max(0, mb.unread - 1) } : mb
          )
        )
      }
    }
    const onEmailSync = (e: Event) => {
      const newCount = (e as CustomEvent).detail?.newCount ?? 0
      if (newCount > 0) {
        setBadges((prev) => ({ ...prev, unread: prev.unread + newCount }))
        mailboxesApi.list().then((list) => setMailboxes(list.map(mapMailboxApi))).catch(() => { })
      }
    }
    const onMailboxSyncComplete = () => {
      refreshMailboxes()
      refreshFolderCounts()
      briefing.get().then((b) => setBadges((prev) => ({
        ...prev,
        unread: b.stats.unread_total,
      }))).catch(() => { })
    }
    const onLabelsUpdated = (e: Event) => {
      const detail = (e as CustomEvent<LabelsUpdatedDetail>).detail
      if (detail?.rules && Array.isArray(detail.rules)) {
        setLabelRules(detail.rules.filter((r) => r.name?.trim()))
        return
      }
      settingsApi.get().then((s) => {
        setLabelRules((s.ai_label_rules ?? []).filter((r) => r.name?.trim()))
      }).catch(() => {})
    }
    window.addEventListener("email:read", onEmailRead)
    window.addEventListener("email:sync", onEmailSync)
    window.addEventListener("mailbox:sync-complete", onMailboxSyncComplete)
    window.addEventListener("labels:updated", onLabelsUpdated)
    window.addEventListener("folder-counts:refresh", refreshFolderCounts)
    return () => {
      window.removeEventListener("email:read", onEmailRead)
      window.removeEventListener("email:sync", onEmailSync)
      window.removeEventListener("mailbox:sync-complete", onMailboxSyncComplete)
      window.removeEventListener("labels:updated", onLabelsUpdated)
      window.removeEventListener("folder-counts:refresh", refreshFolderCounts)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const POLL_INTERVAL_MS = 60_000
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMailboxes()
      briefing.get().then((b) => setBadges((prev) => ({
        ...prev,
        unread: b.stats.unread_total,
        followUps: b.stats.overdue_follow_ups + b.stats.pending_follow_ups,
      }))).catch(() => {})
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refreshMailboxes])

  useEffect(() => {
    const hasSyncing = mailboxes.some(mb => mb.syncStatus === "syncing")
    if (!hasSyncing) return
    const interval = setInterval(() => {
      refreshMailboxes()
    }, 5000)
    return () => clearInterval(interval)
  }, [mailboxes, refreshMailboxes])

  const LABEL_COLORS = [
    "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
    "bg-violet-500", "bg-cyan-500", "bg-pink-500", "bg-lime-500",
    "bg-orange-500", "bg-teal-500",
  ]

  /** Calendar rail + detail panel show for grid view and meeting requests (same sidebar). */
  const calendarSection = activeView === "calendar" || activeView === "meeting-requests"

  /**
   * Meeting Requests unmounts CalendarView, so sidebar actions that talk to the calendar
   * must switch back first. Defer dispatches so listeners attach after mount.
   */
  const ensureCalendarView = useCallback(
    (afterMount?: () => void) => {
      if (activeView !== "meeting-requests") {
        afterMount?.()
        return
      }
      onViewChange("calendar")
      if (afterMount) setTimeout(afterMount, 0)
    },
    [activeView, onViewChange],
  )

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full min-h-0 flex-col bg-sidebar border-r border-border">
        {/* ─── Top bar: menu toggle + logo / title (both link to app home) ─── */}
        <div className="flex min-h-[3.5rem] shrink-0 items-stretch border-b border-border pt-3 pb-4">
          <div className={cn("flex shrink-0 items-center justify-center border-r border-border bg-sidebar", RAIL_WIDTH)}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleNavPanel}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground hover:bg-muted/70 transition-colors"
                  aria-label={panelCollapsed ? "Expand navigation panel" : "Collapse navigation panel"}
                  aria-expanded={!panelCollapsed}
                >
                  {panelCollapsed ? (
                    <PanelRight className="h-5 w-5" strokeWidth={1.75} />
                  ) : (
                    <Menu className="h-5 w-5" strokeWidth={1.75} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="z-[200]">
                <p>{panelCollapsed ? "Show menu" : "Hide menu"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center bg-sidebar px-3 transition-[width,opacity] duration-200",
              panelCollapsed ? "w-0 max-w-0 overflow-hidden p-0 opacity-0" : `${DETAIL_PANEL_WIDTH} opacity-100`,
            )}
          >
            <Link
              href="/app"
              className="flex min-w-0 w-full max-w-full items-center justify-center gap-3 rounded-lg px-1 py-0.5 hover:opacity-90 transition-opacity"
              onClick={(e) => {
                const onApp = pathname === "/app" || pathname?.startsWith("/app/")
                if (onApp) {
                  e.preventDefault()
                  window.dispatchEvent(new CustomEvent("app:goHome"))
                }
              }}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center transition-transform hover:scale-[1.02]">
                <Image src={smartMailLogo} alt="Smart Mail AI logo" className="h-[34px] w-[34px] object-contain" priority />
              </span>
              <span className="flex min-w-0 items-center text-left text-lg font-bold leading-tight tracking-tight text-foreground">
                <span className="truncate">
                  Smart Mail <span className="text-primary">AI</span>
                </span>
                <BetaLabel className="ml-1.5 text-[10px] px-2 py-0.5" />
              </span>
            </Link>
          </div>
        </div>

        {/* ─── Body: icon rail + detail panel ─── */}
        <div className="flex min-h-0 flex-1">
        {/* ─── LEFT: Icon rail — Home, Calendar, Mailboxes | space | Theme, Feedback, Settings, Account ─── */}
        <div className={cn("flex h-full min-h-0 shrink-0 flex-col items-center border-r border-border bg-sidebar", RAIL_WIDTH)}>
          <div className="flex shrink-0 flex-col items-center gap-2 py-3 w-full px-1.5">
            {railTop.map(({ id, icon: Icon, tip }) => {
              const isActive =
                id === "calendar" ? calendarSection : activeView === id
              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onViewChange(id)}
                      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                      {id === "calendar" && pendingMeetingRequests > 0 ? (
                        <span className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm">
                          {pendingMeetingRequests > 99 ? "99+" : pendingMeetingRequests}
                        </span>
                      ) : null}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="z-[200]">
                    <p>{tip}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onViewChange("mailboxes")}
                  className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar ${
                    activeView === "mailboxes"
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                  aria-label="Mailboxes"
                >
                  <Mails className="h-5 w-5" strokeWidth={activeView === "mailboxes" ? 2.25 : 1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className="z-[200]">
                <p>Mailboxes</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="min-h-0 flex-1" />

          <div className="flex shrink-0 flex-col items-center gap-2 border-t border-border/80 py-3 w-full px-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className="z-[200]"><p>{theme === "dark" ? "Light mode" : "Dark mode"}</p></TooltipContent>
            </Tooltip>

            {railBottom.map(({ id, icon: Icon, tip }) => {
              const isActive = activeView === id
              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onViewChange(id)}
                      className={cn(
                        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                      {id === "feedback" ? (
                        <span
                          className="pointer-events-none absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 shadow-sm ring-2 ring-sidebar"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="z-[200]"><p>{tip}</p></TooltipContent>
                </Tooltip>
              )
            })}

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <AccountMenu
                    userName={user?.name ?? "User"}
                    userEmail={user?.email ?? ""}
                    onSignOut={() => logout()}
                    side="right"
                    align="end"
                  >
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
                      aria-label="Account"
                    >
                      <Avatar className="h-9 w-9 shadow-md shadow-primary/25 ring-2 ring-primary/15">
                        <AvatarFallback className="bg-primary text-[10px] font-bold tracking-tight text-primary-foreground">
                          {userInitials(user?.name ?? "")}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </AccountMenu>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className="z-[200]">
                <p>Account</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ─── RIGHT: Detail Panel ─── */}
        <div
          className={cn(
            "flex min-w-0 flex-col overflow-hidden bg-sidebar transition-[width,max-width,opacity] duration-200 ease-out",
            panelCollapsed ? "w-0 max-w-0 opacity-0 pointer-events-none" : `${DETAIL_PANEL_WIDTH} opacity-100`,
          )}
        >
          {calendarSection ? (
            <>
              <div className="px-3 pt-3 pb-2 border-b border-border/60">
                {activeView === "meeting-requests" ? (
                  <button
                    type="button"
                    onClick={() => onViewChange("calendar")}
                    className="w-full rounded-lg text-left transition-colors hover:bg-muted/50 -mx-1 px-1 py-0.5"
                    aria-label="Back to calendar"
                  >
                    <div className="flex items-center gap-2 text-primary">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-bold">Calendar</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                      Add events, switch views, and refresh synced meetings.
                    </p>
                  </button>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-bold">Calendar</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                      Add events, switch views, and refresh synced meetings.
                    </p>
                  </div>
                )}
              </div>

              {/* Prominent Meeting Request Action Button */}
              <div className="px-4 py-5 border-b border-border/40 bg-muted/5">
                <Button
                  onClick={() =>
                    ensureCalendarView(() =>
                      window.dispatchEvent(new CustomEvent("calendar:openCreate")),
                    )
                  }
                  className="group relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-0 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-[0.98] border-none"
                  aria-label="Schedule a new meeting"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center justify-center gap-2 px-4 py-2 w-full h-full">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 group-hover:rotate-90">
                      <Plus className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[15px] font-bold tracking-wide text-white drop-shadow-sm">
                      Schedule Meeting
                    </span>
                  </div>
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-2 py-3 space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 px-2 mb-2">
                      Incoming Requests
                    </p>
                    <div className="flex flex-col gap-0.5 px-1">
                      <button
                        type="button"
                        onClick={() => onViewChange("meeting-requests")}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-[13px] transition-all duration-200",
                          activeView === "meeting-requests"
                            ? "border-primary/40 bg-primary/10 text-primary font-bold shadow-sm"
                            : "border-transparent bg-primary/[0.03] text-foreground/80 hover:border-primary/20 hover:bg-primary/[0.06] hover:text-foreground",
                        )}
                      >
                        <CalendarPlus
                          className="h-4.5 w-4.5 shrink-0"
                          strokeWidth={activeView === "meeting-requests" ? 2.5 : 2}
                        />
                        <span className="flex-1 text-left truncate font-medium">Meeting Requests</span>
                        {pendingMeetingRequests > 0 && (
                          <span
                            className={cn(
                              "flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums shadow-sm",
                              activeView === "meeting-requests"
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary/20 text-primary",
                            )}
                          >
                            {pendingMeetingRequests}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 px-2 mb-1.5">
                      View
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {(
                        [
                          { id: "month" as const, label: "Month", icon: LayoutGrid },
                          { id: "week" as const, label: "Week", icon: Columns2 },
                          { id: "day" as const, label: "Day", icon: Square },
                        ] as const
                      ).map(({ id, label, icon: Icon }) => {
                        const isOn = calendarSidebarView === id
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              ensureCalendarView(() =>
                                window.dispatchEvent(
                                  new CustomEvent("calendar:setView", { detail: { view: id } }),
                                ),
                              )
                            }
                            className={cn(
                              "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150",
                              isOn
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" strokeWidth={isOn ? 2.25 : 1.75} />
                            <span className="flex-1 text-left truncate">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 px-2 mb-1.5">
                      Mailbox
                    </p>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCalendarMailboxFilter("all")
                          if (activeView === "meeting-requests") onViewChange("calendar")
                        }}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150",
                          calendarMailboxFilter === "all"
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        )}
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-dashed border-border/80 text-[9px] font-medium text-muted-foreground">
                          All
                        </span>
                        <span className="flex-1 text-left truncate">All mailboxes</span>
                      </button>
                      {mailboxes.map((mb) => {
                        const isOn = calendarMailboxFilter === mb.id
                        const isPending = mb.syncStatus === "pending"
                        const isError = mb.syncStatus === "error" || mb.syncStatus === "cancelled"
                        return (
                          <button
                            key={mb.id}
                            type="button"
                            onClick={() => {
                              setCalendarMailboxFilter(mb.id)
                              if (activeView === "meeting-requests") onViewChange("calendar")
                            }}
                            className={cn(
                              "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150",
                              isOn
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                            )}
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                              <Circle
                                className="h-2.5 w-2.5"
                                fill={isPending ? "transparent" : isError ? "var(--destructive)" : mb.color}
                                stroke={isPending ? mb.color : isError ? "var(--destructive)" : mb.color}
                                strokeWidth={isPending ? 2 : 1.5}
                              />
                            </span>
                            <span className="flex-1 text-left truncate">{mb.name}</span>
                          </button>
                        )
                      })}
                    </div>
                    {mailboxes.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/80 px-2 mt-1 leading-snug">
                        Connect a mailbox to filter meetings by account.
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 px-2 mb-1.5">
                      Navigate
                    </p>
                    <div className="flex items-center gap-1 px-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Previous"
                        onClick={() =>
                          ensureCalendarView(() =>
                            window.dispatchEvent(new CustomEvent("calendar:goPrev")),
                          )
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 min-w-0 text-xs px-1"
                        onClick={() =>
                          ensureCalendarView(() =>
                            window.dispatchEvent(new CustomEvent("calendar:goToday")),
                          )
                        }
                      >
                        Today
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Next"
                        onClick={() =>
                          ensureCalendarView(() =>
                            window.dispatchEvent(new CustomEvent("calendar:goNext")),
                          )
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 rounded-lg"
                    onClick={() =>
                      ensureCalendarView(() =>
                        window.dispatchEvent(new CustomEvent("calendar:reload")),
                      )
                    }
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </Button>
                  <p className="text-[10px] text-muted-foreground/80 px-2 leading-relaxed">
                    Events from email appear after inbox sync (today&apos;s mail).
                  </p>
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              <div className="px-3 pt-3 pb-2">
                <Button
                  size="sm"
                  className="w-full gap-2 rounded-lg font-semibold shadow-sm"
                  onClick={() => onViewChange("compose")}
                >
                  <PenSquare className="h-4 w-4" />
                  Compose
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-2 py-1">
                  {/* Dashboard */}
                  {(() => {
                    const isActive = activeView === "dashboard"
                    return (
                      <button
                        type="button"
                        onClick={() => onViewChange("dashboard")}
                        className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <LayoutDashboard className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
                        <span className="flex-1 text-left truncate">Daily Briefing</span>
                      </button>
                    )
                  })()}

                  {/* Inbox with expandable folder sub-items */}
                  <button
                    type="button"
                    onClick={() => {
                      if (activeView !== "inbox") {
                        onFolderChange?.("inbox")
                        onViewChange("inbox")
                      }
                      setInboxExpanded((v) => !v)
                    }}
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
                      activeView === "inbox"
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Inbox className="h-4 w-4 shrink-0" strokeWidth={activeView === "inbox" ? 2.25 : 1.75} />
                    <span className="flex-1 text-left truncate">Inbox</span>
                    {badges.unread > 0 && (
                      <span className={`text-[11px] font-semibold tabular-nums ${activeView === "inbox" ? "text-primary" : "text-muted-foreground"}`}>
                        {badges.unread}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                        !inboxExpanded && "-rotate-90",
                      )}
                      strokeWidth={1.75}
                    />
                  </button>

                  {inboxExpanded && (
                    <div className="ml-3 border-l border-border/60 pl-1 flex flex-col gap-0.5 py-0.5">
                      {FOLDER_ITEMS.map(({ id: folderId, label: folderLabel, icon: FolderIcon }) => {
                        const isActive = activeView === "inbox" && activeFolder === folderId
                        const count = folderCounts?.[folderId] ?? 0
                        return (
                          <button
                            key={folderId}
                            type="button"
                            onClick={() => {
                              onFolderChange?.(folderId)
                              onViewChange("inbox")
                            }}
                            className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[12.5px] transition-all duration-150 ${
                              isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                          >
                            <FolderIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
                            <span className="flex-1 text-left truncate">{folderLabel}</span>
                            {count > 0 && (
                              <span className={`text-[10.5px] font-semibold tabular-nums ${isActive ? "text-primary" : "text-muted-foreground/70"}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Other nav items */}
                  {[
                    { id: "contacts", label: "Contacts", icon: Users, badge: null, iconClassName: "h-4 w-4" },
                    { id: "assistant", label: "Smart Mail Assistant", icon: AssistantLogoIcon, badge: null, iconClassName: "h-4 w-4" },
                    // { id: "agent", label: "Voice Agent", icon: Mic, badge: null, iconClassName: "h-4 w-4" },
                    ...(mailboxes.length > 0 ? [{ id: "followups" as const, label: "Follow-ups", icon: Clock, badge: badges.followUps || null }] : []),
                    { id: "analytics", label: "Analytics", icon: BarChart3, badge: null, iconClassName: "h-4 w-4" },
                  ].map(({ id, label, icon: Icon, badge, iconClassName }) => {
                    const isActive = activeView === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onViewChange(id)}
                        className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Icon className={`${iconClassName ?? "h-4 w-4"} shrink-0`} strokeWidth={isActive ? 2.25 : 1.75} />
                        <span className="flex-1 text-left truncate">{label}</span>
                        {badge != null && badge > 0 && (
                          <span className={`text-[11px] font-semibold tabular-nums ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                            {badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-1 px-3 pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Labels</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onViewChange("labels")}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={6}><p>Manage labels</p></TooltipContent>
                    </Tooltip>
                  </div>
                  {labelRules.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/50 px-1 pb-2">No labels yet</p>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {labelRules.map((rule, i) => (
                        <button
                          key={rule.name}
                          type="button"
                          onClick={() => onSelectLabel?.(rule.name.trim())}
                          className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150"
                        >
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${LABEL_COLORS[i % LABEL_COLORS.length]}`} />
                          <span className="flex-1 text-left truncate">{rule.name}</span>
                          <ChevronRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
        </div>
      </div>

    </TooltipProvider>
  )
}
