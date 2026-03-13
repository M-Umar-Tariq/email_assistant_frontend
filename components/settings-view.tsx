"use client"

import { useState, useEffect } from "react"
import {
  Mail,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,

  ChevronDown,
  Clock,
  History,
  Brain,
  Sun,
  Moon,
  Monitor,
  Settings,
  Palette,
  Lock,
  Inbox,
  AlertTriangle,
  Sparkles,
  User,
  MessageSquare,
  Briefcase,
  Users,
  Zap,
  Database,
  ShieldCheck,
  KeyRound,
  Eye,
  Bell,
  BellRing,
  Tag,
  ListCollapse,
  CalendarRange,
  FileText,
  Download,
  UserCircle,
  AtSign,
  Keyboard,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  mailboxes as mailboxesApi,
  emails as emailsApi,
  agent as agentApi,
  settingsApi,
  auth,
  type AgentProfile,
  type SettingsApi,
} from "@/lib/api"
import { mapMailboxApi } from "@/lib/mappers"
import type { Mailbox } from "@/lib/mock-data"

const providerIcons: Record<string, string> = {
  gmail: "Google",
  outlook: "Microsoft",
  imap: "IMAP",
}

const FETCH_MORE_OPTIONS = [
  { label: "Last 100 emails", value: "100" },
  { label: "Last 500 emails", value: "500" },
  { label: "Last 1,000 emails", value: "1000" },
  { label: "Last 5,000 emails", value: "5000" },
  { label: "All emails", value: "all" },
] as const

const providerColors: Record<string, string> = {
  gmail: "from-red-500/20 to-orange-500/20",
  outlook: "from-blue-500/20 to-cyan-500/20",
  imap: "from-violet-500/20 to-purple-500/20",
}

const providerBorderColors: Record<string, string> = {
  gmail: "border-red-500/20",
  outlook: "border-blue-500/20",
  imap: "border-violet-500/20",
}

export function SettingsView({
  onAddMailboxClick,
  mailboxListKey = 0,
}: {
  onAddMailboxClick?: () => void
  mailboxListKey?: number
} = {}) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingAll, setDeletingAll] = useState(false)
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileBuilding, setProfileBuilding] = useState(false)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const { theme, setTheme } = useTheme()

  const [userSettings, setUserSettings] = useState<SettingsApi | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<{ id: string; email: string; name: string; timezone?: string } | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    mailboxesApi.list()
      .then((mbs) => setMailboxes(mbs.map(mapMailboxApi)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mailboxListKey])

  useEffect(() => {
    setProfileLoading(true)
    agentApi.profile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [])

  useEffect(() => {
    settingsApi.get()
      .then(setUserSettings)
      .catch(() => {})
      .finally(() => setSettingsLoading(false))
  }, [])

  useEffect(() => {
    auth.me()
      .then(setUserProfile)
      .catch(() => {})
  }, [])

  const handleSettingToggle = (key: keyof Omit<SettingsApi, "user_id" | "sync_range_months">, value: boolean) => {
    setUserSettings((prev) => prev ? { ...prev, [key]: value } : prev)
    settingsApi.update({ [key]: value })
      .then(setUserSettings)
      .catch(() => {
        setUserSettings((prev) => prev ? { ...prev, [key]: !value } : prev)
        toast.error("Failed to update setting")
      })
  }

  const handleSyncRangeChange = (value: string) => {
    const months = parseInt(value, 10)
    setUserSettings((prev) => prev ? { ...prev, sync_range_months: months } : prev)
    settingsApi.update({ sync_range_months: months })
      .then(setUserSettings)
      .catch(() => toast.error("Failed to update sync range"))
  }

  const handleExportData = () => {
    setExporting(true)
    emailsApi.list({ limit: 999999 })
      .then((emails) => {
        const blob = new Blob([JSON.stringify(emails, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `mailmind-export-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("Data exported successfully")
      })
      .catch(() => toast.error("Failed to export data"))
      .finally(() => setExporting(false))
  }

  useEffect(() => {
    const onMailboxUpdated = () => {
      mailboxesApi.list().then((mbs) => setMailboxes(mbs.map(mapMailboxApi))).catch(() => {})
    }
    window.addEventListener("mailbox:updated", onMailboxUpdated)
    return () => window.removeEventListener("mailbox:updated", onMailboxUpdated)
  }, [])

  const handleSync = (mb: Mailbox) => {
    setSyncingIds((prev) => new Set(prev).add(mb.id))
    mailboxesApi
      .sync(mb.id)
      .then((res) => {
        setMailboxes((prev) =>
          prev.map((m) =>
            m.id === mb.id
              ? { ...m, synced: true, lastSync: new Date().toLocaleString(), totalEmails: res.total }
              : m
          )
        )
        const msg =
          res.total_fetched === 0
            ? `No new emails. Total: ${res.total}`
            : `Fetched ${res.total_fetched}, synced ${res.synced} new. Total: ${res.total} emails`
        toast.success(msg)
      })
      .catch((err: Error) => {
        toast.error(err?.message ?? "Sync failed")
        setMailboxes((prev) =>
          prev.map((m) =>
            m.id === mb.id ? { ...m, synced: false, syncStatus: "error" } : m
          )
        )
      })
      .finally(() => {
        setSyncingIds((prev) => {
          const next = new Set(prev)
          next.delete(mb.id)
          return next
        })
      })
  }

  const handleFetchMore = (mb: Mailbox, optValue: string) => {
    const options =
      optValue === "all"
        ? { initial_sync: "all" as const }
        : { initial_sync: "last_n" as const, limit: parseInt(optValue, 10) }
    toast.info("Fetching more past emails in background…")
    setSyncingIds((prev) => new Set(prev).add(mb.id))
    mailboxesApi
      .sync(mb.id, options)
      .then((res) => {
        setMailboxes((prev) =>
          prev.map((m) =>
            m.id === mb.id
              ? { ...m, synced: true, lastSync: new Date().toLocaleString(), totalEmails: res.total }
              : m
          )
        )
        toast.success(`Done. Synced ${res.synced} new. Total: ${res.total} emails`)
      })
      .catch((err: Error) => {
        toast.error(err?.message ?? "Fetch more failed")
        setMailboxes((prev) =>
          prev.map((m) =>
            m.id === mb.id ? { ...m, synced: false, syncStatus: "error" } : m
          )
        )
      })
      .finally(() => {
        setSyncingIds((prev) => {
          const next = new Set(prev)
          next.delete(mb.id)
          return next
        })
      })
  }

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border px-8 py-6">
          <div className="flex items-center gap-4 max-w-5xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your mailboxes, preferences, and integrations</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading settings...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-8 max-w-5xl">
              <Tabs defaultValue="mailboxes">
                <TabsList className="bg-muted/50 border border-border p-1 mb-8 h-auto gap-1">
                  <TabsTrigger
                    value="mailboxes"
                    className="text-sm gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                  >
                    <Inbox className="h-4 w-4" />
                    Mailboxes
                  </TabsTrigger>
                  <TabsTrigger
                    value="notifications"
                    className="text-sm gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                  >
                    <Bell className="h-4 w-4" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger
                    value="ai"
                    className="text-sm gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Settings
                  </TabsTrigger>
                  <TabsTrigger
                    value="account"
                    className="text-sm gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                  >
                    <UserCircle className="h-4 w-4" />
                    Account
                  </TabsTrigger>
                  <TabsTrigger
                    value="appearance"
                    className="text-sm gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                  >
                    <Palette className="h-4 w-4" />
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger
                    value="security"
                    className="text-sm gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                  >
                    <Lock className="h-4 w-4" />
                    Security
                  </TabsTrigger>
                </TabsList>

                {/* ────── Mailboxes Tab ────── */}
                <TabsContent value="mailboxes" className="animate-fade-in-up flex flex-col gap-6">
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Mail className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold text-foreground">Connected Mailboxes</CardTitle>
                            <CardDescription className="text-sm text-muted-foreground">
                              {mailboxes.length} mailbox{mailboxes.length !== 1 ? "es" : ""} connected
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-sm"
                          onClick={onAddMailboxClick}
                        >
                          <Plus className="h-4 w-4" />
                          Add Mailbox
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {mailboxes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                            <Inbox className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">No mailboxes connected yet</p>
                          <Button size="sm" variant="outline" className="gap-2" onClick={onAddMailboxClick}>
                            <Plus className="h-4 w-4" />
                            Connect your first mailbox
                          </Button>
                        </div>
                      )}
                      {mailboxes.map((mb, idx) => (
                        <div
                          key={mb.id}
                          className="group relative flex items-center justify-between rounded-xl border border-border hover:border-primary/20 p-4 transition-all duration-200 hover:shadow-md hover:bg-accent/30"
                          style={{ animationDelay: `${idx * 60}ms` }}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${providerColors[mb.provider] || "from-gray-500/20 to-gray-400/20"} ring-1 ring-black/5 dark:ring-white/5`}>
                              <Mail className="h-5 w-5" style={{ color: mb.color }} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2.5">
                                <p className="text-sm font-semibold text-foreground">{mb.name}</p>
                                <Badge variant="outline" className="text-[10px] font-medium border-border text-muted-foreground px-2 py-0">
                                  {providerIcons[mb.provider]}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{mb.email}</p>
                              {mb.totalEmails != null && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Database className="h-3 w-3 text-muted-foreground/60" />
                                  <p className="text-[11px] text-muted-foreground">
                                    {mb.totalEmails.toLocaleString()} email{mb.totalEmails !== 1 ? "s" : ""} stored
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Sync status */}
                            <div className="flex items-center gap-2 mr-2">
                              {mb.syncStatus === "synced" ? (
                                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                  </span>
                                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Synced</span>
                                </div>
                              ) : mb.syncStatus === "error" ? (
                                <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1">
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Error</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs font-medium text-muted-foreground">Pending</span>
                                </div>
                              )}
                            </div>

                            {mb.lastSync && (
                              <span className="text-[11px] text-muted-foreground hidden sm:block">{mb.lastSync}</span>
                            )}

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  disabled={syncingIds.has(mb.id)}
                                  onClick={() => handleSync(mb)}
                                >
                                  <RefreshCw className={`h-4 w-4 ${syncingIds.has(mb.id) ? "animate-spin" : ""}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom"><p>Sync now</p></TooltipContent>
                            </Tooltip>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <History className="h-3.5 w-3.5" />
                                  Fetch more
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[180px]">
                                {FETCH_MORE_OPTIONS.map((opt) => (
                                  <DropdownMenuItem
                                    key={opt.value}
                                    className="text-foreground cursor-pointer"
                                    onClick={() => handleFetchMore(mb, opt.value)}
                                  >
                                    {opt.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom"><p>Remove mailbox</p></TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ────── Notifications & Preferences Tab ────── */}
                <TabsContent value="notifications" className="animate-fade-in-up flex flex-col gap-6">
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/10">
                          <BellRing className="h-4.5 w-4.5 text-amber-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">Notifications & Alerts</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            Choose what notifications and alerts you want to receive
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      {settingsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between rounded-xl p-4 hover:bg-accent/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                                <FileText className="h-5 w-5 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">Daily Briefing</p>
                                <p className="text-xs text-muted-foreground">Get a daily summary of your inbox activity</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.daily_briefing ?? true}
                              onCheckedChange={(v) => handleSettingToggle("daily_briefing", v)}
                            />
                          </div>
                          <Separator />

                          <div className="flex items-center justify-between rounded-xl p-4 hover:bg-accent/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">Critical Alerts</p>
                                <p className="text-xs text-muted-foreground">Get notified about urgent and high-priority emails</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.critical_alerts ?? true}
                              onCheckedChange={(v) => handleSettingToggle("critical_alerts", v)}
                            />
                          </div>
                          <Separator />

                          <div className="flex items-center justify-between rounded-xl p-4 hover:bg-accent/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                                <MessageSquare className="h-5 w-5 text-violet-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">Slack Digest</p>
                                <p className="text-xs text-muted-foreground">Receive inbox digest via Slack integration</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.slack_digest ?? false}
                              onCheckedChange={(v) => handleSettingToggle("slack_digest", v)}
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10">
                          <Sparkles className="h-4.5 w-4.5 text-cyan-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">AI Features</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            Control how the AI assistant works with your emails
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      {settingsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between rounded-xl p-4 hover:bg-accent/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                                <Sparkles className="h-5 w-5 text-purple-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">AI Suggestions</p>
                                <p className="text-xs text-muted-foreground">Smart reply suggestions and action recommendations</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.ai_suggestions ?? true}
                              onCheckedChange={(v) => handleSettingToggle("ai_suggestions", v)}
                            />
                          </div>
                          <Separator />

                          <div className="flex items-center justify-between rounded-xl p-4 hover:bg-accent/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                                <Tag className="h-5 w-5 text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">Auto Labeling</p>
                                <p className="text-xs text-muted-foreground">Automatically categorize and label incoming emails</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.auto_labeling ?? true}
                              onCheckedChange={(v) => handleSettingToggle("auto_labeling", v)}
                            />
                          </div>
                          <Separator />

                          <div className="flex items-center justify-between rounded-xl p-4 hover:bg-accent/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
                                <ListCollapse className="h-5 w-5 text-teal-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">Thread Summaries</p>
                                <p className="text-xs text-muted-foreground">Auto-generate summaries for long email threads</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.thread_summaries ?? true}
                              onCheckedChange={(v) => handleSettingToggle("thread_summaries", v)}
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/10">
                          <CalendarRange className="h-4.5 w-4.5 text-indigo-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">Sync Preferences</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            Configure how far back your emails are synced
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between rounded-xl p-4 hover:bg-accent/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                            <History className="h-5 w-5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Sync Range</p>
                            <p className="text-xs text-muted-foreground">How many months of email history to sync</p>
                          </div>
                        </div>
                        <Select
                          value={String(userSettings?.sync_range_months ?? 12)}
                          onValueChange={handleSyncRangeChange}
                        >
                          <SelectTrigger className="w-[140px] h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 month</SelectItem>
                            <SelectItem value="3">3 months</SelectItem>
                            <SelectItem value="6">6 months</SelectItem>
                            <SelectItem value="12">12 months</SelectItem>
                            <SelectItem value="24">24 months</SelectItem>
                            <SelectItem value="36">3 years</SelectItem>
                            <SelectItem value="60">5 years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ────── AI Settings Tab ────── */}
                <TabsContent value="ai" className="animate-fade-in-up flex flex-col gap-6">
                  <Card className="bg-card border-border shadow-sm overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10">
                            <Brain className="h-4.5 w-4.5 text-violet-500" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold text-foreground">
                              AI Personality Profile
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground">
                              What the AI has learned about you from your emails
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!profile && !profileLoading && (
                            <Button
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setProfileLoading(true)
                                agentApi.profile()
                                  .then(setProfile)
                                  .catch(() => {})
                                  .finally(() => setProfileLoading(false))
                              }}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              Load Profile
                            </Button>
                          )}
                          {profile && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={profileBuilding}
                              onClick={() => {
                                setProfileBuilding(true)
                                agentApi.buildProfile()
                                  .then(setProfile)
                                  .catch(() => toast.error("Failed to rebuild profile"))
                                  .finally(() => setProfileBuilding(false))
                              }}
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${profileBuilding ? "animate-spin" : ""}`} />
                              Rebuild Profile
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {profileLoading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <div className="relative">
                            <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                            <Brain className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <p className="text-sm text-muted-foreground">Analyzing your communication patterns...</p>
                        </div>
                      )}
                      {!profile && !profileLoading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                            <Brain className="h-7 w-7 text-violet-500/60" />
                          </div>
                          <p className="text-sm text-muted-foreground text-center">
                            Click &quot;Load Profile&quot; to see what the AI has learned from your emails
                          </p>
                        </div>
                      )}
                      {profile && profile.email_count_analyzed > 0 && (
                        <div className="flex flex-col gap-5">
                          <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            <p className="text-xs text-muted-foreground">
                              Profile built from <strong className="text-foreground">{profile.email_count_analyzed.toLocaleString()}</strong> analyzed emails
                            </p>
                          </div>

                          {profile.personality_traits.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium text-foreground mb-2.5 block flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                Personality Traits
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {profile.personality_traits.map((t) => (
                                  <Badge key={t} variant="secondary" className="text-xs px-3 py-1 font-medium">{t}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                                  <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                                </div>
                                <p className="text-sm font-medium text-foreground">Communication Style</p>
                              </div>
                              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                                <div className="flex justify-between items-center">
                                  <span>Tone</span>
                                  <span className="text-foreground font-medium">{profile.communication_style.tone}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                  <span>Formality</span>
                                  <span className="text-foreground font-medium">{profile.communication_style.formality}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                  <span>Avg. Length</span>
                                  <span className="text-foreground font-medium">{profile.communication_style.avg_length}</span>
                                </div>
                                {profile.communication_style.greeting_pattern && (
                                  <>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                      <span>Greeting</span>
                                      <span className="text-foreground font-medium">{profile.communication_style.greeting_pattern}</span>
                                    </div>
                                  </>
                                )}
                                {profile.communication_style.sign_off_pattern && (
                                  <>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                      <span>Sign-off</span>
                                      <span className="text-foreground font-medium">{profile.communication_style.sign_off_pattern}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
                                  <Briefcase className="h-3.5 w-3.5 text-amber-500" />
                                </div>
                                <p className="text-sm font-medium text-foreground">Work Patterns</p>
                              </div>
                              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                                <div className="flex justify-between items-center">
                                  <span>Peak Hours</span>
                                  <span className="text-foreground font-medium">{profile.work_patterns.peak_hours}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                  <span>Priorities</span>
                                  <span className="text-foreground font-medium text-right max-w-[60%]">{profile.work_patterns.priorities}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                  <span>Style</span>
                                  <span className="text-foreground font-medium">{profile.work_patterns.communication_style}</span>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                                  <Zap className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                                <p className="text-sm font-medium text-foreground">Response Preferences</p>
                              </div>
                              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                                <div className="flex justify-between items-center">
                                  <span>Urgency</span>
                                  <span className="text-foreground font-medium">{profile.response_preferences.urgency_handling}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                  <span>Delegation</span>
                                  <span className="text-foreground font-medium">{profile.response_preferences.delegation_style}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                  <span>Follow-up</span>
                                  <span className="text-foreground font-medium">{profile.response_preferences.follow_up_pattern}</span>
                                </div>
                              </div>
                            </div>

                            {profile.key_contacts.length > 0 && (
                              <div className="rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/10">
                                    <Users className="h-3.5 w-3.5 text-pink-500" />
                                  </div>
                                  <p className="text-sm font-medium text-foreground">Key Contacts</p>
                                </div>
                                <div className="flex flex-col gap-2.5">
                                  {profile.key_contacts.slice(0, 5).map((c) => (
                                    <div key={c.email} className="flex items-center gap-2.5 text-xs">
                                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                                        <span className="text-[9px] font-bold text-primary">{(c.name || c.email).slice(0, 2).toUpperCase()}</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-foreground font-medium">{c.name || c.email}</span>
                                        <span className="text-[11px] text-muted-foreground">{c.relationship} &middot; {c.interaction_frequency}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {profile.topics_and_interests.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium text-foreground mb-2.5 block flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                                Topics & Interests
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {profile.topics_and_interests.map((t) => (
                                  <Badge key={t} variant="outline" className="text-xs px-3 py-1">{t}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {profile && profile.email_count_analyzed === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
                            <AlertTriangle className="h-7 w-7 text-amber-500/60" />
                          </div>
                          <p className="text-sm text-muted-foreground text-center">
                            No emails analyzed yet. Sync a mailbox first, then rebuild the profile.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ────── Account Tab ────── */}
                <TabsContent value="account" className="animate-fade-in-up flex flex-col gap-6">
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/10">
                          <UserCircle className="h-4.5 w-4.5 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">Profile Information</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            Your account details and preferences
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      {userProfile ? (
                        <>
                          <div className="flex items-center gap-5 rounded-xl border border-border p-5">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 shrink-0">
                              <span className="text-lg font-bold text-primary">
                                {(userProfile.name || userProfile.email).slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <p className="text-lg font-semibold text-foreground truncate">{userProfile.name || "—"}</p>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <AtSign className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{userProfile.email}</span>
                              </div>
                              {userProfile.timezone && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5 shrink-0" />
                                  <span>{userProfile.timezone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-border p-4 text-center hover:shadow-sm transition-shadow">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-2">
                                <Inbox className="h-5 w-5 text-primary" />
                              </div>
                              <p className="text-2xl font-bold text-foreground">{mailboxes.length}</p>
                              <p className="text-xs text-muted-foreground">Connected Mailboxes</p>
                            </div>
                            <div className="rounded-xl border border-border p-4 text-center hover:shadow-sm transition-shadow">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 mx-auto mb-2">
                                <Mail className="h-5 w-5 text-emerald-500" />
                              </div>
                              <p className="text-2xl font-bold text-foreground">
                                {mailboxes.reduce((sum, m) => sum + (m.totalEmails ?? 0), 0).toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">Total Emails</p>
                            </div>
                            <div className="rounded-xl border border-border p-4 text-center hover:shadow-sm transition-shadow">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 mx-auto mb-2">
                                <ShieldCheck className="h-5 w-5 text-amber-500" />
                              </div>
                              <p className="text-2xl font-bold text-foreground">Active</p>
                              <p className="text-xs text-muted-foreground">Account Status</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/10">
                          <Download className="h-4.5 w-4.5 text-emerald-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">Data & Export</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            Download or manage your email data
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-accent/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                            <Download className="h-5 w-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Export Emails</p>
                            <p className="text-xs text-muted-foreground">Download all your synced email data as JSON</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 shrink-0"
                          disabled={exporting}
                          onClick={handleExportData}
                        >
                          {exporting ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          {exporting ? "Exporting..." : "Export"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500/20 to-gray-500/10">
                          <Keyboard className="h-4.5 w-4.5 text-slate-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">Keyboard Shortcuts</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            Quick actions to boost your productivity
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { keys: ["Ctrl", "K"], action: "Search emails" },
                          { keys: ["Ctrl", "N"], action: "Compose new email" },
                          { keys: ["Ctrl", "Enter"], action: "Send email" },
                          { keys: ["R"], action: "Reply to email" },
                          { keys: ["F"], action: "Forward email" },
                          { keys: ["E"], action: "Archive email" },
                          { keys: ["#"], action: "Trash email" },
                          { keys: ["S"], action: "Star / Unstar" },
                          { keys: ["U"], action: "Mark as unread" },
                          { keys: ["?"], action: "Show shortcuts" },
                        ].map(({ keys, action }) => (
                          <div key={action} className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 hover:bg-accent/30 transition-colors">
                            <span className="text-sm text-muted-foreground">{action}</span>
                            <div className="flex items-center gap-1">
                              {keys.map((key) => (
                                <kbd
                                  key={key}
                                  className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-border bg-muted px-1.5 text-[11px] font-medium text-muted-foreground shadow-sm"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ────── Appearance Tab ────── */}
                <TabsContent value="appearance" className="animate-fade-in-up flex flex-col gap-6">
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/20 to-orange-500/10">
                          <Palette className="h-4.5 w-4.5 text-pink-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">Theme</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            Customize the look and feel of the application
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          {
                            value: "light",
                            label: "Light",
                            icon: Sun,
                            desc: "Clean and bright",
                            gradient: "from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10",
                            iconColor: "text-amber-500",
                            bgPreview: "bg-white",
                            barColors: ["bg-gray-200", "bg-gray-100", "bg-gray-200"],
                          },
                          {
                            value: "dark",
                            label: "Dark",
                            icon: Moon,
                            desc: "Easy on the eyes",
                            gradient: "from-slate-100 to-indigo-50 dark:from-slate-500/10 dark:to-indigo-500/10",
                            iconColor: "text-indigo-500",
                            bgPreview: "bg-gray-900",
                            barColors: ["bg-gray-700", "bg-gray-800", "bg-gray-700"],
                          },
                          {
                            value: "system",
                            label: "System",
                            icon: Monitor,
                            desc: "Match your OS",
                            gradient: "from-cyan-50 to-teal-50 dark:from-cyan-500/10 dark:to-teal-500/10",
                            iconColor: "text-cyan-500",
                            bgPreview: "bg-gradient-to-r from-white to-gray-900",
                            barColors: ["bg-gray-300", "bg-gray-500", "bg-gray-700"],
                          },
                        ].map(({ value, label, icon: Icon, desc, gradient, iconColor, bgPreview, barColors }) => (
                          <button
                            key={value}
                            onClick={() => setTheme(value)}
                            className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all duration-200 hover:shadow-md ${
                              theme === value
                                ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                                : "border-border hover:border-primary/30 bg-card"
                            }`}
                          >
                            {theme === value && (
                              <div className="absolute top-2.5 right-2.5">
                                <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                              </div>
                            )}
                            <div className={`w-full aspect-[16/10] rounded-lg ${bgPreview} p-3 flex flex-col gap-1.5 ring-1 ring-black/5 dark:ring-white/10`}>
                              {barColors.map((c, i) => (
                                <div key={i} className={`h-2 rounded-full ${c} ${i === 1 ? "w-3/4" : i === 2 ? "w-1/2" : "w-full"}`} />
                              ))}
                            </div>
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}>
                              <Icon className={`h-5 w-5 ${iconColor}`} />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-semibold text-foreground">{label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ────── Security Tab ────── */}
                <TabsContent value="security" className="animate-fade-in-up flex flex-col gap-6">
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10">
                          <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">Security & Privacy</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            Data protection and access controls
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                            <Lock className="h-5 w-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">End-to-End Encryption</p>
                            <p className="text-xs text-muted-foreground">All data encrypted at rest and in transit</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
                          Active
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-border p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                            <KeyRound className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Secure Authentication</p>
                            <p className="text-xs text-muted-foreground">Token-based session management</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/10">
                          Active
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-border p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                            <Eye className="h-5 w-5 text-violet-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Privacy Controls</p>
                            <p className="text-xs text-muted-foreground">Your email data never leaves your account</p>
                          </div>
                        </div>
                        <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/10">
                          Active
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-red-500/20 shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                          <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            These actions are irreversible. Please proceed with caution.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex items-center justify-between rounded-xl border border-red-500/10 p-4 hover:bg-red-500/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                            <Trash2 className="h-5 w-5 text-red-500/70" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Delete all emails</p>
                            <p className="text-xs text-muted-foreground max-w-md">
                              Remove all synced emails from this dashboard. Mailboxes stay connected.
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all shrink-0"
                          disabled={deletingAll}
                          onClick={() => {
                            if (!window.confirm("Delete all emails from this dashboard? This cannot be undone. Mailboxes will remain connected.")) return
                            setDeletingAll(true)
                            emailsApi
                              .deleteAll()
                              .then((res) => {
                                toast.success(`Deleted ${res.deleted} email(s).`)
                                setMailboxes((prev) => prev.map((m) => ({ ...m, totalEmails: 0 })))
                              })
                              .catch((err: Error) => toast.error(err?.message ?? "Failed to delete emails"))
                              .finally(() => setDeletingAll(false))
                          }}
                        >
                          {deletingAll ? (
                            <span className="flex items-center gap-2">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Deleting...
                            </span>
                          ) : "Delete All Emails"}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-red-500/10 p-4 hover:bg-red-500/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                            <XCircle className="h-5 w-5 text-red-500/70" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Delete account</p>
                            <p className="text-xs text-muted-foreground max-w-md">
                              Permanently delete your MailMind account and all associated data
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all shrink-0">
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </div>
    </TooltipProvider>
  )
}
