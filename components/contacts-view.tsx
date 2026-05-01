"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  Users,
  Mail,
  Loader2,
  Search,
  X,
  ChevronDown,
  Inbox,
  Send,
  Plus,
  Mailbox as MailboxIcon,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { emails as emailsApi, mailboxes as mailboxesApi } from "@/lib/api"
import { mapMailboxApi } from "@/lib/mappers"
import type { Mailbox } from "@/lib/mock-data"
import type { UniqueSendersApi, UniqueSenderApi } from "@/lib/api"
import { cn } from "@/lib/utils"

const AVATAR_COLORS = [
  "from-blue-500 to-cyan-600",
  "from-purple-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
  "from-lime-500 to-green-600",
]

function getAvatarColor(email: string) {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string, email: string) {
  const src = name || email
  const parts = src.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

type MailboxSenders = {
  mailboxId: string
  mailboxName: string
  mailboxEmail?: string
  color?: string
  data: UniqueSendersApi
}

function formatLastReceived(lastDate: string | null | undefined): string {
  if (!lastDate) return ""
  try {
    const d = new Date(lastDate)
    if (Number.isNaN(d.getTime())) return ""
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return ""
  }
}

function ContactRow({
  sender,
  index,
  selected,
  onToggleSelect,
  onContactClick,
  onSendEmail,
}: {
  sender: UniqueSenderApi
  index: number
  selected?: boolean
  onToggleSelect?: (sender: UniqueSenderApi, checked: boolean) => void
  onContactClick?: (sender: UniqueSenderApi) => void
  onSendEmail?: (sender: UniqueSenderApi) => void
}) {
  const gradient = getAvatarColor(sender.from_email)
  const initials = getInitials(sender.from_name, sender.from_email)
  const displayName = sender.from_name || sender.from_email.split("@")[0] || "Unknown"
  const lastReceived = formatLastReceived(sender.last_date)

  return (
    <div
      className={cn(
        "group box-border flex w-full min-w-0 max-w-full flex-col gap-2.5 rounded-xl border border-border/40 bg-card/60 px-2.5 py-2.5 transition-all duration-200 sm:flex-row sm:items-center sm:gap-3 sm:px-3.5 sm:py-3",
        "hover:border-border/70 hover:bg-muted/40 hover:shadow-md",
        index === 0 && "mt-0"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-2.5">
        {onToggleSelect && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onToggleSelect(sender, checked === true)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 shrink-0 sm:mt-0"
          />
        )}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onContactClick?.(sender)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onContactClick?.(sender)
            }
          }}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 rounded-lg text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary/30 sm:items-center sm:gap-3"
        >
          <Avatar className="h-9 w-9 shrink-0 shadow-md ring-2 ring-transparent transition-all duration-200 group-hover:ring-primary/10 sm:h-10 sm:w-10">
            <AvatarFallback
              className={cn(
                "bg-gradient-to-br text-[11px] font-semibold text-white",
                gradient
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight text-foreground">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground/70">{sender.from_email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground ring-1 ring-border/40"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Mail className="h-3 w-3 shrink-0 text-primary/70" aria-hidden />
                    <span>
                      {sender.count} {sender.count === 1 ? "email" : "emails"}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  <p className="text-xs">
                    {sender.count} email{sender.count !== 1 ? "s" : ""} from this contact — tap the row to open in inbox
                  </p>
                </TooltipContent>
              </Tooltip>
              {lastReceived && (
                <span
                  className="text-[10px] text-muted-foreground/65"
                  title={`Last email: ${lastReceived}`}
                >
                  <span className="hidden sm:inline">Last: </span>
                  {lastReceived}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 max-w-full sm:w-auto sm:shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full min-w-0 max-w-full gap-2 rounded-xl border-primary/30 text-primary shadow-sm hover:bg-primary/10 hover:text-primary sm:h-8 sm:w-auto sm:min-w-[7.5rem] sm:max-w-none sm:px-3"
              onClick={(e) => {
                e.stopPropagation()
                onSendEmail?.(sender)
              }}
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              Send email
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="end" className="max-sm:max-w-[min(100vw-2rem,280px)]">
            <p className="text-xs">Open compose to email this contact</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

const CONTACTS_PAGE_SIZE = 50
const CONTACTS_CACHE_KEY = "smartmail:contacts:v1"
const CONTACTS_CACHE_TTL_MS = 10 * 60 * 1000

function MailboxSection({
  sectionKey,
  title,
  icon,
  color,
  senders,
  totalContacts,
  defaultOpen = true,
  searchQuery,
  selectedEmails,
  onToggleSelect,
  visibleCount,
  onLoadMore,
  onContactClick,
  onSendEmail,
}: {
  sectionKey: string
  title: string
  icon: React.ReactNode
  color?: string
  senders: UniqueSenderApi[]
  totalContacts: number
  defaultOpen?: boolean
  searchQuery: string
  selectedEmails?: Set<string>
  onToggleSelect?: (sender: UniqueSenderApi, checked: boolean) => void
  visibleCount: number
  onLoadMore?: () => void
  onContactClick?: (sender: UniqueSenderApi) => void
  onSendEmail?: (sender: UniqueSenderApi) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  const filtered = useMemo(() => {
    if (!searchQuery) return senders
    const q = searchQuery.toLowerCase()
    return senders.filter(
      (s) =>
        s.from_name.toLowerCase().includes(q) ||
        s.from_email.toLowerCase().includes(q)
    )
  }, [senders, searchQuery])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const hasMore = visible.length < filtered.length

  if (searchQuery && filtered.length === 0) return null

  return (
    <Card className="w-full min-w-0 max-w-full overflow-hidden border-border/40 bg-card/70 shadow-sm transition-all duration-200 hover:border-border/70 hover:shadow-lg">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full min-w-0 max-w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30 sm:gap-2.5 sm:px-5 sm:py-4"
      >
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground">{title}</span>
        <Badge
          variant="secondary"
          className="shrink-0 text-[10px] font-semibold tabular-nums px-2 py-0.5"
        >
          {searchQuery ? filtered.length : totalContacts}
        </Badge>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>

      {open && (
        <CardContent className="min-w-0 max-w-full px-1.5 pb-2 pt-0 sm:px-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/60">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-xs">No contacts in this mailbox</p>
            </div>
          ) : (
            <>
              <div className="min-w-0 space-y-2 pt-1">
                {visible.map((s, i) => (
                  <ContactRow
                    key={s.from_email + i}
                    sender={s}
                    index={i}
                    selected={selectedEmails?.has(s.from_email.toLowerCase())}
                    onToggleSelect={onToggleSelect}
                    onContactClick={onContactClick}
                    onSendEmail={onSendEmail}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
                    onClick={onLoadMore}
                  >
                    Load more ({filtered.length - visible.length} more)
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function ContactsView({
  onAddMailboxClick,
  mailboxScope = "all",
  visible = true,
}: {
  onAddMailboxClick?: () => void
  mailboxScope?: string
  /** When Contacts is mounted but hidden, skip full-screen spinner on background refreshes. */
  visible?: boolean
} = {}) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [allSenders, setAllSenders] = useState<UniqueSendersApi | null>(null)
  const [byMailbox, setByMailbox] = useState<MailboxSenders[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [sectionVisibleCount, setSectionVisibleCount] = useState<Record<string, number>>({})
  const hasLoadedOnceRef = useRef(false)
  const prevContactsVisibleRef = useRef(false)

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    let cacheHydrated = false
    if (!silent && typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(CONTACTS_CACHE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as {
            ts: number
            mailboxes?: Mailbox[]
            allSenders?: UniqueSendersApi | null
            byMailbox?: MailboxSenders[]
          }
          if (
            typeof parsed.ts === "number" &&
            Date.now() - parsed.ts < CONTACTS_CACHE_TTL_MS
          ) {
            if (Array.isArray(parsed.mailboxes)) setMailboxes(parsed.mailboxes)
            if (parsed.allSenders !== undefined) setAllSenders(parsed.allSenders)
            if (Array.isArray(parsed.byMailbox)) setByMailbox(parsed.byMailbox)
            setLoading(false)
            cacheHydrated = true
          }
        }
      } catch {
        // ignore corrupt cache
      }
    }
    if (!silent && !cacheHydrated) {
      setLoading(true)
    }
    try {
      const [mbList, allData] = await Promise.all([
        mailboxesApi.list().then((list) => list.map(mapMailboxApi)),
        emailsApi.uniqueSenders(),
      ])
      setMailboxes(mbList)
      setAllSenders(allData)

      const perMailbox = await Promise.all(
        mbList.map(async (mb) => {
          const data = await emailsApi.uniqueSenders({ mailbox_id: mb.id })
          return {
            mailboxId: mb.id,
            mailboxName: mb.name,
            mailboxEmail: mb.email,
            color: mb.color,
            data,
          }
        })
      )
      setByMailbox(perMailbox)
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            CONTACTS_CACHE_KEY,
            JSON.stringify({
              ts: Date.now(),
              mailboxes: mbList,
              allSenders: allData,
              byMailbox: perMailbox,
            }),
          )
        }
      } catch {
        // quota / private mode
      }
    } catch {
      if (!silent) {
        setAllSenders(null)
        setByMailbox([])
      }
    } finally {
      setLoading(false)
      hasLoadedOnceRef.current = true
    }
  }, [])

  const fetchDataRef = useRef(fetchData)
  fetchDataRef.current = fetchData

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const becameVisible = visible && !prevContactsVisibleRef.current
    prevContactsVisibleRef.current = visible
    if (!becameVisible || !hasLoadedOnceRef.current) return
    fetchData({ silent: true })
  }, [visible, fetchData])

  useEffect(() => {
    const onMailbox = () => fetchDataRef.current({ silent: true })
    window.addEventListener("mailbox:updated", onMailbox)
    window.addEventListener("mailbox:sync-complete", onMailbox)
    return () => {
      window.removeEventListener("mailbox:updated", onMailbox)
      window.removeEventListener("mailbox:sync-complete", onMailbox)
    }
  }, [])

  useEffect(() => {
    setActiveTab(mailboxScope && mailboxScope.length > 0 ? mailboxScope : "all")
  }, [mailboxScope])

  const handleToggleSelect = useCallback((sender: UniqueSenderApi, checked: boolean) => {
    const key = sender.from_email.toLowerCase()
    setSelectedEmails((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const getVisibleCount = useCallback((key: string) => sectionVisibleCount[key] ?? CONTACTS_PAGE_SIZE, [sectionVisibleCount])
  const handleLoadMore = useCallback((key: string) => {
    setSectionVisibleCount((prev) => ({ ...prev, [key]: (prev[key] ?? CONTACTS_PAGE_SIZE) + CONTACTS_PAGE_SIZE }))
  }, [])

  const handleSendToSelected = useCallback(() => {
    if (selectedEmails.size === 0) return
    const toList = Array.from(selectedEmails).join(", ")
    window.dispatchEvent(new CustomEvent("compose:openWith", { detail: { to: toList } }))
    setSelectedEmails(new Set())
  }, [selectedEmails])

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Loading contacts</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Fetching senders from your mailboxes…</p>
        </div>
      </div>
    )
  }

  const sections =
    activeTab === "all"
      ? [
          {
            key: "all",
            title: "All Mailboxes",
            icon: (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm ring-1 ring-primary/10">
                <Inbox className="h-4 w-4 text-primary" />
              </div>
            ),
            senders: allSenders?.senders ?? [],
            totalContacts: allSenders?.unique_senders_count ?? 0,
            defaultOpen: true,
          },
        ]
      : byMailbox
          .filter((m) => activeTab === m.mailboxId)
          .map((m) => ({
            key: m.mailboxId,
            title: m.mailboxName,
            icon: (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/40 shadow-sm"
                style={{ backgroundColor: (m.color || "#6366f1") + "22" }}
              >
                <div
                  className="h-3 w-3 rounded-full ring-2 ring-background"
                  style={{ backgroundColor: m.color || "#6366f1" }}
                />
              </div>
            ),
            senders: m.data.senders,
            totalContacts: m.data.unique_senders_count,
            defaultOpen: true,
          }))

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-gradient-to-b from-background to-muted/[0.12]">
        {/* Header */}
        <div className="min-w-0 shrink-0 border-b border-border/60 bg-gradient-to-r from-background via-background to-primary/[0.03] backdrop-blur-sm">
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 md:shrink-0">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/10 sm:h-11 sm:w-11">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-extrabold leading-tight tracking-tight text-foreground sm:text-lg">
                    Contacts
                  </h1>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/75">
                    {allSenders?.unique_senders_count ?? 0} people · {mailboxes.length} mailbox
                    {mailboxes.length !== 1 ? "es" : ""}
                  </p>
                </div>
              </div>

              <div className="relative min-w-0 w-full flex-1 md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  placeholder="Search name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full min-w-0 rounded-xl border border-border/60 bg-card/75 pl-10 pr-9 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground/50 hover:border-border focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Total + tabs — one compact row on mobile */}
          <div className="flex flex-col gap-2.5 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
            <div className="flex w-fit items-center gap-2 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-3 py-1.5 text-blue-700 shadow-sm dark:text-blue-400">
              <Users className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span className="text-sm font-bold tabular-nums">{allSenders?.unique_senders_count ?? 0}</span>
              <span className="text-[10px] font-medium opacity-80">total</span>
            </div>

          {/* Tabs: All | By Mailbox (dropdown) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={activeTab === "all" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "text-xs h-8 rounded-xl gap-1.5 transition-all duration-200 shrink-0",
                activeTab === "all"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
              onClick={() => setActiveTab("all")}
            >
              <Inbox className="h-3.5 w-3.5" />
              All
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={activeTab !== "all" ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "text-xs h-8 rounded-xl gap-1.5 transition-all duration-200 shrink-0",
                    activeTab !== "all"
                      ? "text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  style={
                    activeTab !== "all"
                      ? (() => {
                          const mb = mailboxes.find((m) => m.id === activeTab)
                          const c = mb?.color || "#6366f1"
                          return { backgroundColor: c, boxShadow: `0 2px 8px ${c}30` }
                        })()
                      : undefined
                  }
                >
                  <Mail className="h-3.5 w-3.5" />
                  {activeTab !== "all"
                    ? mailboxes.find((m) => m.id === activeTab)?.name ?? "By Mailbox"
                    : "By Mailbox"}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[12rem]">
                {mailboxes.map((mb) => (
                  <DropdownMenuItem
                    key={mb.id}
                    onClick={() => setActiveTab(mb.id)}
                    className="gap-2 cursor-pointer"
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: mb.color || "#6366f1" }}
                    />
                    <span className="truncate">{mb.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {byMailbox.find((m) => m.mailboxId === mb.id)?.data.unique_senders_count ?? 0}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        </div>

        {/* Send to selected bar */}
        {selectedEmails.size > 0 && (
          <div className="flex min-w-0 shrink-0 flex-col gap-2 border-b border-border/60 bg-primary/5 px-4 py-2.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
            <span className="text-sm font-medium text-foreground">
              {selectedEmails.size} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-9 rounded-xl text-xs sm:h-8" onClick={() => setSelectedEmails(new Set())}>
                Clear
              </Button>
              <Button size="sm" className="h-9 gap-1.5 rounded-xl text-xs shadow-sm sm:h-8" onClick={handleSendToSelected}>
                <Send className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden min-[400px]:inline">Send to selected</span>
                <span className="min-[400px]:hidden">Send</span>
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div className="box-border mx-auto w-full min-w-0 max-w-4xl space-y-3 overflow-x-hidden px-4 py-4 pb-28 sm:space-y-4 sm:px-6 sm:py-5 sm:pb-12 md:pb-10">
            {mailboxes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50 mb-4 shadow-sm">
                  <MailboxIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">No contacts yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                  Connect a mailbox to see people who have emailed you here.
                </p>
                {onAddMailboxClick && (
                  <Button size="sm" className="mt-4 gap-2 rounded-xl shadow-sm" onClick={onAddMailboxClick}>
                    <Plus className="h-4 w-4" />
                    Connect a mailbox
                  </Button>
                )}
              </div>
            ) : sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
                <Users className="h-12 w-12 mb-3" />
                <p className="text-sm font-medium">No contacts found</p>
                <p className="text-xs mt-1">Try adjusting your search or filter</p>
              </div>
            ) : (
              sections.map((sec) => (
                <MailboxSection
                  key={sec.key}
                  sectionKey={sec.key}
                  title={sec.title}
                  icon={sec.icon}
                  senders={sec.senders}
                  totalContacts={sec.totalContacts}
                  defaultOpen={sec.defaultOpen}
                  searchQuery={searchQuery}
                  selectedEmails={selectedEmails}
                  onToggleSelect={handleToggleSelect}
                  visibleCount={getVisibleCount(sec.key)}
                  onLoadMore={() => handleLoadMore(sec.key)}
                  onContactClick={(sender) => {
                    window.dispatchEvent(
                      new CustomEvent("contacts:showEmailsFrom", {
                        detail: { from_email: sender.from_email, from_name: sender.from_name },
                      })
                    )
                  }}
                  onSendEmail={(sender) => {
                    window.dispatchEvent(
                      new CustomEvent("compose:openWith", {
                        detail: { to: sender.from_email, toName: sender.from_name },
                      })
                    )
                  }}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
