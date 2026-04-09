"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Tag,
  ChevronRight,
  Settings,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Inbox,
  MoreHorizontal,
  Layers,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { settingsApi, type AiLabelRule } from "@/lib/api"
import { dispatchLabelsUpdated } from "@/lib/labels-events"
import { cn } from "@/lib/utils"

const MAX_LABELS = 12

const LABEL_THEMES: { dot: string; bg: string; border: string; ring: string; text: string; gradient: string }[] = [
  { dot: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-500/10",    border: "border-blue-200/70 dark:border-blue-500/20",    ring: "ring-blue-500/20",    text: "text-blue-600 dark:text-blue-400",    gradient: "from-blue-500/10 to-blue-500/5" },
  { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200/70 dark:border-emerald-500/20", ring: "ring-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", gradient: "from-emerald-500/10 to-emerald-500/5" },
  { dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-500/10",   border: "border-amber-200/70 dark:border-amber-500/20",   ring: "ring-amber-500/20",   text: "text-amber-600 dark:text-amber-400",   gradient: "from-amber-500/10 to-amber-500/5" },
  { dot: "bg-rose-500",    bg: "bg-rose-50 dark:bg-rose-500/10",    border: "border-rose-200/70 dark:border-rose-500/20",    ring: "ring-rose-500/20",    text: "text-rose-600 dark:text-rose-400",    gradient: "from-rose-500/10 to-rose-500/5" },
  { dot: "bg-violet-500",  bg: "bg-violet-50 dark:bg-violet-500/10",  border: "border-violet-200/70 dark:border-violet-500/20",  ring: "ring-violet-500/20",  text: "text-violet-600 dark:text-violet-400",  gradient: "from-violet-500/10 to-violet-500/5" },
  { dot: "bg-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-500/10",    border: "border-cyan-200/70 dark:border-cyan-500/20",    ring: "ring-cyan-500/20",    text: "text-cyan-600 dark:text-cyan-400",    gradient: "from-cyan-500/10 to-cyan-500/5" },
  { dot: "bg-pink-500",    bg: "bg-pink-50 dark:bg-pink-500/10",    border: "border-pink-200/70 dark:border-pink-500/20",    ring: "ring-pink-500/20",    text: "text-pink-600 dark:text-pink-400",    gradient: "from-pink-500/10 to-pink-500/5" },
  { dot: "bg-orange-500",  bg: "bg-orange-50 dark:bg-orange-500/10",  border: "border-orange-200/70 dark:border-orange-500/20",  ring: "ring-orange-500/20",  text: "text-orange-600 dark:text-orange-400",  gradient: "from-orange-500/10 to-orange-500/5" },
  { dot: "bg-teal-500",    bg: "bg-teal-50 dark:bg-teal-500/10",    border: "border-teal-200/70 dark:border-teal-500/20",    ring: "ring-teal-500/20",    text: "text-teal-600 dark:text-teal-400",    gradient: "from-teal-500/10 to-teal-500/5" },
  { dot: "bg-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-500/10",  border: "border-indigo-200/70 dark:border-indigo-500/20",  ring: "ring-indigo-500/20",  text: "text-indigo-600 dark:text-indigo-400",  gradient: "from-indigo-500/10 to-indigo-500/5" },
  { dot: "bg-fuchsia-500", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10", border: "border-fuchsia-200/70 dark:border-fuchsia-500/20", ring: "ring-fuchsia-500/20", text: "text-fuchsia-600 dark:text-fuchsia-400", gradient: "from-fuchsia-500/10 to-fuchsia-500/5" },
  { dot: "bg-lime-500",    bg: "bg-lime-50 dark:bg-lime-500/10",    border: "border-lime-200/70 dark:border-lime-500/20",    ring: "ring-lime-500/20",    text: "text-lime-600 dark:text-lime-400",    gradient: "from-lime-500/10 to-lime-500/5" },
]

function normalizeName(s: string) {
  return s.trim().toLowerCase()
}

function LabelCard({
  rule,
  index,
  onOpen,
  onEdit,
  onDelete,
}: {
  rule: AiLabelRule
  index: number
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const t = LABEL_THEMES[index % LABEL_THEMES.length]

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card transition-all duration-200 cursor-pointer overflow-hidden",
        t.border,
        "hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/20 hover:-translate-y-0.5 hover:border-opacity-100"
      )}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      {/* Top gradient accent */}
      <div className={cn("h-1.5 w-full bg-gradient-to-r", t.gradient)} />

      {/* Menu button — top right */}
      <div className="absolute right-2 top-3.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm border border-border/50 hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            <DropdownMenuItem
              className="gap-2 rounded-lg"
              onClick={(e) => { e.stopPropagation(); onOpen() }}
            >
              <Inbox className="h-4 w-4" />
              Open inbox
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 rounded-lg"
              onClick={(e) => { e.stopPropagation(); onEdit() }}
            >
              <Pencil className="h-4 w-4" />
              Edit rule
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 rounded-lg text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-3 p-5 pt-4 flex-1">
        {/* Icon + name */}
        <div className="flex items-start gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", t.bg)}>
            <Tag className={cn("h-[18px] w-[18px]", t.text)} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-[15px] text-foreground truncate leading-tight">
              {rule.name}
            </h3>
          </div>
        </div>

        {/* Instruction */}
        {rule.instruction?.trim() ? (
          <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 pl-[52px]">
            {rule.instruction.trim()}
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground/60 italic pl-[52px]">
            No AI instruction set
          </p>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/20">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", t.dot)} />
          <span className={cn("text-xs font-medium", t.text)}>AI-tagged</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </div>
  )
}

function CreateCard({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all duration-200 min-h-[180px]",
        "border-border/60 bg-muted/10 hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-md hover:shadow-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        "disabled:opacity-40 disabled:pointer-events-none"
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
        <Plus className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <div className="text-center px-4">
        <p className="font-semibold text-sm text-foreground">New label</p>
        <p className="text-xs text-muted-foreground mt-0.5">Add an AI rule</p>
      </div>
    </button>
  )
}

export function LabelsView({
  onSelectLabel,
  onOpenSettings,
}: {
  onSelectLabel: (labelName: string) => void
  onOpenSettings?: () => void
}) {
  const [rules, setRules] = useState<AiLabelRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [relabeling, setRelabeling] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [formName, setFormName] = useState("")
  const [formInstruction, setFormInstruction] = useState("")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  const loadRules = useCallback(() => {
    setLoading(true)
    settingsApi
      .get()
      .then((s) => {
        const list = (s.ai_label_rules ?? []).filter((r) => r.name?.trim())
        setRules(list)
      })
      .catch(() => setRules([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const persistRules = useCallback(async (next: AiLabelRule[]) => {
    setSaving(true)
    try {
      await settingsApi.update({ ai_label_rules: next })
      const applied = next.filter((r) => r.name?.trim())
      setRules(applied)
      dispatchLabelsUpdated(applied)
      toast.success("Labels saved")
      return true
    } catch {
      toast.error("Could not save labels")
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const openCreate = () => {
    if (rules.length >= MAX_LABELS) {
      toast.error(`You can have at most ${MAX_LABELS} labels`)
      return
    }
    setDialogMode("create")
    setEditIndex(null)
    setFormName("")
    setFormInstruction("")
    setDialogOpen(true)
  }

  const openEdit = (index: number) => {
    const r = rules[index]
    if (!r) return
    setDialogMode("edit")
    setEditIndex(index)
    setFormName(r.name)
    setFormInstruction(r.instruction ?? "")
    setDialogOpen(true)
  }

  const handleDialogSave = async () => {
    const name = formName.trim()
    const instruction = formInstruction.trim()
    if (!name) {
      toast.error("Label name is required")
      return
    }

    const dup = rules.findIndex(
      (r, i) => normalizeName(r.name) === normalizeName(name) && i !== editIndex
    )
    if (dup >= 0) {
      toast.error("A label with this name already exists")
      return
    }

    let next: AiLabelRule[]
    if (dialogMode === "create") {
      next = [...rules, { name, instruction }]
    } else if (editIndex !== null) {
      next = rules.map((r, i) => (i === editIndex ? { name, instruction } : r))
    } else {
      return
    }

    const ok = await persistRules(next)
    if (ok) setDialogOpen(false)
  }

  const confirmDelete = (index: number) => {
    setDeleteIndex(index)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (deleteIndex === null) return
    const next = rules.filter((_, i) => i !== deleteIndex)
    await persistRules(next)
    setDeleteOpen(false)
    setDeleteIndex(null)
  }

  const handleRelabel = async () => {
    if (rules.length === 0) {
      toast.message("Add at least one label first")
      return
    }
    setRelabeling(true)
    try {
      const res = await settingsApi.relabel()
      toast.success(`Updated labels on ${res.updated} emails`)
    } catch {
      toast.error("Re-label failed")
    } finally {
      setRelabeling(false)
    }
  }

  const deleteLabelName = deleteIndex !== null ? rules[deleteIndex]?.name : ""

  const emptyState = useMemo(
    () => !loading && rules.length === 0,
    [loading, rules.length]
  )

  return (
    <div className="flex h-full flex-col bg-background">
      {/* ── Header ── */}
      <header className="shrink-0 border-b border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-0 px-6 sm:px-8">
          {/* Top row */}
          <div className="flex flex-col gap-4 pt-7 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
                <Tag className="h-5 w-5 text-primary" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Labels
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Choose a label to open your inbox filtered to only those emails
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-2 rounded-xl shadow-sm h-9 px-4"
                onClick={openCreate}
                disabled={loading || rules.length >= MAX_LABELS}
              >
                <Plus className="h-3.5 w-3.5" />
                New label
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl h-9 px-4"
                onClick={handleRelabel}
                disabled={loading || relabeling || rules.length === 0}
              >
                {relabeling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                Re-apply labels
              </Button>
              {onOpenSettings && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl text-muted-foreground"
                  onClick={onOpenSettings}
                  title="AI settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Info strip */}
          <div className="flex items-center gap-4 pb-5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5">
              <Layers className="h-3 w-3 text-primary" />
              <span className="font-medium text-foreground/80">
                {rules.length}<span className="text-muted-foreground font-normal">/{MAX_LABELS}</span>
              </span>
            </div>
            <span className="hidden sm:inline">
              Edit or add labels with AI instructions. Use <strong className="text-foreground/80">Re-apply labels</strong> to retag existing mail.
            </span>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Loading your labels...</p>
            </div>
          ) : emptyState ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex flex-col items-center gap-6 max-w-md text-center">
                <div className="relative">
                  <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                    <Tag className="h-9 w-9 text-primary/70" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -right-1 -bottom-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                    <Plus className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Create your first label</h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Labels let AI automatically tag your emails. Give each label a name and
                    an instruction — like &quot;Priority&quot; for urgent client requests, or
                    &quot;Newsletters&quot; for marketing digests.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button className="gap-2 rounded-xl shadow-sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Create label
                  </Button>
                  {onOpenSettings && (
                    <Button variant="outline" className="gap-2 rounded-xl" onClick={onOpenSettings}>
                      <Sparkles className="h-4 w-4" />
                      AI settings
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule, index) => (
                <LabelCard
                  key={`${rule.name}-${index}`}
                  rule={rule}
                  index={index}
                  onOpen={() => onSelectLabel(rule.name.trim())}
                  onEdit={() => openEdit(index)}
                  onDelete={() => confirmDelete(index)}
                />
              ))}
              {rules.length < MAX_LABELS && (
                <CreateCard onClick={openCreate} disabled={false} />
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-muted/15">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                dialogMode === "create"
                  ? "bg-primary/10 text-primary"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}>
                {dialogMode === "create" ? (
                  <Plus className="h-5 w-5" />
                ) : (
                  <Pencil className="h-[18px] w-[18px]" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {dialogMode === "create" ? "New label" : "Edit label"}
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  {dialogMode === "create"
                    ? "Give it a name and tell the AI what to tag."
                    : "Update the name or AI instruction."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="label-name" className="text-sm font-medium">
                Label name
              </Label>
              <Input
                id="label-name"
                placeholder="e.g. Priority, Newsletters, Receipts"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="rounded-xl h-10"
                maxLength={128}
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label-instruction" className="text-sm font-medium">
                AI instruction
              </Label>
              <Textarea
                id="label-instruction"
                placeholder="Describe which emails should get this label..."
                value={formInstruction}
                onChange={(e) => setFormInstruction(e.target.value)}
                className="min-h-[130px] rounded-xl resize-y"
                maxLength={2000}
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground/70">
                  Be specific — e.g. &quot;Urgent client requests and deadline reminders&quot;
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {formInstruction.length}/2000
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/10 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl gap-2 min-w-[100px]"
              onClick={handleDialogSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {dialogMode === "create" ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Delete &quot;{deleteLabelName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription className="text-center leading-relaxed">
              This removes the AI rule. Emails already tagged will keep the old label until you re-apply.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              Delete label
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
