"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DailyBriefing } from "@/components/daily-briefing"
import type { InboxFilter } from "@/components/daily-briefing"
import { InboxView } from "@/components/inbox-view"
import { AiAssistant } from "@/components/ai-assistant"
import { ComposeView } from "@/components/compose-view"
import { AnalyticsView } from "@/components/analytics-view"
import { SettingsView } from "@/components/settings-view"
import { FollowupTracker } from "@/components/followup-tracker"
import { AiAgent } from "@/components/ai-agent"
import { AddMailboxDialog } from "@/components/add-mailbox-dialog"
import { mailboxes as mailboxesApi } from "@/lib/api"

const AUTO_SYNC_INTERVAL = 60_000 // 1 minute

async function runSyncAll() {
  const mbs = await mailboxesApi.list()
  if (mbs.length === 0) return

  const settled = await Promise.allSettled(
    mbs.map((mb: { id: string }) => mailboxesApi.sync(mb.id))
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
  const syncingRef = useRef(false)

  // Sync on mount + every 1 minute (single effect so interval is reliable)
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (syncingRef.current) return
      syncingRef.current = true
      try {
        await runSyncAll()
      } catch {
        if (!cancelled) window.dispatchEvent(new CustomEvent("mailbox:sync-complete"))
      } finally {
        if (!cancelled) syncingRef.current = false
      }
    }
    run() // run once as soon as user lands on app
    const interval = setInterval(run, AUTO_SYNC_INTERVAL) // then every 1 min
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const handleNavigateInbox = useCallback((filter: InboxFilter) => {
    setInboxFilter(filter)
    setActiveView("inbox")
  }, [])

  const handleFilterConsumed = useCallback(() => {
    setInboxFilter(null)
  }, [])

  const handleNavigateToEmail = useCallback((emailId: string) => {
    setInitialEmailId(emailId)
    setActiveView("inbox")
  }, [])

  const handleEmailConsumed = useCallback(() => {
    setInitialEmailId(null)
    setInitialComposeMode(null)
  }, [])

  useEffect(() => {
    const onNavigateFromFollowups = (e: Event) => {
      const detail = (e as CustomEvent).detail || {}
      const emailId = detail.emailId as string
      const action = detail.action as string | undefined
      if (emailId) {
        setInitialEmailId(emailId)
        setActiveView("inbox")
        setInitialComposeMode(action === "reply" ? "reply" : null)
      }
    }
    window.addEventListener("followups:navigate", onNavigateFromFollowups as EventListener)
    return () => window.removeEventListener("followups:navigate", onNavigateFromFollowups as EventListener)
  }, [])

  // When all mailboxes are removed (e.g. last one deleted), leave follow-ups view
  useEffect(() => {
    const onMailboxUpdated = () => {
      mailboxesApi.list().then((list) => {
        if (list.length === 0 && activeView === "followups") {
          setActiveView("dashboard")
        }
      }).catch(() => {})
    }
    window.addEventListener("mailbox:updated", onMailboxUpdated)
    return () => window.removeEventListener("mailbox:updated", onMailboxUpdated)
  }, [activeView])

  return (
    <SidebarProvider>
      <AppSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onAddMailboxClick={() => setShowAddMailbox(true)}
        mailboxListKey={mailboxListKey}
      />
      <SidebarInset className="overflow-hidden">
        <div className="flex h-svh flex-col">
          {/* Mobile trigger */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-semibold text-foreground">MailMind</span>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {activeView === "dashboard" && (
              <DailyBriefing
                onViewChange={setActiveView}
                onNavigateInbox={handleNavigateInbox}
                onNavigateToEmail={handleNavigateToEmail}
              />
            )}
            {activeView === "inbox" && (
              <InboxView
                initialFilter={inboxFilter}
                onInitialFilterConsumed={handleFilterConsumed}
                initialEmailId={initialEmailId}
                initialComposeMode={initialComposeMode}
                onInitialEmailConsumed={handleEmailConsumed}
              />
            )}
            {activeView === "followups" && <FollowupTracker />}
            {activeView === "agent" && <AiAgent />}
            {activeView === "assistant" && <AiAssistant />}
            {activeView === "compose" && <ComposeView />}
            {activeView === "analytics" && <AnalyticsView />}
            {activeView === "settings" && (
              <SettingsView
                onAddMailboxClick={() => setShowAddMailbox(true)}
                mailboxListKey={mailboxListKey}
              />
            )}
          </div>
        </div>
      </SidebarInset>
      <AddMailboxDialog
        open={showAddMailbox}
        onOpenChange={setShowAddMailbox}
        onSuccess={() => setMailboxListKey((k) => k + 1)}
      />
    </SidebarProvider>
  )
}
