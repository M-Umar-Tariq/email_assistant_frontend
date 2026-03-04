"use client"

import { useState, useEffect } from "react"
import {
  Mail,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Shield,
  Bell,
  Globe,
  Key,
  Zap,
  ChevronRight,
  ChevronDown,
  Clock,
  ExternalLink,
  History,
  Brain,
  Sun,
  Moon,
  Monitor,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { mailboxes as mailboxesApi, settingsApi, emails as emailsApi, agent as agentApi, type AgentProfile } from "@/lib/api"
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

export function SettingsView({
  onAddMailboxClick,
  mailboxListKey = 0,
}: {
  onAddMailboxClick?: () => void
  mailboxListKey?: number
} = {}) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [dailyBriefing, setDailyBriefing] = useState(true)
  const [slackDigest, setSlackDigest] = useState(false)
  const [criticalAlerts, setCriticalAlerts] = useState(true)
  const [aiSuggestions, setAiSuggestions] = useState(true)
  const [autoLabeling, setAutoLabeling] = useState(true)
  const [threadSummaries, setThreadSummaries] = useState(true)
  const [syncRangeMonths, setSyncRangeMonths] = useState(12)
  const [loading, setLoading] = useState(true)
  const [deletingAll, setDeletingAll] = useState(false)
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileBuilding, setProfileBuilding] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    Promise.all([mailboxesApi.list(), settingsApi.get()])
      .then(([mbs, settings]) => {
        setMailboxes(mbs.map(mapMailboxApi))
        setDailyBriefing(settings.daily_briefing)
        setSlackDigest(settings.slack_digest)
        setCriticalAlerts(settings.critical_alerts)
        setAiSuggestions(settings.ai_suggestions)
        setAutoLabeling(settings.auto_labeling)
        setThreadSummaries(settings.thread_summaries)
        setSyncRangeMonths(settings.sync_range_months ?? 12)
      })
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
    const onMailboxUpdated = () => {
      mailboxesApi.list().then((mbs) => setMailboxes(mbs.map(mapMailboxApi))).catch(() => {})
    }
    window.addEventListener("mailbox:updated", onMailboxUpdated)
    return () => window.removeEventListener("mailbox:updated", onMailboxUpdated)
  }, [])

  const updateSetting = (key: keyof Omit<Parameters<typeof settingsApi.update>[0], "user_id">, value: boolean | number) => {
    settingsApi.update({ [key]: value }).catch(() => {})
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage mailboxes, preferences, and integrations</p>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl">
          <Tabs defaultValue="mailboxes">
            <TabsList className="bg-muted border-border mb-6">
              <TabsTrigger value="mailboxes" className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground">
                Mailboxes
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground">
                AI Settings
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground">
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground">
                Security
              </TabsTrigger>
              <TabsTrigger value="appearance" className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground">
                Appearance
              </TabsTrigger>
            </TabsList>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="flex flex-col gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">Theme</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Choose light or dark theme for the app
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "system", label: "System", icon: Monitor },
                    ].map(({ value, label, icon: Icon }) => (
                      <Button
                        key={value}
                        variant={theme === value ? "default" : "outline"}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setTheme(value)}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mailboxes Tab */}
            <TabsContent value="mailboxes" className="flex flex-col gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base text-foreground">Connected Mailboxes</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Manage your email account connections
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                      onClick={onAddMailboxClick}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Mailbox
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {mailboxes.map((mb) => (
                    <div key={mb.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Mail className="h-5 w-5" style={{ color: mb.color }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{mb.name}</p>
                            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                              {providerIcons[mb.provider]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{mb.email}</p>
                          {mb.totalEmails != null && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {mb.totalEmails} email{mb.totalEmails !== 1 ? "s" : ""} stored
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          {mb.syncStatus === "synced" ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Synced</span>
                            </>
                          ) : mb.syncStatus === "error" ? (
                            <>
                              <XCircle className="h-3.5 w-3.5 text-red-400" />
                              <span className="text-red-400">Connection error</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Not synced yet</span>
                            </>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{mb.lastSync}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            mailboxesApi
                              .sync(mb.id)
                              .then((res) => {
                                setMailboxes((prev) =>
                                  prev.map((m) =>
                                    m.id === mb.id
                                      ? {
                                          ...m,
                                          synced: true,
                                          lastSync: new Date().toLocaleString(),
                                          totalEmails: res.total,
                                        }
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
                          }
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
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
                                onClick={() => {
                                  const options =
                                    opt.value === "all"
                                      ? { initial_sync: "all" as const }
                                      : { initial_sync: "last_n" as const, limit: parseInt(opt.value, 10) }
                                  toast.info("Fetching more past emails in background…")
                                  mailboxesApi
                                    .sync(mb.id, options)
                                    .then((res) => {
                                      setMailboxes((prev) =>
                                        prev.map((m) =>
                                          m.id === mb.id
                                            ? {
                                                ...m,
                                                synced: true,
                                                lastSync: new Date().toLocaleString(),
                                                totalEmails: res.total,
                                              }
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
                                }}
                              >
                                {opt.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">Sync Settings</CardTitle>
                  <CardDescription className="text-muted-foreground">Configure what gets synced</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-foreground">Sync range</Label>
                      <p className="text-xs text-muted-foreground">How far back to sync emails</p>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">
                      Last {syncRangeMonths} months
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-foreground">Include attachments</Label>
                      <p className="text-xs text-muted-foreground">Index attachment content for search</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-foreground">Exclude folders</Label>
                      <p className="text-xs text-muted-foreground">Folders to skip during sync</p>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">
                      Spam, Trash, Promotions
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Settings Tab */}
            <TabsContent value="ai" className="flex flex-col gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">AI Features</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Control how AI processes your emails
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">AI Suggestions</Label>
                        <p className="text-xs text-muted-foreground">Reply suggestions and action items</p>
                      </div>
                    </div>
                    <Switch checked={aiSuggestions} onCheckedChange={(v) => { setAiSuggestions(v); updateSetting("ai_suggestions", v) }} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Auto-labeling</Label>
                        <p className="text-xs text-muted-foreground">Automatically categorize incoming emails</p>
                      </div>
                    </div>
                    <Switch checked={autoLabeling} onCheckedChange={(v) => { setAutoLabeling(v); updateSetting("auto_labeling", v) }} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Thread Summaries</Label>
                        <p className="text-xs text-muted-foreground">Auto-generate summaries for long threads</p>
                      </div>
                    </div>
                    <Switch checked={threadSummaries} onCheckedChange={(v) => { setThreadSummaries(v); updateSetting("thread_summaries", v) }} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base text-foreground flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        AI Personality Profile
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        What the AI has learned about you from your emails
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {!profile && !profileLoading && (
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => {
                            setProfileLoading(true)
                            agentApi.profile()
                              .then(setProfile)
                              .catch(() => {})
                              .finally(() => setProfileLoading(false))
                          }}
                        >
                          Load Profile
                        </Button>
                      )}
                      {profile && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          disabled={profileBuilding}
                          onClick={() => {
                            setProfileBuilding(true)
                            agentApi.buildProfile()
                              .then(setProfile)
                              .catch(() => toast.error("Failed to rebuild profile"))
                              .finally(() => setProfileBuilding(false))
                          }}
                        >
                          <RefreshCw className={`h-3 w-3 ${profileBuilding ? "animate-spin" : ""}`} />
                          Rebuild
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {profileLoading && (
                    <div className="flex items-center justify-center py-8 gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-xs text-muted-foreground">Analyzing your emails...</span>
                    </div>
                  )}
                  {!profile && !profileLoading && (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      Click &quot;Load Profile&quot; to see what the AI has learned from your emails.
                    </p>
                  )}
                  {profile && profile.email_count_analyzed > 0 && (
                    <div className="flex flex-col gap-4">
                      <p className="text-[11px] text-muted-foreground">
                        Based on {profile.email_count_analyzed} emails
                      </p>

                      {profile.personality_traits.length > 0 && (
                        <div>
                          <Label className="text-xs font-medium text-foreground mb-1.5 block">Personality Traits</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.personality_traits.map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-xs font-medium text-foreground mb-2">Communication Style</p>
                          <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground">
                            <span><strong className="text-foreground">Tone:</strong> {profile.communication_style.tone}</span>
                            <span><strong className="text-foreground">Formality:</strong> {profile.communication_style.formality}</span>
                            <span><strong className="text-foreground">Length:</strong> {profile.communication_style.avg_length}</span>
                            {profile.communication_style.greeting_pattern && (
                              <span><strong className="text-foreground">Greeting:</strong> {profile.communication_style.greeting_pattern}</span>
                            )}
                            {profile.communication_style.sign_off_pattern && (
                              <span><strong className="text-foreground">Sign-off:</strong> {profile.communication_style.sign_off_pattern}</span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-border p-3">
                          <p className="text-xs font-medium text-foreground mb-2">Work Patterns</p>
                          <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground">
                            <span><strong className="text-foreground">Peak Hours:</strong> {profile.work_patterns.peak_hours}</span>
                            <span><strong className="text-foreground">Priorities:</strong> {profile.work_patterns.priorities}</span>
                            <span><strong className="text-foreground">Style:</strong> {profile.work_patterns.communication_style}</span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border p-3">
                          <p className="text-xs font-medium text-foreground mb-2">Response Preferences</p>
                          <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground">
                            <span><strong className="text-foreground">Urgency:</strong> {profile.response_preferences.urgency_handling}</span>
                            <span><strong className="text-foreground">Delegation:</strong> {profile.response_preferences.delegation_style}</span>
                            <span><strong className="text-foreground">Follow-up:</strong> {profile.response_preferences.follow_up_pattern}</span>
                          </div>
                        </div>

                        {profile.key_contacts.length > 0 && (
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-xs font-medium text-foreground mb-2">Key Contacts</p>
                            <div className="flex flex-col gap-1.5">
                              {profile.key_contacts.slice(0, 5).map((c) => (
                                <div key={c.email} className="flex items-center gap-2 text-[11px]">
                                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-[8px] font-bold text-primary">{(c.name || c.email).slice(0, 2).toUpperCase()}</span>
                                  </div>
                                  <span className="text-foreground font-medium">{c.name || c.email}</span>
                                  <span className="text-muted-foreground">&middot; {c.relationship} &middot; {c.interaction_frequency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {profile.topics_and_interests.length > 0 && (
                        <div>
                          <Label className="text-xs font-medium text-foreground mb-1.5 block">Topics & Interests</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.topics_and_interests.map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {profile && profile.email_count_analyzed === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No emails analyzed yet. Sync a mailbox first, then rebuild the profile.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">Daily Briefing Configuration</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Customize your morning briefing
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-foreground">Delivery time</Label>
                      <p className="text-xs text-muted-foreground">When to deliver your daily briefing</p>
                    </div>
                    <Input
                      type="time"
                      defaultValue="08:00"
                      className="w-28 bg-muted border-border text-foreground text-sm"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-foreground">VIP senders</Label>
                      <p className="text-xs text-muted-foreground">Domains and senders to always highlight</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs border-border text-foreground">
                      Configure
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="flex flex-col gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">Notification Preferences</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Choose how and when to be notified
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Daily Briefing Email</Label>
                        <p className="text-xs text-muted-foreground">Receive morning briefing via email</p>
                      </div>
                    </div>
                    <Switch checked={dailyBriefing} onCheckedChange={(v) => { setDailyBriefing(v); updateSetting("daily_briefing", v) }} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Slack Digest</Label>
                        <p className="text-xs text-muted-foreground">Post daily digest to Slack channel</p>
                      </div>
                    </div>
                    <Switch checked={slackDigest} onCheckedChange={(v) => { setSlackDigest(v); updateSetting("slack_digest", v) }} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-400/10">
                        <Bell className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Critical Alerts</Label>
                        <p className="text-xs text-muted-foreground">Push notifications for urgent items</p>
                      </div>
                    </div>
                    <Switch checked={criticalAlerts} onCheckedChange={(v) => { setCriticalAlerts(v); updateSetting("critical_alerts", v) }} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="flex flex-col gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">Security & Privacy</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Data handling and access controls
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-400/10">
                        <Shield className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Encryption</Label>
                        <p className="text-xs text-muted-foreground">All data encrypted at rest and in transit</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400">
                      Enabled
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <Key className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">API Keys</Label>
                        <p className="text-xs text-muted-foreground">Manage API access tokens</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs border-border text-foreground">
                      Manage
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Audit Logs</Label>
                        <p className="text-xs text-muted-foreground">View all access and AI activity logs</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs border-border text-foreground">
                      View Logs
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Data Retention</Label>
                        <p className="text-xs text-muted-foreground">Indexed data is retained for 90 days</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">
                      90 days
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border border-red-400/20">
                <CardHeader>
                  <CardTitle className="text-base text-red-400">Danger Zone</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Irreversible actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Delete all emails</p>
                      <p className="text-xs text-muted-foreground">
                        Remove all synced emails from this dashboard. Mailboxes stay connected; you can sync again later.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-red-400/30 text-red-400 hover:bg-red-400/10"
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
                      {deletingAll ? "Deleting…" : "Delete All Emails"}
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Delete account</p>
                      <p className="text-xs text-muted-foreground">Permanently delete your MailMind account</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs border-red-400/30 text-red-400 hover:bg-red-400/10">
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
  )
}
