import type { Email, EmailCategory, Mailbox, BriefingItem } from "@/lib/mock-data"
import type { EmailListApi, EmailDetailApi, MailboxApi, BriefingApi, FollowUpApi } from "@/lib/api"

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
  }
}

export function mapEmailListApi(e: EmailListApi): Email {
  return {
    id: e.id,
    from: { name: e.from_name || "", email: e.from_email || "" },
    to: Array.isArray(e.to) ? e.to.map((t) => ({ name: (t as { name?: string }).name ?? "", email: (t as { email?: string }).email ?? "" })) : [],
    subject: e.subject || "",
    preview: e.preview || "",
    body: "",
    date: typeof e.date === "string" ? e.date : new Date(e.date).toISOString(),
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
