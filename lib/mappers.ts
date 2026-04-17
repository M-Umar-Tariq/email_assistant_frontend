import type { Email, EmailCategory, Mailbox, BriefingItem } from "@/lib/mock-data"
import type { EmailListApi, EmailDetailApi, MailboxApi, BriefingApi, FollowUpApi } from "@/lib/api"

const PREVIEW_MAX_LEN = 240

/**
 * Turn API preview/snippet text into plain, list-safe text (strips HTML/CSS noise from HTML emails).
 */
export function sanitizeEmailPreview(raw: string | null | undefined): string {
  if (raw == null) return ""
  let s = String(raw)
  if (!s.trim()) return ""

  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  s = s.replace(/<!--[\s\S]*?-->/g, " ")
  s = s.replace(/<[^>]+>/g, " ")
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10)
      return code > 0 && code < 0x110000 ? String.fromCharCode(code) : " "
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")

  const lines = s
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false
      if (/^[@#.][\s\S]*/.test(l) && (l.includes("{") || l.includes("}"))) return false
      if (/\b@font-face\b|font-family\s*:|#outlook\s+a\b|^\s*\{\s*$|!important/i.test(l)) return false
      return true
    })
  s = lines.join(" ").replace(/[ \t\f\v]+/g, " ").trim()

  const letters = s.replace(/[^a-zA-Z]/g, "").length
  if (s.length > 48 && letters / Math.max(s.length, 1) < 0.12) {
    return ""
  }

  if (s.length > PREVIEW_MAX_LEN) {
    s = s.slice(0, PREVIEW_MAX_LEN).trim()
    const lastSpace = s.lastIndexOf(" ")
    if (lastSpace > PREVIEW_MAX_LEN * 0.55) s = s.slice(0, lastSpace)
    return `${s}…`
  }
  return s
}

export type FollowUpItem = {
  id: string
  emailId: string
  subject: string
  from: { name: string; email: string }
  dueDate: string
  status: string
  daysWaiting: number
  autoReminderSent: boolean
}

export function mapMailboxApi(m: MailboxApi & { unread?: number }): Mailbox {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    provider: "imap",
    color: m.color || "#0ea5e9",
    unread: m.unread ?? 0,
    synced: m.sync_status === "synced",
    lastSync: m.last_sync_at ? new Date(m.last_sync_at).toLocaleString() : "Never",
    totalEmails: m.total_emails,
    syncStatus: m.sync_status,
    syncTotalFetched: m.sync_total_fetched ?? 0,
    syncProcessed: m.sync_processed ?? 0,
  }
}

export function mapEmailListApi(e: EmailListApi): Email {
  return {
    id: e.id,
    from: { name: e.from_name || "", email: e.from_email || "" },
    to: Array.isArray(e.to) ? e.to.map((t) => ({ name: (t as { name?: string }).name ?? "", email: (t as { email?: string }).email ?? "" })) : [],
    subject: e.subject || "",
    preview: sanitizeEmailPreview(e.preview || ""),
    body: "",
    date: typeof e.date === "string" ? e.date : new Date(e.date).toISOString(),
    originalDate:
      e.original_date == null || e.original_date === ""
        ? null
        : typeof e.original_date === "string"
          ? e.original_date
          : new Date(e.original_date as string | number | Date).toISOString(),
    read: e.read,
    starred: e.starred,
    labels: e.labels || [],
    mailbox: e.mailbox_id,
    hasAttachment: e.has_attachment,
    attachments: e.attachments || [],
    priority: (e.priority as "high" | "medium" | "low") || "medium",
    threadId: "",
    category: (e.category as EmailCategory) || undefined,
    aiSummary: e.ai_summary ?? undefined,
    sentimentScore: e.sentiment_score ?? undefined,
    snoozedUntil: e.snoozed_until || null,
    repliedAt: e.replied_at ?? null,
    threadCount: e.thread_count ?? undefined,
  }
}

export function mapEmailDetailApi(e: EmailDetailApi): Email {
  return {
    ...mapEmailListApi(e),
    body: e.body || "",
    bodyIsHtml: e.body_is_html ?? false,
    threadId: e.thread_id || "",
    sentReplies: e.sent_replies ?? [],
    threadReplies: e.thread_replies ?? [],
  }
}

export function mapBriefingItem(item: BriefingApi["items"][0]): BriefingItem {
  return {
    id: item.id,
    type: (item.type as BriefingItem["type"]) || "info",
    title: item.title,
    description: item.description,
    emails: item.email_ids || [],
    priority: (item.priority as "high" | "medium" | "low") || "medium",
    meetingId: item.meeting_id,
  }
}

export function mapFollowUpApi(f: FollowUpApi): FollowUpItem {
  return {
    id: f.id,
    emailId: f.email_id,
    subject: f.email_subject ?? "",
    from: { name: f.from_name ?? "", email: f.from_email ?? "" },
    dueDate: f.due_date,
    status: f.status,
    daysWaiting: f.days_waiting ?? 0,
    autoReminderSent: f.auto_reminder_sent ?? false,
  }
}
