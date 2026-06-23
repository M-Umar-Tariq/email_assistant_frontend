"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "@/lib/gsap-ui"
import { Menu, X } from "lucide-react"
import { AppSidebar, type EmailFolder } from "@/components/app-sidebar"
import { DailyBriefing } from "@/components/daily-briefing"
import type { InboxFilter } from "@/components/daily-briefing"
import { InboxView } from "@/components/inbox-view"
import { AiAssistant } from "@/components/ai-assistant"
import { ComposeView } from "@/components/compose-view"
import { AnalyticsView } from "@/components/analytics-view"
import { SettingsView } from "@/components/settings-view"
import { LabelsView } from "@/components/labels-view"
import { ContactsView } from "@/components/contacts-view"
import { CalendarView } from "@/components/calendar-view"
import { MeetingRequestsView } from "@/components/meeting-requests-view"
import { FeedbackView } from "@/components/feedback-view"
import { FloatingAiChat } from "@/components/floating-ai-chat"
import { AddMailboxDialog } from "@/components/add-mailbox-dialog"
import { MailboxesView } from "@/components/mailboxes-view"
import { BetaLabel } from "@/components/beta-label"
import { AiChatProvider } from "@/lib/ai-chat-context"
import { AiQueryBackgroundIndicator } from "@/components/ai-query-background-indicator"
import { mailboxes as mailboxesApi } from "@/lib/api"

const AUTO_SYNC_INTERVAL = 60_000 // 1 minute

async function runSyncAll() {
  const mbs = await mailboxesApi.list()
  // New mailboxes stay `pending` until the post-connect dialog (Continue / Skip) or a manual sync.
  // Otherwise the 1-minute auto-sync would fetch the full inbox while the user is still choosing.
  const eligible = mbs.filter((mb) => mb.sync_status !== "pending")
  if (eligible.length === 0) return

  const settled = await Promise.allSettled(
    eligible.map((mb) => mailboxesApi.sync(mb.id))
  )

  let totalSynced = 0
  let totalFlagsUpdated = 0
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value) {
      totalSynced += r.value.synced ?? 0
      totalFlagsUpdated += r.value.flags_updated ?? 0
    }
  }

  window.dispatchEvent(
    new CustomEvent("email:sync", {
      detail: { newCount: totalSynced, flagsUpdated: totalFlagsUpdated },
    })
  )
  window.dispatchEvent(new CustomEvent("mailbox:sync-complete"))
}

export default function AppDashboard() {
  const [activeView, setActiveView] = useState("dashboard")
  const [showAddMailbox, setShowAddMailbox] = useState(false)
  const [mailboxListKey, setMailboxListKey] = useState(0)
  const [inboxFilter, setInboxFilter] = useState<InboxFilter | null>(null)
  const [initialEmailId, setInitialEmailId] = useState<string | null>(null)
  const [initialComposeMode, setInitialComposeMode] = useState<"reply" | null>(null)
  const [initialSenderEmail, setInitialSenderEmail] = useState<string | null>(null)
  const [initialSenderName, setInitialSenderName] = useState<string | null>(null)
  const [initialComposeTo, setInitialComposeTo] = useState<string | null>(null)
  const [initialComposeToName, setInitialComposeToName] = useState<string | null>(null)
  const [initialLabelFilter, setInitialLabelFilter] = useState<string | null>(null)
  /** When opening Inbox from Mailboxes "Open inbox", scope to this mailbox id (InboxView is not mounted there, so window events are missed). */
  const [pendingInboxMailbox, setPendingInboxMailbox] = useState<string | null>(null)
  const [selectedMailboxScope, setSelectedMailboxScope] = useState<string>("all")
  const [activeFolder, setActiveFolder] = useState<EmailFolder>("inbox")
  const handleMailboxScopeChange = useCallback((mailboxId: string) => {
    const next = mailboxId && mailboxId.length > 0 ? mailboxId : "all"
    setSelectedMailboxScope(next)
    setPendingInboxMailbox(next === "all" ? null : next)
    window.dispatchEvent(new CustomEvent("inbox:setMailboxFilter", { detail: { mailboxId: next } }))
  }, [])

  const syncingRef = useRef(false)

  // Sync on mount + every 1 minute
  useEffect(() => {
    let active = true
    const run = async () => {
      if (syncingRef.current) return
      syncingRef.current = true
      try {
        await runSyncAll()
      } catch {
        if (active) window.dispatchEvent(new CustomEvent("mailbox:sync-complete"))
      } finally {
        syncingRef.current = false
      }
    }
    run()
    const interval = setInterval(run, AUTO_SYNC_INTERVAL)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const handleNavigateInbox = useCallback((filter: InboxFilter) => {
    setInboxFilter(filter)
    setActiveFolder("inbox")
    setActiveView("inbox")
  }, [])

  const handleFilterConsumed = useCallback(() => {
    setInboxFilter(null)
  }, [])

  const handleLabelFilterConsumed = useCallback(() => {
    setInitialLabelFilter(null)
  }, [])

  const handleSelectLabelForInbox = useCallback((labelName: string) => {
    // Labels apply only to the Inbox folder — force folder back so label
    // filtering doesn't silently run against Sent/Trash/Archive/etc.
    setInboxFilter(null)
    setInitialSenderEmail(null)
    setInitialSenderName(null)
    setInitialLabelFilter(labelName)
    setActiveFolder("inbox")
    setActiveView("inbox")
  }, [])

  const handleNavigateToEmail = useCallback((emailId: string) => {
    setInitialEmailId(emailId)
    setActiveView("inbox")
  }, [])

  const handleEmailConsumed = useCallback(() => {
    setInitialEmailId(null)
    setInitialComposeMode(null)
  }, [])

  const handleSenderConsumed = useCallback(() => {
    setInitialSenderEmail(null)
    setInitialSenderName(null)
  }, [])

  useEffect(() => {
    const onShowEmailsFromSender = (e: Event) => {
      const detail = (e as CustomEvent).detail as { from_email?: string; from_name?: string }
      if (detail?.from_email) {
        setInboxFilter(null)
        setInitialLabelFilter(null)
        setPendingInboxMailbox(null)
        setInitialSenderEmail(detail.from_email)
        setInitialSenderName(detail.from_name ?? null)
        setActiveView("inbox")
      }
    }
    window.addEventListener("contacts:showEmailsFrom", onShowEmailsFromSender as EventListener)
    return () => window.removeEventListener("contacts:showEmailsFrom", onShowEmailsFromSender as EventListener)
  }, [])

  useEffect(() => {
    const onComposeOpenWith = (e: Event) => {
      const detail = ((e as CustomEvent).detail ?? {}) as { to?: string; toName?: string }
      setInitialComposeTo(detail.to ?? null)
      setInitialComposeToName(detail.toName ?? null)
      setActiveView("compose")
    }
    window.addEventListener("compose:openWith", onComposeOpenWith as EventListener)
    return () => window.removeEventListener("compose:openWith", onComposeOpenWith as EventListener)
  }, [])

  const handleComposeConsumed = useCallback(() => {
    setInitialComposeTo(null)
    setInitialComposeToName(null)
  }, [])

  useEffect(() => {
    const onAssistantOpenEmail = (e: Event) => {
      const detail = (e as CustomEvent).detail || {}
      const emailId = detail.emailId as string | undefined
      if (emailId) {
        setInboxFilter(null)
        setInitialSenderEmail(null)
        setInitialSenderName(null)
        setInitialLabelFilter(null)
        setPendingInboxMailbox(null)
        setActiveFolder("inbox")
        setInitialEmailId(emailId)
        setActiveView("inbox")
      }
    }
    window.addEventListener("assistant:openEmail", onAssistantOpenEmail as EventListener)
    return () => window.removeEventListener("assistant:openEmail", onAssistantOpenEmail as EventListener)
  }, [])

  const [mobileOpen, setMobileOpen] = useState(false)
  /** Inbox AI filter drawer open: hide sidebar detail column only; icon rail stays visible. */
  const [collapseNavDetailForAi, setCollapseNavDetailForAi] = useState(false)
  const viewShellRef = useRef<HTMLDivElement>(null)
  const desktopSidebarRef = useRef<HTMLElement>(null)
  const mobileDrawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onAiFilterSidebar = (e: Event) => {
      const open = Boolean((e as CustomEvent<{ open?: boolean }>).detail?.open)
      setCollapseNavDetailForAi(open)
      if (open) setMobileOpen(false)
    }
    window.addEventListener("inbox:aiFilterSidebar", onAiFilterSidebar as EventListener)
    return () => window.removeEventListener("inbox:aiFilterSidebar", onAiFilterSidebar as EventListener)
  }, [])

  useGSAP(
    () => {
      const el = desktopSidebarRef.current
      if (!el) return
      gsap.fromTo(
        el,
        { x: -20, opacity: 0.88 },
        { x: 0, opacity: 1, duration: 0.48, ease: "power3.out" },
      )
    },
    { scope: desktopSidebarRef },
  )

  useGSAP(
    () => {
      if (!mobileOpen || !mobileDrawerRef.current) return
      const root = mobileDrawerRef.current
      const backdrop = root.querySelector("[data-drawer-backdrop]")
      const panel = root.querySelector("[data-drawer-panel]")
      if (backdrop) {
        gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: "power1.out" })
      }
      if (panel) {
        gsap.fromTo(panel, { x: "-105%" }, { x: "0%", duration: 0.36, ease: "power3.out" })
      }
    },
    { dependencies: [mobileOpen] },
  )

  useGSAP(
    () => {
      const el = viewShellRef.current
      if (!el) return
      gsap.fromTo(
        el,
        { opacity: 0.92, y: 6 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" },
      )
    },
    { scope: viewShellRef, dependencies: [activeView] },
  )

  useEffect(() => {
    const goHome = () => {
      setActiveView("dashboard")
      setMobileOpen(false)
    }
    window.addEventListener("app:goHome", goHome)
    return () => window.removeEventListener("app:goHome", goHome)
  }, [])

  const handleViewChange = useCallback(
    (view: string) => {
      setActiveView(view)
      setMobileOpen(false)
    },
    [],
  )

  useEffect(() => {
    if (activeView !== "inbox") {
      setPendingInboxMailbox(null)
    }
  }, [activeView])

  return (
    <AiChatProvider>
      <div className="flex h-svh w-full overflow-hidden bg-background">
        {/* ── Desktop sidebar (icon rail stays when Inbox AI filter drawer opens) ── */}
        <aside ref={desktopSidebarRef} className="hidden md:flex h-full min-h-0 shrink-0 will-change-transform">
          <AppSidebar
            activeView={activeView}
            onViewChange={handleViewChange}
            onAddMailboxClick={() => setShowAddMailbox(true)}
            mailboxListKey={mailboxListKey}
            onSelectLabel={handleSelectLabelForInbox}
            activeFolder={activeFolder}
            onFolderChange={setActiveFolder}
            selectedMailboxScope={selectedMailboxScope}
            onMailboxScopeChange={handleMailboxScopeChange}
            collapseDetailForAi={collapseNavDetailForAi}
          />
        </aside>

        {/* ── Mobile drawer overlay ── */}
        {mobileOpen && (
          <div ref={mobileDrawerRef} className="fixed inset-0 z-50 md:hidden">
            <div
              data-drawer-backdrop
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              data-drawer-panel
              className="relative flex h-full w-fit max-w-[min(100vw-1rem,380px)] will-change-transform"
            >
              <AppSidebar
                activeView={activeView}
                onViewChange={handleViewChange}
                onAddMailboxClick={() => { setShowAddMailbox(true); setMobileOpen(false) }}
                mailboxListKey={mailboxListKey}
                onSelectLabel={(l) => { handleSelectLabelForInbox(l); setMobileOpen(false) }}
                activeFolder={activeFolder}
                onFolderChange={setActiveFolder}
                selectedMailboxScope={selectedMailboxScope}
                onMailboxScopeChange={(id) => { handleMailboxScopeChange(id); setMobileOpen(false) }}
              />
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md md:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </aside>
          </div>
        )}

        {/* ── Main content area ── */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          {/* Mobile top bar — menu left, title centered (matches phone shell) */}
          <div className="relative flex h-[3.25rem] items-center border-b border-border px-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted/60 active:bg-muted/80"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14">
              <span className="flex max-w-full items-center justify-center gap-1.5 text-base font-bold tracking-tight text-foreground">
                <span className="truncate">
                  Smart Mail <span className="text-primary">AI</span>
                </span>
                <BetaLabel className="shrink-0 scale-95 text-[10px] px-2 py-0.5" />
              </span>
            </div>
            <div className="z-10 ml-auto h-9 w-9 shrink-0" aria-hidden />
          </div>

          {/* Views */}
          <div ref={viewShellRef} className="min-h-0 min-w-0 flex-1 overflow-hidden">
            {/* Dashboard stays mounted (hidden on other views) for instant return + session cache on slow networks. */}
            <div
              className={
                activeView === "dashboard"
                  ? "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                  : "hidden"
              }
              aria-hidden={activeView !== "dashboard"}
            >
              <DailyBriefing
                visible={activeView === "dashboard"}
                onViewChange={handleViewChange}
                onNavigateInbox={handleNavigateInbox}
                onNavigateToEmail={handleNavigateToEmail}
                onConnectMailbox={() => setShowAddMailbox(true)}
                onOpenInboxWithMailbox={(id, filter) => {
                  setInboxFilter(filter ?? null)
                  setInitialLabelFilter(null)
                  setInitialSenderEmail(null)
                  setInitialSenderName(null)
                  setPendingInboxMailbox(id)
                  setActiveView("inbox")
                }}
                onOpenCalendarWithMailbox={(id) => {
                  setSelectedMailboxScope(id)
                  setActiveView("calendar")
                  window.dispatchEvent(
                    new CustomEvent("calendar:setMailboxFilter", { detail: { mailboxId: id } }),
                  )
                }}
                mailboxScope={selectedMailboxScope}
              />
            </div>
            {activeView === "calendar" && <CalendarView />}
            {activeView === "meeting-requests" && (
              <MeetingRequestsView onOpenEmail={handleNavigateToEmail} />
            )}
            {activeView === "mailboxes" && (
              <MailboxesView
                onAddMailbox={() => setShowAddMailbox(true)}
                onViewChange={handleViewChange}
                mailboxListKey={mailboxListKey}
                onOpenInboxWithMailbox={(id) => {
                  setPendingInboxMailbox(id)
                  handleViewChange("inbox")
                }}
              />
            )}
            {/* Inbox stays mounted (hidden on other views) so mail sync can refresh the list app-wide; opening Inbox stays instant. */}
            <div
              className={
                activeView === "inbox"
                  ? "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                  : "hidden"
              }
              aria-hidden={activeView !== "inbox"}
            >
              <InboxView
                visible={activeView === "inbox"}
                initialMailboxFilter={pendingInboxMailbox ?? (selectedMailboxScope !== "all" ? selectedMailboxScope : null)}
                initialFilter={inboxFilter}
                onInitialFilterConsumed={handleFilterConsumed}
                initialEmailId={initialEmailId}
                initialComposeMode={initialComposeMode}
                onInitialEmailConsumed={handleEmailConsumed}
                initialSenderEmail={initialSenderEmail}
                initialSenderName={initialSenderName}
                onInitialSenderConsumed={handleSenderConsumed}
                initialLabel={initialLabelFilter}
                onInitialLabelConsumed={handleLabelFilterConsumed}
                onConnectMailbox={() => setShowAddMailbox(true)}
                folder={activeFolder}
              />
            </div>
            {activeView === "labels" && (
              <LabelsView
                onSelectLabel={handleSelectLabelForInbox}
                onOpenSettings={() => setActiveView("settings")}
              />
            )}
            {/* Contacts stays mounted while hidden — instant return + session cache on slow loads. */}
            <div
              className={
                activeView === "contacts"
                  ? "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                  : "hidden"
              }
              aria-hidden={activeView !== "contacts"}
            >
              <ContactsView
                visible={activeView === "contacts"}
                onAddMailboxClick={() => setShowAddMailbox(true)}
                mailboxScope={selectedMailboxScope}
              />
            </div>
            {/* Keep Assistant mounted so in-flight AI replies / confirmed actions finish after navigation */}
            <div
              className={
                activeView === "assistant"
                  ? "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                  : "hidden"
              }
              aria-hidden={activeView !== "assistant"}
            >
              <AiAssistant
                panelVisible={activeView === "assistant"}
                mailboxScope={selectedMailboxScope}
                onMailboxScopeChange={handleMailboxScopeChange}
              />
            </div>
            {activeView === "compose" && (
              <ComposeView
                initialTo={initialComposeTo}
                initialToName={initialComposeToName}
                onInitialComposeConsumed={handleComposeConsumed}
              />
            )}
            {activeView === "analytics" && (
              <AnalyticsView
                onConnectMailbox={() => setShowAddMailbox(true)}
                onOpenInboxWithMailbox={(id) => {
                  setInboxFilter(null)
                  setInitialLabelFilter(null)
                  setInitialSenderEmail(null)
                  setInitialSenderName(null)
                  setPendingInboxMailbox(id)
                  setActiveView("inbox")
                }}
                mailboxScope={selectedMailboxScope}
              />
            )}
            {activeView === "feedback" && <FeedbackView />}
            {activeView === "settings" && (
              <SettingsView
                onAddMailboxClick={() => setShowAddMailbox(true)}
                mailboxListKey={mailboxListKey}
              />
            )}
          </div>
        </main>

        <AiQueryBackgroundIndicator
          activeView={activeView}
          onOpenAssistant={() => setActiveView("assistant")}
        />
        <FloatingAiChat
          activeView={activeView}
          onNavigateToAssistant={() => setActiveView("assistant")}
        />
        <AddMailboxDialog
          open={showAddMailbox}
          onOpenChange={setShowAddMailbox}
          onSuccess={() => setMailboxListKey((k) => k + 1)}
        />
      </div>
    </AiChatProvider>
  )
}
