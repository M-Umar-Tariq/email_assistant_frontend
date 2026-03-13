"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
        "group flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 transition-all duration-200",
        "hover:bg-muted/50 hover:shadow-sm",
        index === 0 && "mt-0"
      )}
    >
      {onToggleSelect && (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggleSelect(sender, checked === true)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />
      )}
      <button
        type="button"
        onClick={() => onContactClick?.(sender)}
        className="flex min-w-0 flex-1 items-center gap-3.5 text-left cursor-pointer"
      >
        <Avatar className="h-9 w-9 shrink-0 shadow-sm">
          <AvatarFallback
            className={cn(
              "bg-gradient-to-br text-white text-[11px] font-semibold",
              gradient
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate leading-tight">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
            {sender.from_email}
          </p>
          {lastReceived && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Last received: {lastReceived}
            </p>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground font-medium tabular-nums">
                <Mail className="h-3 w-3" />
                {sender.count}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">{sender.count} email{sender.count !== 1 ? "s" : ""} received — click to view in inbox</p>
          </TooltipContent>
        </Tooltip>
      </button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation()
              onSendEmail?.(sender)
            }}
          >
            <Send className="h-3.5 w-3.5" />
            Send email
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">Open Compose with this contact&apos;s email</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

const CONTACTS_PAGE_SIZE = 50

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
    <Card className="border-border/50 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        {icon}
        <span className="text-sm font-semibold text-foreground flex-1 truncate">{title}</span>
        <Badge
          variant="secondary"
          className="text-[10px] font-semibold tabular-nums px-2 py-0.5"
        >
          {searchQuery ? filtered.length : totalContacts}
        </Badge>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground/60 transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>

      {open && (
        <CardContent className="px-2 pb-2 pt-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/60">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-xs">No contacts in this mailbox</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/30">
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
                    className="text-xs text-muted-foreground hover:text-foreground"
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

export function ContactsView({ onAddMailboxClick }: { onAddMailboxClick?: () => void } = {}) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [allSenders, setAllSenders] = useState<UniqueSendersApi | null>(null)
  const [byMailbox, setByMailbox] = useState<MailboxSenders[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [sectionVisibleCount, setSectionVisibleCount] = useState<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
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
    } catch {
      setAllSenders(null)
      setByMailbox([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
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
                className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: (m.color || "#6366f1") + "22" }}
              >
                <div
                  className="h-3 w-3 rounded-full"
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
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border/80 bg-gradient-to-r from-background via-background to-primary/[0.02]">
          <div className="px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">Contacts</h1>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {allSenders?.unique_senders_count ?? 0} people across {mailboxes.length} mailbox{mailboxes.length !== 1 ? "es" : ""}
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
                <Input
                  placeholder="Search contacts…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 h-10 rounded-xl bg-muted/40 border border-border/60 text-foreground placeholder:text-muted-foreground/50 text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all duration-200 shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Total contacts stat */}
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 px-3.5 py-2 w-fit">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="text-sm font-bold tabular-nums">{allSenders?.unique_senders_count ?? 0}</span>
              <span className="text-[10px] font-medium opacity-70">Total contacts</span>
            </div>
          </div>

          {/* Tabs: All | By Mailbox (dropdown) */}
          <div className="px-5 pb-3 flex items-center gap-1.5">
            <Button
              variant={activeTab === "all" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "text-xs h-8 rounded-lg gap-1.5 transition-all duration-200 shrink-0",
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
                    "text-xs h-8 rounded-lg gap-1.5 transition-all duration-200 shrink-0",
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

        {/* Send to selected bar */}
        {selectedEmails.size > 0 && (
          <div className="border-b border-border/60 bg-primary/5 px-5 py-2.5 flex items-center justify-between gap-3">
            <span className="text-sm text-foreground font-medium">
              {selectedEmails.size} contact{selectedEmails.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedEmails(new Set())}>
                Clear
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={handleSendToSelected}>
                <Send className="h-3.5 w-3.5" />
                Send email to selected
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4 pb-10 max-w-3xl mx-auto w-full">
            {mailboxes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                  <MailboxIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">No contacts yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                  Connect a mailbox to see people who have emailed you here.
                </p>
                {onAddMailboxClick && (
                  <Button size="sm" className="mt-4 gap-2" onClick={onAddMailboxClick}>
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
