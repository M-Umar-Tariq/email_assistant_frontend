/**
 * API client for the Django backend.
 * All methods require the user to be logged in (Authorization: Bearer token).
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api").trim().replace(/\/+$/, "");

const TOKEN_KEY = "smartmailai_access_token";
const REFRESH_KEY = "smartmailai_refresh_token";
const USER_KEY = "smartmailai_user";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  is_admin?: boolean;
  disabled?: boolean;
};

export function setTokens(access: string, refresh: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Notify app that session expired after failed refresh (redirect to login). */
export function notifySessionExpired(): void {
  if (typeof window === "undefined") return;
  clearAuth();
  window.dispatchEvent(new CustomEvent("auth:session-expired"));
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { skipAuth?: boolean; _retried?: boolean }
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!options?.skipAuth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !options?.skipAuth && !options?._retried) {
    const refreshToken =
      typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
    if (refreshToken) {
      try {
        const refreshed = await request<{ access_token: string; refresh_token: string }>(
          "POST",
          "/auth/refresh/",
          { refresh_token: refreshToken },
          { skipAuth: true }
        );
        if (refreshed?.access_token && typeof window !== "undefined") {
          localStorage.setItem(TOKEN_KEY, refreshed.access_token);
          if (refreshed.refresh_token) localStorage.setItem(REFRESH_KEY, refreshed.refresh_token);
          return request<T>(method, path, body, { ...options, _retried: true });
        }
      } catch {
        // refresh failed
      }
    }
    notifySessionExpired();
  }

  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || res.statusText || "Request failed");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ user: AuthUser; access_token: string; refresh_token: string }>(
      "POST",
      "/auth/login/",
      { email, password },
      { skipAuth: true }
    ),
  register: (email: string, password: string, name: string) =>
    request<{ user: AuthUser; access_token: string; refresh_token: string }>(
      "POST",
      "/auth/register/",
      { email, password, name },
      { skipAuth: true }
    ),
  logout: (refreshToken?: string) => request("POST", "/auth/logout/", { refresh_token: refreshToken }),
  me: () =>
    request<AuthUser & { timezone?: string; disabled?: boolean }>("GET", "/auth/me/"),
  refresh: (refreshToken: string) =>
    request<{ access_token: string; refresh_token: string }>("POST", "/auth/refresh/", {
      refresh_token: refreshToken,
    }),
};

// ── Mailboxes ───────────────────────────────────────────────────────────────

export type MailboxApi = {
  id: string;
  name: string;
  email: string;
  color: string;
  last_sync_at: string | null;
  sync_status: string;
  created_at?: string;
  total_emails?: number;
  unread?: number;
};

export const mailboxes = {
  list: () => request<MailboxApi[]>("GET", "/mailboxes/"),
  create: (data: {
    name: string;
    email: string;
    color?: string;
    imap_host: string;
    imap_port?: number;
    smtp_host: string;
    smtp_port?: number;
    username: string;
    password: string;
  }) => request<MailboxApi>("POST", "/mailboxes/", data),
  get: (id: string) => request<MailboxApi>("GET", `/mailboxes/${id}/`),
  update: (id: string, data: { name?: string; color?: string }) =>
    request<MailboxApi>("PATCH", `/mailboxes/${id}/`, data),
  delete: (id: string) => request<void>("DELETE", `/mailboxes/${id}/`),
  sync: (
    id: string,
    options?: { initial_sync?: "only_new" | "last_n" | "all"; limit?: number }
  ) =>
    request<{ synced: number; total: number; total_fetched: number; flags_updated?: number }>(
      "POST",
      `/mailboxes/${id}/sync/`,
      options ? { initial_sync: options.initial_sync, limit: options.limit } : undefined
    ),
  stopSync: (id: string) =>
    request<{ stopped: boolean }>("POST", `/mailboxes/${id}/stop-sync/`),
};

// ── Emails ──────────────────────────────────────────────────────────────────

export type EmailListApi = {
  id: string;
  mailbox_id: string;
  subject: string;
  from_name: string;
  from_email: string;
  to: { name?: string; email?: string }[];
  date: string;
  preview: string;
  read: boolean;
  starred: boolean;
  labels: string[];
  has_attachment: boolean;
  attachments?: { filename: string; content_type: string; size: number; has_text: boolean }[];
  priority: string;
  category: string | null;
  ai_summary: string | null;
  sentiment_score: number | null;
  snoozed_until: string | null;
  replied_at?: string | null;
};

export type SentReplyApi = {
  body: string;
  subject: string;
  to: string[];
  from_email: string;
  date: string;
};

export type ThreadReplyApi = {
  message_id: string;
  from_name: string;
  from_email: string;
  to: { name: string; email: string }[];
  subject: string;
  body: string;
  body_html: string;
  date: string;
  preview: string;
};

export type EmailDetailApi = EmailListApi & {
  body: string;
  body_is_html?: boolean;
  thread_id?: string;
  total_chunks?: number;
  sent_replies?: SentReplyApi[];
  thread_replies?: ThreadReplyApi[];
};

export type EmailStatsApi = {
  grand_total: number;
  total_unread: number;
  total_replied: number;
  total_unreplied: number;
  today_total: number;
  today_unread: number;
  today_replied: number;
  today_unreplied: number;
  /** Total number of reply actions (e.g. 2 replies on same email = 2) */
  total_replies_sent: number;
  today_replies_sent: number;
};

export type UniqueSenderApi = { from_email: string; from_name: string; count: number; last_date?: string | null };
export type UniqueSendersApi = { unique_senders_count: number; senders: UniqueSenderApi[] };

export type FolderCountsApi = {
  inbox: number;
  sent: number;
  trash: number;
  archive: number;
  star: number;
  spam: number;
  snoozed: number;
};

export const emails = {
  stats: () => request<EmailStatsApi>("GET", "/emails/stats/"),
  folderCounts: (params?: { mailbox_id?: string }) => {
    const sp = new URLSearchParams();
    if (params?.mailbox_id) sp.set("mailbox_id", params.mailbox_id);
    const q = sp.toString();
    return request<FolderCountsApi>("GET", `/emails/folder-counts/${q ? `?${q}` : ""}`);
  },
  uniqueSenders: (params?: { mailbox_id?: string }) => {
    const sp = new URLSearchParams();
    if (params?.mailbox_id) sp.set("mailbox_id", params.mailbox_id);
    const q = sp.toString();
    return request<UniqueSendersApi>("GET", `/emails/unique-senders/${q ? `?${q}` : ""}`);
  },
  list: (params?: { mailbox_id?: string; category?: string; unread_only?: boolean; from_email?: string; label?: string; folder?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.mailbox_id) sp.set("mailbox_id", params.mailbox_id);
    if (params?.category) sp.set("category", params.category);
    if (params?.unread_only) sp.set("unread_only", "true");
    if (params?.from_email) sp.set("from_email", params.from_email);
    if (params?.label) sp.set("label", params.label);
    if (params?.folder) sp.set("folder", params.folder);
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.offset != null) sp.set("offset", String(params.offset));
    const q = sp.toString();
    return request<EmailListApi[]>("GET", `/emails/${q ? `?${q}` : ""}`);
  },
  get: (id: string) => request<EmailDetailApi>("GET", `/emails/${id}/`),
  update: (id: string, data: { read?: boolean; starred?: boolean; labels?: string[] }) =>
    request<EmailDetailApi>("PATCH", `/emails/${id}/update/`, data),
  snooze: (id: string, hours: number) => request<EmailDetailApi>("POST", `/emails/${id}/snooze/`, { hours }),
  archive: (id: string) => request<{ status: string }>("POST", `/emails/${id}/archive/`),
  trash: (id: string) => request<{ status: string }>("POST", `/emails/${id}/trash/`),
  spam: (id: string) => request<{ status: string }>("POST", `/emails/${id}/spam/`),
  deleteAll: () =>
    request<{ deleted: number }>("POST", "/emails/delete-all/"),
  send: (data: { mailbox_id: string; to: string[]; cc?: string[]; subject: string; body: string }) =>
    request<{ status: string }>("POST", "/emails/send/", data),
  reply: (emailId: string, data: { mailbox_id: string; to: string[]; subject: string; body: string }) =>
    request<{ status: string; sent_reply?: SentReplyApi }>("POST", `/emails/${emailId}/reply/`, data),
  forward: (emailId: string, data: { mailbox_id: string; to: string[]; body?: string }) =>
    request<{ status: string }>("POST", `/emails/${emailId}/forward/`, data),
  deleteThreadReply: (emailId: string, replyIndex: number) =>
    request<EmailDetailApi>("DELETE", `/emails/${emailId}/thread-reply/${replyIndex}/`),
  deleteSentReply: (emailId: string, replyIndex: number) =>
    request<EmailDetailApi>("DELETE", `/emails/${emailId}/sent-reply/${replyIndex}/`),
  attachmentDownloadUrl: (emailId: string, attachmentIndex: number) =>
    `${API_BASE}/emails/${emailId}/attachments/${attachmentIndex}/download/`,
};

// ── Follow-ups ──────────────────────────────────────────────────────────────

export type FollowUpApi = {
  id: string;
  user_id: string;
  email_id: string;
  due_date: string;
  status: string;
  auto_reminder_sent: boolean;
  days_waiting: number;
  created_at?: string;
  email_subject?: string;
  from_name?: string;
  from_email?: string;
};

export const followUps = {
  list: (status?: string) =>
    request<FollowUpApi[]>("GET", status ? `/follow-ups/?status=${status}` : "/follow-ups/"),
  create: (data: { email_id: string; due_date: string }) =>
    request<FollowUpApi>("POST", "/follow-ups/", data),
  update: (id: string, data: { status?: string; due_date?: string }) =>
    request<FollowUpApi>("PATCH", `/follow-ups/${id}/`, data),
  complete: (id: string) => request<FollowUpApi>("POST", `/follow-ups/${id}/complete/`),
  autoToday: () => request<{ scanned: number; created: number; skipped_existing: number }>("POST", "/follow-ups/auto/today/"),
  delete: (id: string) => request<void>("DELETE", `/follow-ups/${id}/`),
};

// ── Briefing ────────────────────────────────────────────────────────────────

export type BriefingMeetingApi = {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string | null;
  attendees?: string[];
  notes?: string;
  source: string;
  email_id?: string | null;
  conflict: boolean;
};

export type BriefingApi = {
  stats: {
    unread_total: number;
    high_priority: number;
    overdue_follow_ups: number;
    pending_follow_ups: number;
    meetings_today_count?: number;
    meetings_today_conflicts?: number;
    next_meeting?: BriefingMeetingApi | null;
  };
  mailboxes: {
    id: string;
    name: string;
    email: string;
    color: string;
    unread: number;
    synced: boolean;
    last_sync: string | null;
  }[];
  items: {
    id: string;
    type: string;
    title: string;
    description: string;
    priority: string;
    email_ids: string[];
    meeting_id?: string;
  }[];
};

export type MailboxSnapshotItem = {
  mailbox_name: string;
  mailbox_email: string;
  color: string;
  today_count: number;
  summary: string;
};

export const briefing = {
  get: () => request<BriefingApi>("GET", "/briefing/"),
  ai: () => request<{ briefing: MailboxSnapshotItem[] }>("GET", "/briefing/ai/"),
};

// ── Calendar / meetings ─────────────────────────────────────────────────────

export type CalendarMeeting = {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string | null;
  attendees?: string[];
  notes?: string;
  source: "email" | "manual";
  email_id?: string | null;
  mailbox_id?: string | null;
  conflict: boolean;
};

export const calendar = {
  list: (params?: { start_date?: string; end_date?: string; mailbox_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    if (params?.mailbox_id && params.mailbox_id !== "all") q.set("mailbox_id", params.mailbox_id);
    const qs = q.toString();
    return request<{ meetings: CalendarMeeting[] }>("GET", `/calendar/${qs ? `?${qs}` : ""}`);
  },
  create: (data: {
    title: string;
    start: string;
    end: string;
    location?: string;
    attendees?: string[];
    notes?: string;
    mailbox_id?: string;
  }) =>
    request<{ meeting: CalendarMeeting; overlapping_titles: string[]; has_overlap: boolean }>(
      "POST",
      "/calendar/",
      data
    ),
  update: (
    id: string,
    data: Partial<{ title: string; start: string; end: string; location: string; attendees: string[]; notes: string }>
  ) => request<{ meeting: CalendarMeeting }>("PATCH", `/calendar/${id}/`, data),
  delete: (id: string) => request<void>("DELETE", `/calendar/${id}/`),
};

// ── Feedback ────────────────────────────────────────────────────────────────

export const feedback = {
  submit: (body: { message: string; category?: string }) =>
    request<{ id: string; status: string }>("POST", "/feedback/", body),
};

// ── Analytics ───────────────────────────────────────────────────────────────

export const analytics = {
  overview: (days?: number) =>
    request<{ total_received: number; received_change: string; period_days: number }>(
      "GET",
      days != null ? `/analytics/overview/?days=${days}` : "/analytics/overview/"
    ),
  volume: (days?: number) =>
    request<{ date: string; received: number }[]>(
      "GET",
      days != null ? `/analytics/volume/?days=${days}` : "/analytics/volume/"
    ),
  topSenders: (limit?: number) =>
    request<{ email: string; name: string; count: number }[]>("GET", limit ? `/analytics/top-senders/?limit=${limit}` : "/analytics/top-senders/"),
  categories: () => request<{ name: string; value: number }[]>("GET", "/analytics/categories/"),
  metrics: () =>
    request<{
      total_emails: number; unread: number; active_contacts: number;
      total_emails_change: string; unread_change: string; active_contacts_change: string;
    }>("GET", "/analytics/metrics/"),
};

// ── AI ─────────────────────────────────────────────────────────────────────

export const ai = {
  ask: (query: string, mailboxId?: string, history?: { role: string; content: string }[]) =>
    request<{ answer: string; sources: { email_id: string; subject: string }[]; actions: AgentActionApi[] }>(
      "POST", "/ai/ask/", {
        query,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(mailboxId ? { mailbox_id: mailboxId } : {}),
        ...(history?.length ? { history } : {}),
      }
    ),
  askAboutEmail: (emailId: string, query: string) =>
    request<{ answer: string; sources: { email_id: string; subject: string }[] }>("POST", `/ai/ask/${emailId}/`, { query }),
  suggestedQuestions: () => request<string[]>("GET", "/ai/suggested-questions/"),
  instantReplies: (emailId: string) =>
    request<{ id: string; label: string; tone: string; text: string }[]>("GET", `/ai/instant-replies/${emailId}/`),
};

// ── Compose ────────────────────────────────────────────────────────────────

export const compose = {
  generate: (data: { to?: string; subject?: string; context?: string; tone?: string; sender_name?: string }) =>
    request<{ draft: string }>("POST", "/compose/generate/", data),
  rewrite: (data: { text: string; action?: string; target_language?: string }) =>
    request<{ rewritten: string }>("POST", "/compose/rewrite/", data),
  proofread: (text: string) =>
    request<{ id: string; type: string; severity: string; original: string; suggestion: string; explanation: string }[]>(
      "POST",
      "/compose/proofread/",
      { text }
    ),
  contact: (email: string) =>
    request<{ email: string; name: string; total_emails: number; last_contact: string; recent_subjects?: string[] }>(
      "GET",
      `/compose/contact/?email=${encodeURIComponent(email)}`
    ),
};

// ── Agent (Personal AI Assistant) ────────────────────────────────────────────

export type AgentActionApi = {
  id: string;
  type: string;
  label: string;
  description: string;
  status: string;
  to?: string | string[];
  subject?: string;
  body?: string;
  mailbox_id?: string;
  email_id?: string;
  instructions?: string;
  requires_approval: boolean;
  timestamp: string;
  execution_details?: string;
};

export type AgentChatResponse = {
  content: string;
  actions: AgentActionApi[];
  sources: { email_id: string; subject: string }[];
};

export type AgentSuggestion = {
  id: string;
  title: string;
  description: string;
  urgency: string;
  action_label: string;
  type: string;
  email_id?: string;
};

export type AgentProfile = {
  id?: string;
  user_id: string;
  email_count_analyzed: number;
  built_at: string;
  communication_style: {
    tone: string;
    formality: string;
    avg_length: string;
    greeting_pattern: string;
    sign_off_pattern: string;
  };
  key_contacts: {
    name: string;
    email: string;
    relationship: string;
    interaction_frequency: string;
    primary_topics: string[];
  }[];
  topics_and_interests: string[];
  work_patterns: {
    peak_hours: string;
    communication_style: string;
    priorities: string;
  };
  personality_traits: string[];
  response_preferences: {
    urgency_handling: string;
    delegation_style: string;
    follow_up_pattern: string;
  };
};

export const agent = {
  suggestions: () => request<AgentSuggestion[]>("GET", "/agent/suggestions/"),
  chat: (message: string, history?: { role: string; content: string }[], mailboxId?: string) =>
    request<AgentChatResponse>("POST", "/agent/chat/", {
      message,
      history,
      mailbox_id: mailboxId === "all" ? undefined : mailboxId,
    }),
  profile: () => request<AgentProfile>("GET", "/agent/profile/"),
  buildProfile: () => request<AgentProfile>("POST", "/agent/profile/build/"),
  execute: (actionData: AgentActionApi) =>
    request<AgentActionApi>("POST", "/agent/execute/", actionData),
  reject: (actionId: string) =>
    request<{ id: string; status: string }>("POST", `/agent/reject/${actionId}/`),
  speak: (text: string) =>
    request<{ audio: string; format: string }>("POST", "/agent/speak/", { text }),
};

// ── Settings ────────────────────────────────────────────────────────────────

export type AiLabelRule = { name: string; instruction: string };

export type SettingsApi = {
  user_id: string;
  daily_briefing: boolean;
  slack_digest: boolean;
  critical_alerts: boolean;
  ai_suggestions: boolean;
  auto_labeling: boolean;
  thread_summaries: boolean;
  sync_range_months: number;
  occupation?: string;
  important_emails_notes?: string;
  draft_style_notes?: string;
  ai_label_rules?: AiLabelRule[];
  onboarding_completed?: boolean;
};

export type SettingsUpdatePayload = Partial<
  Omit<SettingsApi, "user_id" | "ai_label_rules"> & { ai_label_rules?: AiLabelRule[] }
>;

export const settingsApi = {
  get: () => request<SettingsApi>("GET", "/settings/"),
  update: (data: SettingsUpdatePayload) => request<SettingsApi>("PATCH", "/settings/", data),
  relabel: () => request<{ updated: number }>("POST", "/settings/relabel/"),
};

// ── Search ────────────────────────────────────────────────────────────────

export const search = {
  emails: (q: string, params?: { mailbox_id?: string; limit?: number }) => {
    const sp = new URLSearchParams({ q });
    if (params?.mailbox_id) sp.set("mailbox_id", params.mailbox_id);
    if (params?.limit != null) sp.set("limit", String(params.limit));
    return request<EmailListApi[]>("GET", `/search/?${sp.toString()}`);
  },
};

// ── Admin (requires admin JWT) ─────────────────────────────────────────────

export type AdminStats = {
  mongodb_ok: boolean;
  qdrant_ok: boolean;
  users: number;
  mailboxes: number;
  emails_indexed: number;
  follow_ups: number;
  attachments: number;
  agent_profiles: number;
  /** Total calendar meetings (MongoDB). */
  meetings?: number;
  /** User feedback submissions (MongoDB). */
  feedback_submissions?: number;
  active_sessions: number;
  signups_today: number;
  signups_week: number;
  sync_statuses: Record<string, number>;
  daily_signups: { date: string; count: number }[];
  /** Indexed emails whose `date` falls in each UTC day (last 7 days). */
  daily_email_volume?: { date: string; count: number }[];
  top_users: { user_id: string; email: string; name: string; email_count: number }[];
  top_mailboxes?: {
    id: string;
    name: string;
    email: string;
    user_id: string;
    user_email: string;
    email_count: number;
  }[];
  engagement?: { read: number; unread: number; starred: number };
  averages?: { emails_per_user: number; mailboxes_per_user: number; emails_per_mailbox: number };
  users_disabled?: number;
  users_admin_flag?: number;
  follow_up_statuses?: Record<string, number>;
  feedback_by_category?: Record<string, number>;
  meetings_conflicting?: number;
};

export type AdminUserRow = AuthUser & {
  timezone?: string;
  mailbox_count: number;
  email_count: number;
  created_at?: string;
  updated_at?: string;
};

export type AdminUserList = {
  users: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
};

export type AdminMailboxRow = {
  id: string;
  name: string;
  email: string;
  color?: string;
  sync_status: string;
  last_sync_at: string | null;
  created_at?: string;
  email_count: number;
  unread?: number;
  user_id?: string;
  user_email?: string;
  user_name?: string;
};

export type AdminMailboxList = {
  mailboxes: AdminMailboxRow[];
  total: number;
  page: number;
  limit: number;
};

export type AdminActivityEvent = {
  type: "user_registered" | "mailbox_added" | "sync_completed" | "feedback_submitted";
  timestamp: string;
  user_email?: string;
  user_name?: string;
  user_id?: string;
  mailbox_name?: string;
  mailbox_email?: string;
  sync_status?: string;
  category?: string;
  message_preview?: string;
  feedback_id?: string;
};

export type AdminFeedbackRow = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  category: string;
  message: string;
  created_at?: string;
};

export type AdminFeedbackList = {
  feedback: AdminFeedbackRow[];
  total: number;
  page: number;
  limit: number;
};

export type AdminUserDetail = {
  user: AdminUserRow;
  settings: Record<string, unknown> | null;
  mailboxes: AdminMailboxRow[];
  follow_ups_open: number;
  follow_ups_total: number;
  attachment_count: number;
  has_agent_profile: boolean;
  email_stats: { total_read: number; total_unread: number; total_starred: number };
};

export const adminApi = {
  stats: () => request<AdminStats>("GET", "/admin/stats/"),
  activity: (limit?: number) =>
    request<AdminActivityEvent[]>("GET", limit ? `/admin/activity/?limit=${limit}` : "/admin/activity/"),
  feedback: (params?: { q?: string; category?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.category) sp.set("category", params.category);
    if (params?.page != null) sp.set("page", String(params.page));
    if (params?.limit != null) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return request<AdminFeedbackList>("GET", `/admin/feedback/${qs ? `?${qs}` : ""}`);
  },
  mailboxes: (params?: { q?: string; sync_status?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.sync_status) sp.set("sync_status", params.sync_status);
    if (params?.page != null) sp.set("page", String(params.page));
    if (params?.limit != null) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return request<AdminMailboxList>("GET", `/admin/mailboxes/${qs ? `?${qs}` : ""}`);
  },
  users: (params?: { q?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.page != null) sp.set("page", String(params.page));
    if (params?.limit != null) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return request<AdminUserList>("GET", `/admin/users/${qs ? `?${qs}` : ""}`);
  },
  user: (id: string) => request<AdminUserDetail>("GET", `/admin/users/${id}/`),
  patchUser: (id: string, body: { disabled?: boolean; is_admin?: boolean }) =>
    request<{ user: AdminUserRow }>("PATCH", `/admin/users/${id}/`, body),
  deleteUser: (id: string) => request<{ deleted: boolean }>("DELETE", `/admin/users/${id}/`),
};
