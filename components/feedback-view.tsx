"use client"

import { useState } from "react"
import { Megaphone, Loader2, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { feedback as feedbackApi } from "@/lib/api"
import { toast } from "sonner"

const MAX_LEN = 8000

export function FeedbackView() {
  const [category, setCategory] = useState<string>("general")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const trimmed = message.trim()
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_LEN && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSent(false)
    try {
      await feedbackApi.submit({ message: trimmed, category })
      setSent(true)
      setMessage("")
      toast.success("Thanks — your feedback was sent.")
    } catch {
      toast.error("Could not send feedback. Try again in a moment.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Megaphone className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Feedback</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Share bugs, ideas, or anything that would make Smart Mail AI Beta better for you.
            </p>
          </div>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Send feedback</CardTitle>
            <CardDescription>
              Your message is tied to your account so we can follow up if needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="feedback-category">Type</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="feedback-category" className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="idea">Feature idea</SelectItem>
                    <SelectItem value="bug">Bug report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="feedback-message">Message</Label>
                  <span
                    className={`text-xs tabular-nums ${
                      message.length > MAX_LEN ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {message.length} / {MAX_LEN}
                  </span>
                </div>
                <Textarea
                  id="feedback-message"
                  placeholder="What happened, what you expected, steps to reproduce…"
                  value={message}
                  onChange={(ev) => setMessage(ev.target.value)}
                  rows={8}
                  className="min-h-[160px] resize-y"
                  maxLength={MAX_LEN}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={!canSubmit} className="min-w-[120px]">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
                {sent && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Last submission received
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
