"use client"

import { useState, type ReactNode } from "react"
import { Check, Circle, Loader2, LogOut, Settings2, UserPlus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Mailbox } from "@/lib/mock-data"

function dispatchInboxMailboxFilter(mailboxId: string) {
  window.dispatchEvent(
    new CustomEvent("inbox:setMailboxFilter", { detail: { mailboxId } }),
  )
}

/** Profile + sign out — opened from the avatar in the sidebar rail. */
export function AccountMenu({
  children,
  userName,
  userEmail,
  onSignOut,
  align = "end",
  side = "right",
}: {
  children: ReactNode
  userName: string
  userEmail: string
  onSignOut?: () => void
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}) {
  const [open, setOpen] = useState(false)

  const initials =
    userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-[min(calc(100vw-1.5rem),20rem)] rounded-xl border border-border/80 bg-popover p-2 shadow-lg"
      >
        <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background">
              <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
        </div>

        {onSignOut && (
          <>
            <Separator className="my-2 bg-border/50" />
            <div className="rounded-lg border border-border/80 bg-background p-1 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onSignOut()
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** Mailbox list + add — separate from account; opened from the mailboxes icon. */
export function MailboxSwitcherMenu({
  children,
  mailboxes,
  activeMailboxFilter,
  onViewChange,
  onAddMailbox,
  onEditMailbox,
  align = "end",
  side = "right",
}: {
  children: ReactNode
  mailboxes: Mailbox[]
  activeMailboxFilter: string
  onViewChange: (view: string) => void
  onAddMailbox?: () => void
  onEditMailbox: (mb: Mailbox) => void
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}) {
  const [open, setOpen] = useState(false)

  const goInboxAll = () => {
    dispatchInboxMailboxFilter("all")
    onViewChange("inbox")
    setOpen(false)
  }

  const goInboxMailbox = (id: string) => {
    dispatchInboxMailboxFilter(id)
    onViewChange("inbox")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-[min(calc(100vw-1.5rem),20rem)] rounded-xl border border-border/80 bg-popover p-2 shadow-lg"
      >
        <div className="rounded-lg border border-border/70 bg-muted/15 p-2 shadow-sm">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Mailboxes
          </p>
          {mailboxes.length > 0 && (
            <button
              type="button"
              onClick={goInboxAll}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                activeMailboxFilter === "all"
                  ? "bg-primary/10 font-medium text-primary ring-1 ring-primary/25"
                  : "text-foreground hover:bg-muted/80",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dashed border-border/80 text-[10px] font-medium text-muted-foreground">
                All
              </span>
              <span className="flex-1 truncate">All mailboxes</span>
              {activeMailboxFilter === "all" && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          )}

          <div className="max-h-[200px] overflow-y-auto [scrollbar-width:thin]">
            {mailboxes.map((mb) => {
              const isSyncing = mb.syncStatus === "syncing"
              const isPending = mb.syncStatus === "pending"
              const isError = mb.syncStatus === "error" || mb.syncStatus === "cancelled"
              const active = activeMailboxFilter === mb.id
              return (
                <div key={mb.id} className="flex items-stretch gap-0.5 py-0.5">
                  <button
                    type="button"
                    onClick={() => goInboxMailbox(mb.id)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary ring-1 ring-primary/25"
                        : "hover:bg-muted/80",
                    )}
                  >
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                      {isSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Circle
                          className="h-3 w-3"
                          fill={isPending ? "transparent" : isError ? "var(--destructive)" : mb.color}
                          stroke={isPending ? mb.color : isError ? "var(--destructive)" : mb.color}
                          strokeWidth={isPending ? 2 : 1.5}
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium leading-tight">{mb.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{mb.email}</span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onEditMailbox(mb)
                      setOpen(false)
                    }}
                    className="flex w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/90 hover:text-foreground"
                    aria-label={`Manage ${mb.name}`}
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>

          <Separator className="my-2 bg-border/50" />

          <button
            type="button"
            onClick={() => {
              onAddMailbox?.()
              setOpen(false)
            }}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            Add mailbox
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
