"use client"

import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import {
  LayoutDashboard,
  Inbox,
  PenSquare,
  BarChart3,
  Settings,
  Mail,
  Circle,
  Plus,
  LogOut,
  Clock,
  Mic,
  Loader2,
  Trash2,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react"
import { useTheme } from "next-themes"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { mailboxes as mailboxesApi, briefing } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { mapMailboxApi } from "@/lib/mappers"
import type { Mailbox } from "@/lib/mock-data"
import { toast } from "sonner"

function EditMailboxDialog({
  mailbox,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  mailbox: Mailbox
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(mailbox.name)
  const [color, setColor] = useState(mailbox.color)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")
  const [syncingNow, setSyncingNow] = useState(false)

  useEffect(() => {
    if (open) {
      setName(mailbox.name)
      setColor(mailbox.color)
      setError("")
      setConfirmDelete(false)
    }
  }, [open, mailbox])

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setError("Name is required"); return }
    setSaving(true)
    setError("")
    try {
      await mailboxesApi.update(mailbox.id, { name: name.trim(), color })
      onSaved()
      window.dispatchEvent(new CustomEvent("mailbox:updated"))
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message || "Failed to update mailbox")
    } finally {
      setSaving(false)
    }
  }, [name, color, mailbox.id, onSaved, onOpenChange])

  const handleSyncNow = useCallback(async () => {
    setSyncingNow(true)
    const toastId = toast.loading(`Syncing ${mailbox.name}...`, { duration: Infinity })
    try {
      if (mailbox.syncStatus === "syncing") {
        await mailboxesApi.stopSync(mailbox.id).catch(() => { })
      }
      const res = await mailboxesApi.sync(mailbox.id, { initial_sync: "last_n", limit: 50 })
      toast.success(`Sync completed! ${res.synced} emails fetched.`, { id: toastId, duration: 4000 })
      onSaved()
      window.dispatchEvent(new CustomEvent("mailbox:sync-complete"))
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message || "Sync failed", { id: toastId })
    } finally {
      setSyncingNow(false)
    }
  }, [mailbox.id, mailbox.name, mailbox.syncStatus, onSaved, onOpenChange])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    setError("")
    try {
      await mailboxesApi.delete(mailbox.id)
      onDeleted()
      window.dispatchEvent(new CustomEvent("mailbox:updated"))
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message || "Failed to delete mailbox")
    } finally {
      setDeleting(false)
    }
  }, [mailbox.id, onDeleted, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Mailbox</DialogTitle>
          <DialogDescription>{mailbox.email}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-mb-name">Name</Label>
            <Input
              id="edit-mb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work, Personal"
            />
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="edit-mb-color" className="shrink-0">Color</Label>
            <input
              id="edit-mb-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-border bg-background"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="flex flex-wrap gap-2 sm:flex-row sm:justify-between min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            {!confirmDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-1.5"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm delete
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleSyncNow} disabled={syncingNow || saving}>
              {syncingNow && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {mailbox.syncStatus === "syncing" ? "Force Sync" : "Sync Now"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (confirmDelete ? setConfirmDelete(false) : onOpenChange(false))}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const navItems = [
  { id: "dashboard", label: "Daily Briefing", icon: LayoutDashboard },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "followups", label: "Follow-ups", icon: Clock },
  { id: "agent", label: "Voice Agent", icon: Mic },
  { id: "assistant", label: "AI Assistant", icon: Sparkles },
  { id: "compose", label: "Compose", icon: PenSquare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
]

export function AppSidebar({
  activeView,
  onViewChange,
  onAddMailboxClick,
  mailboxListKey = 0,
}: {
  activeView: string
  onViewChange: (view: string) => void
  onAddMailboxClick?: () => void
  mailboxListKey?: number
}) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [badges, setBadges] = useState({ unread: 0, followUps: 0 })
  const [editingMailbox, setEditingMailbox] = useState<Mailbox | null>(null)

  const refreshMailboxes = useCallback(() => {
    mailboxesApi.list().then((list) => setMailboxes(list.map(mapMailboxApi))).catch(() => { })
  }, [])

  useEffect(() => {
    mailboxesApi.list().then((list) => setMailboxes(list.map(mapMailboxApi))).catch(() => { })
    briefing.get().then((b) => setBadges({
      unread: b.stats.unread_total,
      followUps: b.stats.overdue_follow_ups + b.stats.pending_follow_ups,
    })).catch(() => { })
  }, [mailboxListKey])

  useEffect(() => {
    const onEmailRead = (e: Event) => {
      const mailboxId = (e as CustomEvent).detail?.mailboxId
      setBadges((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }))
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
      briefing.get().then((b) => setBadges((prev) => ({
        ...prev,
        unread: b.stats.unread_total,
      }))).catch(() => { })
    }
    window.addEventListener("email:read", onEmailRead)
    window.addEventListener("email:sync", onEmailSync)
    window.addEventListener("mailbox:sync-complete", onMailboxSyncComplete)
    return () => {
      window.removeEventListener("email:read", onEmailRead)
      window.removeEventListener("email:sync", onEmailSync)
      window.removeEventListener("mailbox:sync-complete", onMailboxSyncComplete)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll mailboxes if any is syncing
  useEffect(() => {
    const hasSyncing = mailboxes.some(mb => mb.syncStatus === "syncing")
    if (!hasSyncing) return
    const interval = setInterval(() => {
      refreshMailboxes()
    }, 5000)
    return () => clearInterval(interval)
  }, [mailboxes, refreshMailboxes])

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Mail className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">MailMind</span>
            <span className="text-xs text-muted-foreground">AI Email Assistant</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) => item.id !== "followups" || mailboxes.length > 0)
                .map((item) => {
                const badge =
                  item.id === "inbox" ? badges.unread : item.id === "followups" ? badges.followUps : null
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeView === item.id}
                      onClick={() => onViewChange(item.id)}
                      tooltip={item.label}
                      className="transition-colors"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {badge != null && badge > 0 && (
                      <SidebarMenuBadge className="bg-primary/10 text-primary text-xs font-medium rounded-md">
                        {badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Mailboxes
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mailboxes.map((mb) => {
                const isSyncing = mb.syncStatus === "syncing"
                const isPending = mb.syncStatus === "pending"
                const isError = mb.syncStatus === "error" || mb.syncStatus === "cancelled"
                return (
                  <SidebarMenuItem key={mb.id}>
                    <SidebarMenuButton
                      tooltip={mb.email}
                      className="transition-colors"
                      onClick={() => setEditingMailbox(mb)}
                    >
                      {isSyncing ? (
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
                      ) : isPending ? (
                        <Circle
                          className="h-2.5 w-2.5 shrink-0"
                          fill="transparent"
                          stroke={mb.color}
                        />
                      ) : (
                        <Circle
                          className="h-2.5 w-2.5 shrink-0"
                          fill={isError ? "var(--destructive)" : mb.color}
                          stroke={isError ? "var(--destructive)" : mb.color}
                        />
                      )}
                      <span className="truncate">{mb.name}</span>
                    </SidebarMenuButton>
                    {isSyncing ? (
                      <SidebarMenuBadge className="text-[10px] text-primary animate-pulse">
                        Syncing…
                      </SidebarMenuBadge>
                    ) : isPending ? (
                      <SidebarMenuBadge className="text-[10px] text-muted-foreground pr-1">
                        Pending
                      </SidebarMenuBadge>
                    ) : mb.unread > 0 ? (
                      <SidebarMenuBadge className="text-xs text-muted-foreground">
                        {mb.unread}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={onAddMailboxClick}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add mailbox</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3 space-y-2">
        <div className="flex items-center gap-2 px-2">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
          <span className="text-xs text-muted-foreground">
            {theme === "dark" ? "Dark" : "Light"}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors cursor-pointer">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {user?.name?.slice(0, 2).toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-foreground">{user?.name ?? "User"}</span>
            <span className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</span>
          </div>
          <button
            onClick={() => logout()}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors shrink-0"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>

      {editingMailbox && (
        <EditMailboxDialog
          mailbox={editingMailbox}
          open={!!editingMailbox}
          onOpenChange={(open) => { if (!open) setEditingMailbox(null) }}
          onSaved={refreshMailboxes}
          onDeleted={refreshMailboxes}
        />
      )}
    </Sidebar>
  )
}
