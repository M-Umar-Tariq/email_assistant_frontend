"use client"

import { Link2, Mail, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  onConnect?: () => void
  /** Larger layout for home / inbox empty states */
  variant?: "hero" | "compact"
  className?: string
}

/**
 * Shown when the user has no mailboxes — clear CTA to open the add-mailbox flow.
 */
export function ConnectMailboxCta({ onConnect, variant = "hero", className }: Props) {
  const isHero = variant === "hero"

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-primary/35 bg-gradient-to-br from-primary/[0.06] via-background to-primary/[0.03] text-center shadow-sm",
        isHero ? "px-6 py-12 sm:px-10 sm:py-14" : "px-4 py-6",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto mb-5 flex items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15",
          isHero ? "h-16 w-16" : "h-12 w-12",
        )}
      >
        <Mail className={cn("text-primary", isHero ? "h-8 w-8" : "h-6 w-6")} strokeWidth={1.75} />
      </div>
      <h2 className={cn("font-bold tracking-tight text-foreground", isHero ? "text-xl sm:text-2xl" : "text-base")}>
        Connect an email account
      </h2>
      <p
        className={cn(
          "mx-auto mt-2 max-w-md text-pretty text-muted-foreground",
          isHero ? "text-sm leading-relaxed" : "text-xs",
        )}
      >
        Add Gmail, Outlook, or IMAP to sync your inbox, run AI briefings, search, and labels. Nothing is stored until you
        connect.
      </p>
      <ul
        className={cn(
          "mx-auto mt-5 flex flex-col gap-2 text-left text-sm text-muted-foreground sm:max-w-sm",
          !isHero && "mt-3 text-xs",
        )}
      >
        <li className="flex items-start gap-2">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
          <span>Secure OAuth for Google and Microsoft — or IMAP credentials you control.</span>
        </li>
        <li className="flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
          <span>You can add multiple mailboxes and switch between them from the Mailboxes page or inbox filter.</span>
        </li>
      </ul>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {onConnect ? (
          <Button size={isHero ? "lg" : "default"} className="gap-2 font-semibold shadow-md shadow-primary/15" onClick={onConnect}>
            <Plus className="h-4 w-4" />
            Connect mailbox
          </Button>
        ) : null}
      </div>
      <p className="mt-4 text-xs text-muted-foreground/80">
        {onConnect ? (
          <>
            You can also connect from <span className="font-medium text-foreground/80">Settings → Mailboxes</span> or the{" "}
            <span className="font-medium text-foreground/80">Mailboxes</span> icon in the sidebar.
          </>
        ) : (
          <>Open the account menu (sidebar) or Settings → Mailboxes to connect Gmail, Outlook, or IMAP.</>
        )}
      </p>
    </div>
  )
}
