"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2 } from "lucide-react"
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

export function EditMailboxDialog({
  mailbox,
  open,
  onOpenChange,
  onSaved,
}: {
  mailbox: Mailbox
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [name, setName] = useState(mailbox.name)
  const [color, setColor] = useState(mailbox.color)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setName(mailbox.name)
      setColor(mailbox.color)
      setError("")
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

        <DialogFooter className="flex flex-wrap gap-2 sm:flex-row sm:justify-end min-w-0">
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
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
