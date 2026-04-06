"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Trash2 } from "lucide-react"
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
import { mailboxes as mailboxesApi } from "@/lib/api"
import type { Mailbox } from "@/lib/mock-data"
import { toast } from "sonner"

export function EditMailboxDialog({
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
    if (!name.trim()) {
      setError("Name is required")
      return
    }
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
        await mailboxesApi.stopSync(mailbox.id).catch(() => {})
      }
      const res = await mailboxesApi.sync(mailbox.id)
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
            <Label htmlFor="edit-mb-color" className="shrink-0">
              Color
            </Label>
            <input
              id="edit-mb-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-border bg-background"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
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
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="gap-1.5">
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
