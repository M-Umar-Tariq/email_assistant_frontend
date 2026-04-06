"use client"

import { useEffect, useState } from "react"
import { Tag, ChevronRight, Settings, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { settingsApi, type AiLabelRule } from "@/lib/api"

export function LabelsView({
  onSelectLabel,
  onOpenSettings,
}: {
  onSelectLabel: (labelName: string) => void
  onOpenSettings?: () => void
}) {
  const [rules, setRules] = useState<AiLabelRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsApi
      .get()
      .then((s) => {
        const list = (s.ai_label_rules ?? []).filter((r) => r.name?.trim())
        setRules(list)
      })
      .catch(() => setRules([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="border-b border-border px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between max-w-4xl">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Labels</h1>
              <p className="text-sm text-muted-foreground">
                Choose a label to open your inbox filtered to only those emails
              </p>
            </div>
          </div>
          {onOpenSettings && (
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={onOpenSettings}>
              <Settings className="h-4 w-4" />
              Manage labels
            </Button>
          )}
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 sm:p-8 max-w-4xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading labels…</p>
            </div>
          ) : rules.length === 0 ? (
            <Card className="border-dashed border-border/80 bg-muted/20">
              <CardHeader>
                <CardTitle className="text-base">No labels yet</CardTitle>
                <CardDescription>
                  Create AI labels in Settings → AI Settings. After sync, emails are tagged automatically; you can re-label
                  anytime from there.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {onOpenSettings && (
                  <Button className="gap-2" onClick={onOpenSettings}>
                    <Sparkles className="h-4 w-4" />
                    Go to Settings
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {rules.map((rule) => (
                <li key={rule.name}>
                  <button
                    type="button"
                    onClick={() => onSelectLabel(rule.name.trim())}
                    className="group w-full text-left rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:bg-accent/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Tag className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{rule.name}</p>
                          {rule.instruction?.trim() ? (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {rule.instruction.trim()}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground/70 mt-1 italic">No description</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors mt-0.5" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
