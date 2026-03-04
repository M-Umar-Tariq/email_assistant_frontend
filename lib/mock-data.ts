export type Email = {
  id: string
  from: { name: string; email: string; avatar?: string }
  to: { name: string; email: string }[]
  subject: string
  preview: string
  body: string
  bodyIsHtml?: boolean
  date: string
  read: boolean
  starred: boolean
  labels: string[]
  mailbox: string
  hasAttachment: boolean
  attachments?: { filename: string; content_type: string; size: number; has_text: boolean }[]
  priority: "high" | "medium" | "low"
  threadId: string
  threadCount?: number
  category?: EmailCategory
  aiSummary?: string
  instantReplies?: InstantReply[]
  snoozedUntil?: string | null
  followUp?: FollowUp | null
  schedulingInfo?: SchedulingInfo | null
  sentimentScore?: number // -1 to 1
  repliedAt?: string | null
}

export type EmailCategory = "important" | "updates" | "promotions" | "social" | "newsletters" | "finance"

export type InstantReply = {
  id: string
  label: string
  tone: "positive" | "neutral" | "negative" | "question"
  text: string
}

export type FollowUp = {
  id: string
  dueDate: string
  status: "pending" | "overdue" | "completed" | "snoozed"
  autoReminderSent: boolean
  suggestedAction: string
  daysWaiting: number
}

export type SchedulingInfo = {
  detected: boolean
  suggestedDate?: string
  suggestedTime?: string
  attendees?: string[]
  location?: string
  title?: string
}

export type ContactIntelligence = {
  email: string
  name: string
  company: string
  role: string
  domain: string
  totalEmails: number
  avgResponseTime: string
  lastContact: string
  sentimentTrend: "positive" | "neutral" | "declining"
  relationship: "strong" | "moderate" | "new"
  topics: string[]
  recentActivity: { date: string; subject: string; direction: "sent" | "received" }[]
}

export type ProofreadResult = {
  id: string
  type: "grammar" | "tone" | "clarity" | "style" | "wordiness"
  severity: "error" | "warning" | "suggestion"
  original: string
  suggestion: string
  explanation: string
  position: { start: number; end: number }
}

export type Mailbox = {
  id: string
  name: string
  email: string
  provider: "gmail" | "outlook" | "imap"
  color: string
  unread: number
  synced: boolean
  lastSync: string
  totalEmails?: number
  /** "synced" | "error" | "pending" - so UI can show red only when error */
  syncStatus?: string
}

export type BriefingItem = {
  id: string
  type: "urgent" | "followup" | "deadline" | "vip" | "risk" | "info"
  title: string
  description: string
  emails: string[]
  priority: "high" | "medium" | "low"
}

export type AnalyticsData = {
  date: string
  received: number
  sent: number
  responseTime: number
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: { emailId: string; subject: string }[]
  timestamp: string
}

export const mailboxes: Mailbox[] = [
  {
    id: "mb-1",
    name: "Work",
    email: "alex@acmecorp.com",
    provider: "outlook",
    color: "#0ea5e9",
    unread: 14,
    synced: true,
    lastSync: "2 min ago",
  },
  {
    id: "mb-2",
    name: "Personal",
    email: "alex.chen@gmail.com",
    provider: "gmail",
    color: "#10b981",
    unread: 3,
    synced: true,
    lastSync: "5 min ago",
  },
  {
    id: "mb-3",
    name: "Sales Team",
    email: "sales@acmecorp.com",
    provider: "outlook",
    color: "#f59e0b",
    unread: 8,
    synced: true,
    lastSync: "1 min ago",
  },
]

export const emails: Email[] = [
  {
    id: "e-1",
    from: { name: "Sarah Miller", email: "sarah.miller@vendorx.com" },
    to: [{ name: "Alex Chen", email: "alex@acmecorp.com" }],
    subject: "RE: Q1 Contract Renewal - Updated Terms",
    preview: "Hi Alex, I've reviewed the counter-proposal and we're aligned on most points. However, the pricing on Section 3.2 needs...",
    body: "Hi Alex,\n\nI've reviewed the counter-proposal and we're aligned on most points. However, the pricing on Section 3.2 needs further discussion. Our legal team has flagged two clauses that differ from our standard terms:\n\n1. Payment terms extended to Net-60 (we typically do Net-30)\n2. The liability cap has been reduced from our standard $2M to $500K\n\nCan we schedule a call this week to iron out these details? Time is running short - the current contract expires March 15th.\n\nBest regards,\nSarah Miller\nAccount Director, VendorX",
    date: "2026-02-13T09:15:00Z",
    read: false,
    starred: true,
    labels: ["Vendor", "Contract", "Urgent"],
    mailbox: "mb-1",
    hasAttachment: true,
    priority: "high",
    threadId: "t-1",
    threadCount: 5,
    category: "important",
    aiSummary: "VendorX contract renewal has 2 unresolved terms: payment period (Net-60 vs Net-30) and liability cap ($500K vs $2M). Contract expires March 15. Sarah requests a call this week.",
    sentimentScore: 0.3,
    instantReplies: [
      { id: "ir-1a", label: "Schedule call", tone: "positive", text: "Hi Sarah,\n\nThanks for the update. Let's get these last two items resolved. I'm available Wednesday 2-4 PM or Thursday morning - would either work for a 30-minute call?\n\nBest,\nAlex" },
      { id: "ir-1b", label: "Need more time", tone: "neutral", text: "Hi Sarah,\n\nAppreciate the thorough review. I need to loop in our CFO on the payment terms discussion. Can we aim for early next week instead? I'll have our position finalized by then.\n\nBest,\nAlex" },
      { id: "ir-1c", label: "Counter-propose", tone: "question", text: "Hi Sarah,\n\nThanks for flagging these. What if we meet in the middle - Net-45 payment terms and a $1M liability cap? That would align with recent precedents in our industry.\n\nHappy to discuss on a call if preferred.\n\nBest,\nAlex" },
    ],
    followUp: {
      id: "fu-1",
      dueDate: "2026-02-14T17:00:00Z",
      status: "pending",
      autoReminderSent: false,
      suggestedAction: "Schedule negotiation call before March 15 deadline",
      daysWaiting: 1,
    },
    schedulingInfo: {
      detected: true,
      suggestedDate: "2026-02-19",
      suggestedTime: "14:00",
      attendees: ["sarah.miller@vendorx.com", "alex@acmecorp.com"],
      title: "VendorX Contract Negotiation",
    },
  },
  {
    id: "e-2",
    from: { name: "David Park", email: "david.park@acmecorp.com" },
    to: [{ name: "Alex Chen", email: "alex@acmecorp.com" }],
    subject: "URGENT: Server Outage - Customer Portal Down",
    preview: "Alex, the customer portal has been down since 7:30 AM. Engineering is investigating but we need exec approval for...",
    body: "Alex,\n\nThe customer portal has been down since 7:30 AM. Engineering is investigating but we need exec approval for emergency infrastructure spend to spin up failover servers.\n\nImpact:\n- ~2,400 active users affected\n- 3 enterprise clients have opened P1 tickets\n- Estimated revenue at risk: $180K if not resolved by EOD\n\nRequesting emergency budget approval of $15K for AWS resources.\n\nDavid Park\nVP Engineering",
    date: "2026-02-13T08:45:00Z",
    read: false,
    starred: true,
    labels: ["Engineering", "Urgent", "Escalation"],
    mailbox: "mb-1",
    hasAttachment: false,
    priority: "high",
    threadId: "t-2",
    threadCount: 8,
    category: "important",
    aiSummary: "Customer portal outage since 7:30 AM. 2,400 users affected, $180K revenue at risk. Needs emergency $15K AWS budget approval.",
    sentimentScore: -0.6,
    instantReplies: [
      { id: "ir-2a", label: "Approve budget", tone: "positive", text: "David,\n\nBudget approved. Spin up the failover servers immediately. Keep me posted every 30 minutes on recovery status.\n\nAlex" },
      { id: "ir-2b", label: "Need details", tone: "question", text: "David,\n\nBefore I approve, can you confirm: (1) What's the root cause? (2) Is this a permanent fix or temporary? (3) What's the ETA to full recovery?\n\nAlex" },
      { id: "ir-2c", label: "Escalate further", tone: "neutral", text: "David,\n\nApproved with conditions. Please also prepare a post-mortem and ensure we have redundancy measures in place to prevent recurrence. Loop in the CTO as well.\n\nAlex" },
    ],
    followUp: {
      id: "fu-2",
      dueDate: "2026-02-13T12:00:00Z",
      status: "overdue",
      autoReminderSent: true,
      suggestedAction: "Approve emergency budget - revenue at risk",
      daysWaiting: 0,
    },
  },
  {
    id: "e-3",
    from: { name: "Lisa Wong", email: "lisa.wong@partnercorp.net" },
    to: [{ name: "Alex Chen", email: "alex@acmecorp.com" }],
    subject: "Partnership Proposal - Co-Marketing Campaign Q2",
    preview: "Dear Alex, Following our conversation at the summit last week, I'd like to formally propose a co-marketing initiative...",
    body: "Dear Alex,\n\nFollowing our conversation at the summit last week, I'd like to formally propose a co-marketing initiative for Q2 2026. Here's what we're thinking:\n\n- Joint webinar series (3 sessions, April-June)\n- Co-branded content hub with shared leads\n- Combined ad spend of $50K with 60/40 split\n- Expected reach: 150K+ qualified prospects\n\nI've attached the full proposal deck. Would love to discuss on a call next week.\n\nBest,\nLisa Wong\nHead of Partnerships, PartnerCorp",
    date: "2026-02-13T07:30:00Z",
    read: true,
    starred: false,
    labels: ["Partnership", "Sales"],
    mailbox: "mb-1",
    hasAttachment: true,
    priority: "medium",
    threadId: "t-3",
    category: "important",
    aiSummary: "Q2 co-marketing proposal from PartnerCorp: joint webinars, co-branded content, $50K ad spend (60/40 split), targeting 150K+ prospects. Deck attached.",
    sentimentScore: 0.7,
    instantReplies: [
      { id: "ir-3a", label: "Interested", tone: "positive", text: "Hi Lisa,\n\nThanks for putting this together - the proposal looks compelling, especially the projected reach. Let me review the deck this week and circle back with some thoughts. How's Tuesday or Wednesday for a call?\n\nBest,\nAlex" },
      { id: "ir-3b", label: "Decline", tone: "negative", text: "Hi Lisa,\n\nThank you for the proposal. After reviewing our Q2 commitments, I don't think we have the bandwidth for a full co-marketing initiative right now. Could we explore a smaller pilot instead?\n\nBest,\nAlex" },
    ],
    followUp: {
      id: "fu-3",
      dueDate: "2026-02-17T17:00:00Z",
      status: "pending",
      autoReminderSent: false,
      suggestedAction: "Review proposal deck and schedule discussion call",
      daysWaiting: 3,
    },
    schedulingInfo: {
      detected: true,
      suggestedDate: "2026-02-18",
      suggestedTime: "10:00",
      attendees: ["lisa.wong@partnercorp.net", "alex@acmecorp.com"],
      title: "PartnerCorp Co-Marketing Discussion",
    },
  },
  {
    id: "e-4",
    from: { name: "James Foster", email: "j.foster@legalhq.com" },
    to: [{ name: "Alex Chen", email: "alex@acmecorp.com" }],
    subject: "NDA Review Complete - Action Required",
    preview: "The NDA for the TechStart acquisition has been reviewed. There are 3 items that require your sign-off before we can...",
    body: "Alex,\n\nThe NDA for the TechStart acquisition has been reviewed. There are 3 items that require your sign-off before we can proceed:\n\n1. Non-compete clause scope (2 years vs. requested 1 year)\n2. Intellectual property assignment definitions\n3. Data handling provisions post-acquisition\n\nPlease review the marked-up document attached and confirm by EOD Friday.\n\nJames Foster, Esq.\nLegalHQ Partners",
    date: "2026-02-12T16:20:00Z",
    read: true,
    starred: false,
    labels: ["Legal", "Contract"],
    mailbox: "mb-1",
    hasAttachment: true,
    priority: "high",
    threadId: "t-4",
    category: "important",
    aiSummary: "TechStart NDA needs sign-off on 3 items: non-compete scope, IP assignment, and data handling. Deadline: EOD Friday.",
    sentimentScore: 0.1,
    instantReplies: [
      { id: "ir-4a", label: "Approve all", tone: "positive", text: "James,\n\nReviewed the marked-up document. All three items look acceptable. You have my sign-off to proceed.\n\nBest,\nAlex" },
      { id: "ir-4b", label: "Request changes", tone: "question", text: "James,\n\nI'm comfortable with items 2 and 3, but I'd like to push back on the non-compete scope. Can we propose 18 months as a compromise? Let me know if that's workable.\n\nBest,\nAlex" },
    ],
    followUp: {
      id: "fu-4",
      dueDate: "2026-02-14T17:00:00Z",
      status: "pending",
      autoReminderSent: false,
      suggestedAction: "Review and sign off on NDA by Friday",
      daysWaiting: 1,
    },
  },
  {
    id: "e-5",
    from: { name: "Marketing Team", email: "marketing@acmecorp.com" },
    to: [{ name: "All Staff", email: "all@acmecorp.com" }],
    subject: "February Newsletter Draft - Review by Thursday",
    preview: "Hi team, please review the attached draft for our February customer newsletter. Key highlights include the product...",
    body: "Hi team,\n\nPlease review the attached draft for our February customer newsletter. Key highlights include:\n\n- Product launch announcement\n- Customer success story: GlobalTech\n- Upcoming webinar schedule\n- Q1 roadmap preview\n\nPlease send feedback by Thursday 5 PM ET.\n\nThanks,\nMarketing Team",
    date: "2026-02-12T14:00:00Z",
    read: true,
    starred: false,
    labels: ["Marketing", "Internal"],
    mailbox: "mb-1",
    hasAttachment: true,
    priority: "low",
    threadId: "t-5",
    category: "updates",
    aiSummary: "February newsletter draft ready for review. Covers product launch, GlobalTech success story, webinar schedule, Q1 roadmap. Feedback due Thursday.",
    sentimentScore: 0.5,
  },
  {
    id: "e-6",
    from: { name: "Rachel Kim", email: "rachel.kim@acmecorp.com" },
    to: [{ name: "Sales Team", email: "sales@acmecorp.com" }],
    subject: "Deal Alert: Enterprise Plan - GlobalTech ($240K ARR)",
    preview: "Team, GlobalTech has verbally committed to the Enterprise plan. Contract value: $240K ARR with 3-year term...",
    body: "Team,\n\nGlobalTech has verbally committed to the Enterprise plan!\n\nDeal details:\n- Contract value: $240K ARR\n- 3-year term with annual billing\n- 500 seats, scaling to 1,200 by Y2\n- Implementation starts March 1\n\nLegal is drafting the MSA now. Need procurement approval by Friday.\n\nRachel Kim\nEnterprise Account Executive",
    date: "2026-02-13T10:00:00Z",
    read: false,
    starred: true,
    labels: ["Sales", "Deal"],
    mailbox: "mb-3",
    hasAttachment: false,
    priority: "high",
    threadId: "t-6",
    category: "important",
    aiSummary: "GlobalTech committed to Enterprise plan: $240K ARR, 3-year term, 500 seats. Implementation March 1. Procurement approval needed by Friday.",
    sentimentScore: 0.9,
    instantReplies: [
      { id: "ir-6a", label: "Congratulate", tone: "positive", text: "Rachel,\n\nFantastic work! This is a huge win for the team. I'll fast-track the procurement approval today. Let's make sure the implementation team is briefed by EOW.\n\nAlex" },
      { id: "ir-6b", label: "Ask details", tone: "question", text: "Rachel,\n\nGreat news! Before I push through procurement, can you confirm: (1) Any custom SLA requirements? (2) Who's the exec sponsor on their side? (3) Is the 500-seat count firm or could it start lower?\n\nAlex" },
    ],
    followUp: {
      id: "fu-6",
      dueDate: "2026-02-14T17:00:00Z",
      status: "pending",
      autoReminderSent: false,
      suggestedAction: "Process procurement approval for GlobalTech deal",
      daysWaiting: 0,
    },
  },
  {
    id: "e-7",
    from: { name: "Tom Bradley", email: "tom@freelance.dev" },
    to: [{ name: "Alex Chen", email: "alex.chen@gmail.com" }],
    subject: "Weekend hiking plan?",
    preview: "Hey Alex, are you still up for the Mt. Wilson trail this Saturday? Weather looks perfect. I was thinking we start...",
    body: "Hey Alex,\n\nAre you still up for the Mt. Wilson trail this Saturday? Weather looks perfect - sunny, 68F.\n\nI was thinking we start early, around 7 AM from the trailhead. I'll bring the snacks if you handle water.\n\nLet me know!\nTom",
    date: "2026-02-12T20:30:00Z",
    read: true,
    starred: false,
    labels: ["Personal"],
    mailbox: "mb-2",
    hasAttachment: false,
    priority: "low",
    threadId: "t-7",
    category: "social",
    aiSummary: "Tom asking about Saturday hiking plan at Mt. Wilson trail. Suggested 7 AM start. Wants confirmation.",
    sentimentScore: 0.8,
    instantReplies: [
      { id: "ir-7a", label: "I'm in!", tone: "positive", text: "Hey Tom!\n\nAbsolutely, count me in! 7 AM works great. I'll bring plenty of water and some trail mix. Can't wait!\n\nAlex" },
      { id: "ir-7b", label: "Raincheck", tone: "negative", text: "Hey Tom,\n\nSorry, I've got a packed weekend with work stuff spilling over. Can we do next Saturday instead? Same plan.\n\nAlex" },
    ],
    schedulingInfo: {
      detected: true,
      suggestedDate: "2026-02-15",
      suggestedTime: "07:00",
      attendees: ["tom@freelance.dev", "alex.chen@gmail.com"],
      location: "Mt. Wilson Trailhead",
      title: "Hiking - Mt. Wilson Trail",
    },
  },
  {
    id: "e-8",
    from: { name: "AWS Billing", email: "no-reply@aws.amazon.com" },
    to: [{ name: "Alex Chen", email: "alex@acmecorp.com" }],
    subject: "Invoice #INV-2026-0213 - February Infrastructure",
    preview: "Your AWS invoice for February 2026 is ready. Total amount: $34,521.87. This represents a 23% increase from last...",
    body: "Your AWS invoice for February 2026 is ready.\n\nTotal amount: $34,521.87\nThis represents a 23% increase from last month ($28,087.12).\n\nTop cost drivers:\n- EC2 instances: $18,240\n- RDS databases: $8,420\n- S3 storage: $4,210\n- Data transfer: $3,651\n\nView full invoice in your AWS console.",
    date: "2026-02-13T06:00:00Z",
    read: false,
    starred: false,
    labels: ["Finance", "Invoice"],
    mailbox: "mb-1",
    hasAttachment: true,
    priority: "medium",
    threadId: "t-8",
    category: "finance",
    aiSummary: "AWS February invoice: $34,521.87 (up 23% from $28,087). Top cost: EC2 at $18,240. Significant increase needs attention.",
    sentimentScore: -0.2,
  },
  {
    id: "e-9",
    from: { name: "Support Queue", email: "support@acmecorp.com" },
    to: [{ name: "Sales Team", email: "sales@acmecorp.com" }],
    subject: "Weekly Support Summary - 47 tickets, 3 SLA breaches",
    preview: "This week's support summary: 47 total tickets (up 12% WoW), 3 SLA breaches on P1 tickets, average resolution time...",
    body: "Weekly Support Summary\n\nTotal tickets: 47 (up 12% WoW)\nSLA breaches: 3 on P1 tickets\nAvg resolution time: 4.2 hours\nCSAT score: 4.1/5.0\n\nTop issues:\n1. Login failures after SSO update (18 tickets)\n2. Report export timing out (12 tickets)\n3. API rate limiting questions (8 tickets)\n\nAction items flagged for engineering review.",
    date: "2026-02-12T18:00:00Z",
    read: true,
    starred: false,
    labels: ["Support", "Report"],
    mailbox: "mb-3",
    hasAttachment: false,
    priority: "medium",
    threadId: "t-9",
    category: "updates",
    aiSummary: "47 support tickets (up 12%), 3 SLA breaches. Main issue: SSO login failures (18 tickets). CSAT at 4.1/5.0.",
    sentimentScore: -0.3,
  },
  {
    id: "e-10",
    from: { name: "HR Department", email: "hr@acmecorp.com" },
    to: [{ name: "All Staff", email: "all@acmecorp.com" }],
    subject: "Reminder: Annual Performance Reviews - Due Feb 28",
    preview: "This is a reminder that annual performance reviews are due by February 28th. Please ensure all self-assessments are...",
    body: "Hi everyone,\n\nThis is a reminder that annual performance reviews are due by February 28th.\n\nTimeline:\n- Self-assessments: Due Feb 21\n- Manager reviews: Due Feb 28\n- Calibration meetings: March 3-5\n- Results shared: March 10\n\nPlease complete your self-assessment in the HR portal.\n\nThank you,\nHR Department",
    date: "2026-02-12T10:00:00Z",
    read: true,
    starred: false,
    labels: ["HR", "Internal"],
    mailbox: "mb-1",
    hasAttachment: false,
    priority: "medium",
    threadId: "t-10",
    category: "updates",
    aiSummary: "Performance review reminder. Self-assessment due Feb 21, manager reviews Feb 28, calibration March 3-5.",
    sentimentScore: 0.0,
    followUp: {
      id: "fu-10",
      dueDate: "2026-02-21T17:00:00Z",
      status: "pending",
      autoReminderSent: false,
      suggestedAction: "Complete self-assessment in HR portal",
      daysWaiting: 1,
    },
  },
  {
    id: "e-11",
    from: { name: "LinkedIn", email: "notifications@linkedin.com" },
    to: [{ name: "Alex Chen", email: "alex.chen@gmail.com" }],
    subject: "You have 5 new connection requests",
    preview: "Sarah Johnson and 4 others want to connect with you on LinkedIn...",
    body: "You have 5 new connection requests:\n\n1. Sarah Johnson - VP Product at TechFlow\n2. Michael Rivera - CEO at StartupHub\n3. Emily Zhang - Data Scientist at ML Corp\n4. Robert Chen - Engineering Lead at ScaleUp\n5. Amanda Torres - CMO at GrowthCo\n\nView and respond to your requests on LinkedIn.",
    date: "2026-02-13T08:00:00Z",
    read: true,
    starred: false,
    labels: ["Social"],
    mailbox: "mb-2",
    hasAttachment: false,
    priority: "low",
    threadId: "t-11",
    category: "social",
    aiSummary: "5 new LinkedIn connection requests including VPs and C-suite executives from tech companies.",
    sentimentScore: 0.4,
  },
  {
    id: "e-12",
    from: { name: "Stripe", email: "receipts@stripe.com" },
    to: [{ name: "Alex Chen", email: "alex@acmecorp.com" }],
    subject: "Payment received: $12,400 from MegaCorp Inc",
    preview: "You've received a payment of $12,400.00 USD from MegaCorp Inc for Invoice #INV-2026-0198...",
    body: "Payment received!\n\nAmount: $12,400.00 USD\nFrom: MegaCorp Inc\nInvoice: #INV-2026-0198\nDate: February 13, 2026\nStatus: Succeeded\n\nThe funds will be deposited to your bank account in 2-3 business days.\n\nView in dashboard: https://dashboard.stripe.com",
    date: "2026-02-13T07:15:00Z",
    read: true,
    starred: false,
    labels: ["Finance", "Payment"],
    mailbox: "mb-1",
    hasAttachment: false,
    priority: "low",
    threadId: "t-12",
    category: "finance",
    aiSummary: "$12,400 payment received from MegaCorp Inc. Funds depositing in 2-3 business days.",
    sentimentScore: 0.8,
  },
  {
    id: "e-13",
    from: { name: "Product Hunt", email: "digest@producthunt.com" },
    to: [{ name: "Alex Chen", email: "alex.chen@gmail.com" }],
    subject: "Top products today: AI tools you'll love",
    preview: "Check out today's top launched products including new AI productivity tools...",
    body: "Today's Top Products:\n\n1. PromptForge - Build and test AI prompts collaboratively\n2. DataStream AI - Real-time data pipeline automation\n3. CodeReview Pro - AI-powered code review assistant\n4. MeetingSense - AI meeting transcription & action items\n5. DesignBrain - Generate design systems with AI\n\nSee all products at producthunt.com",
    date: "2026-02-13T06:00:00Z",
    read: true,
    starred: false,
    labels: ["Newsletter"],
    mailbox: "mb-2",
    hasAttachment: false,
    priority: "low",
    threadId: "t-13",
    category: "newsletters",
    aiSummary: "Product Hunt daily digest featuring 5 AI productivity tools.",
    sentimentScore: 0.3,
  },
  {
    id: "e-14",
    from: { name: "Figma", email: "team@figma.com" },
    to: [{ name: "Alex Chen", email: "alex@acmecorp.com" }],
    subject: "Your team's design review is ready",
    preview: "The Q1 redesign project has 3 new comments from your team members awaiting review...",
    body: "Hi Alex,\n\nYour team has been busy! The Q1 redesign project has new activity:\n\n- 3 new comments on the Dashboard redesign\n- 2 resolved comments on the Onboarding flow\n- 1 new version uploaded for Mobile app screens\n\nView the project to catch up on changes.\n\nBest,\nThe Figma Team",
    date: "2026-02-12T22:00:00Z",
    read: true,
    starred: false,
    labels: ["Design", "Internal"],
    mailbox: "mb-1",
    hasAttachment: false,
    priority: "low",
    threadId: "t-14",
    category: "updates",
    aiSummary: "Figma design review: 3 new comments on Dashboard redesign, 2 resolved on Onboarding, 1 new Mobile version.",
    sentimentScore: 0.4,
  },
  {
    id: "e-15",
    from: { name: "Shopify", email: "promotions@shopify.com" },
    to: [{ name: "Alex Chen", email: "alex.chen@gmail.com" }],
    subject: "Grow your store: New AI features for merchants",
    preview: "Discover how Shopify's new AI tools can help automate your product descriptions, optimize pricing...",
    body: "Hi Alex,\n\nWe're excited to announce new AI-powered features for Shopify merchants:\n\n- AI Product Descriptions: Generate compelling copy in seconds\n- Smart Pricing: Optimize prices based on market data\n- Inventory Forecasting: Predict demand with ML models\n- Customer Segmentation: Auto-segment with AI\n\nUpgrade to Shopify Plus to unlock all features.\n\nShopify Team",
    date: "2026-02-12T15:00:00Z",
    read: true,
    starred: false,
    labels: ["Promotion"],
    mailbox: "mb-2",
    hasAttachment: false,
    priority: "low",
    threadId: "t-15",
    category: "promotions",
    aiSummary: "Shopify promoting new AI features: auto product descriptions, smart pricing, inventory forecasting, customer segmentation.",
    sentimentScore: 0.2,
  },
]

export const briefingItems: BriefingItem[] = [
  {
    id: "b-1",
    type: "urgent",
    title: "Server Outage - Customer Portal",
    description: "Portal down since 7:30 AM. 2,400 users affected, 3 enterprise P1 tickets. Engineering needs $15K emergency budget approval.",
    emails: ["e-2"],
    priority: "high",
  },
  {
    id: "b-2",
    type: "deadline",
    title: "VendorX Contract Expires March 15",
    description: "Two pricing disagreements remain: payment terms (Net-60 vs Net-30) and liability cap ($500K vs $2M). Call needed this week.",
    emails: ["e-1"],
    priority: "high",
  },
  {
    id: "b-3",
    type: "vip",
    title: "GlobalTech Enterprise Deal - $240K ARR",
    description: "Verbal commitment received. 3-year term, 500 seats. Legal drafting MSA, procurement approval needed by Friday.",
    emails: ["e-6"],
    priority: "high",
  },
  {
    id: "b-4",
    type: "followup",
    title: "NDA Sign-off Required by Friday",
    description: "TechStart acquisition NDA reviewed. 3 items need your approval: non-compete scope, IP assignment, data handling.",
    emails: ["e-4"],
    priority: "high",
  },
  {
    id: "b-5",
    type: "risk",
    title: "AWS Costs Up 23% Month-over-Month",
    description: "February invoice: $34,521 vs $28,087 last month. Main drivers: EC2 (+$4.2K) and data transfer (+$1.8K).",
    emails: ["e-8"],
    priority: "medium",
  },
  {
    id: "b-6",
    type: "info",
    title: "Support SLA Breaches - 3 This Week",
    description: "47 tickets total (up 12%). Top issue: SSO login failures (18 tickets). Engineering review flagged.",
    emails: ["e-9"],
    priority: "medium",
  },
  {
    id: "b-7",
    type: "followup",
    title: "PartnerCorp Co-Marketing Proposal",
    description: "Lisa Wong proposing Q2 joint campaign: webinars, co-branded content, $50K ad spend. Awaiting your response.",
    emails: ["e-3"],
    priority: "medium",
  },
  {
    id: "b-8",
    type: "deadline",
    title: "Performance Reviews Due Feb 28",
    description: "Self-assessments due Feb 21. Manager reviews due Feb 28. Calibration March 3-5.",
    emails: ["e-10"],
    priority: "low",
  },
]

export const analyticsData: AnalyticsData[] = [
  { date: "Mon", received: 42, sent: 18, responseTime: 2.1 },
  { date: "Tue", received: 38, sent: 22, responseTime: 1.8 },
  { date: "Wed", received: 55, sent: 31, responseTime: 2.4 },
  { date: "Thu", received: 47, sent: 25, responseTime: 1.5 },
  { date: "Fri", received: 61, sent: 28, responseTime: 3.2 },
  { date: "Sat", received: 12, sent: 5, responseTime: 4.8 },
  { date: "Sun", received: 8, sent: 3, responseTime: 6.1 },
]

export const categoryBreakdown = [
  { name: "Sales", value: 28, fill: "hsl(199, 89%, 48%)" },
  { name: "Support", value: 22, fill: "hsl(162, 63%, 41%)" },
  { name: "Vendor", value: 18, fill: "hsl(43, 74%, 66%)" },
  { name: "Internal", value: 15, fill: "hsl(280, 65%, 60%)" },
  { name: "Finance", value: 10, fill: "hsl(12, 76%, 61%)" },
  { name: "Legal", value: 7, fill: "hsl(215, 14%, 50%)" },
]

export const contactIntelligence: ContactIntelligence[] = [
  {
    email: "sarah.miller@vendorx.com",
    name: "Sarah Miller",
    company: "VendorX",
    role: "Account Director",
    domain: "vendorx.com",
    totalEmails: 47,
    avgResponseTime: "3.2h",
    lastContact: "2026-02-13T09:15:00Z",
    sentimentTrend: "neutral",
    relationship: "strong",
    topics: ["Contracts", "Pricing", "Renewals", "Legal"],
    recentActivity: [
      { date: "2026-02-13", subject: "RE: Q1 Contract Renewal - Updated Terms", direction: "received" },
      { date: "2026-02-10", subject: "Q1 Contract - Legal Review Notes", direction: "received" },
      { date: "2026-02-07", subject: "RE: Q1 Contract Renewal", direction: "sent" },
    ],
  },
  {
    email: "david.park@acmecorp.com",
    name: "David Park",
    company: "AcmeCorp (Internal)",
    role: "VP Engineering",
    domain: "acmecorp.com",
    totalEmails: 89,
    avgResponseTime: "1.1h",
    lastContact: "2026-02-13T08:45:00Z",
    sentimentTrend: "neutral",
    relationship: "strong",
    topics: ["Engineering", "Infrastructure", "Budget", "Incidents"],
    recentActivity: [
      { date: "2026-02-13", subject: "URGENT: Server Outage - Customer Portal Down", direction: "received" },
      { date: "2026-02-12", subject: "RE: Infrastructure Scaling Plan Q2", direction: "sent" },
      { date: "2026-02-11", subject: "Sprint Review Notes", direction: "received" },
    ],
  },
  {
    email: "lisa.wong@partnercorp.net",
    name: "Lisa Wong",
    company: "PartnerCorp",
    role: "Head of Partnerships",
    domain: "partnercorp.net",
    totalEmails: 12,
    avgResponseTime: "5.8h",
    lastContact: "2026-02-13T07:30:00Z",
    sentimentTrend: "positive",
    relationship: "moderate",
    topics: ["Partnerships", "Marketing", "Webinars", "Co-branding"],
    recentActivity: [
      { date: "2026-02-13", subject: "Partnership Proposal - Co-Marketing Campaign Q2", direction: "received" },
      { date: "2026-02-06", subject: "Great meeting at the summit!", direction: "sent" },
    ],
  },
  {
    email: "rachel.kim@acmecorp.com",
    name: "Rachel Kim",
    company: "AcmeCorp (Internal)",
    role: "Enterprise Account Executive",
    domain: "acmecorp.com",
    totalEmails: 63,
    avgResponseTime: "0.8h",
    lastContact: "2026-02-13T10:00:00Z",
    sentimentTrend: "positive",
    relationship: "strong",
    topics: ["Sales", "Enterprise Deals", "Pipeline", "Demos"],
    recentActivity: [
      { date: "2026-02-13", subject: "Deal Alert: Enterprise Plan - GlobalTech ($240K ARR)", direction: "received" },
      { date: "2026-02-12", subject: "RE: GlobalTech Demo Follow-up", direction: "sent" },
      { date: "2026-02-11", subject: "Pipeline Update - Week 7", direction: "received" },
    ],
  },
  {
    email: "j.foster@legalhq.com",
    name: "James Foster",
    company: "LegalHQ Partners",
    role: "Attorney",
    domain: "legalhq.com",
    totalEmails: 22,
    avgResponseTime: "8.4h",
    lastContact: "2026-02-12T16:20:00Z",
    sentimentTrend: "neutral",
    relationship: "moderate",
    topics: ["NDA", "Acquisitions", "Compliance", "IP"],
    recentActivity: [
      { date: "2026-02-12", subject: "NDA Review Complete - Action Required", direction: "received" },
      { date: "2026-02-09", subject: "RE: TechStart Acquisition - NDA Draft", direction: "sent" },
    ],
  },
]

export const mockProofreadResults: ProofreadResult[] = [
  {
    id: "pr-1",
    type: "grammar",
    severity: "error",
    original: "Their going to review the proposal",
    suggestion: "They're going to review the proposal",
    explanation: "\"Their\" is possessive. Use \"They're\" (they are) for the contraction.",
    position: { start: 0, end: 37 },
  },
  {
    id: "pr-2",
    type: "tone",
    severity: "warning",
    original: "You need to send this ASAP",
    suggestion: "Could you please send this at your earliest convenience?",
    explanation: "The current phrasing may come across as demanding. Consider a more collaborative tone.",
    position: { start: 45, end: 71 },
  },
  {
    id: "pr-3",
    type: "wordiness",
    severity: "suggestion",
    original: "In order to be able to proceed with the next steps",
    suggestion: "To proceed with the next steps",
    explanation: "Removed unnecessary filler words for conciseness.",
    position: { start: 80, end: 130 },
  },
  {
    id: "pr-4",
    type: "clarity",
    severity: "warning",
    original: "We should probably maybe think about considering this option",
    suggestion: "We should consider this option",
    explanation: "Too many hedging words reduce the impact of your message.",
    position: { start: 140, end: 199 },
  },
  {
    id: "pr-5",
    type: "style",
    severity: "suggestion",
    original: "Please do not hesitate to reach out",
    suggestion: "Feel free to reach out",
    explanation: "More modern and concise phrasing while maintaining professionalism.",
    position: { start: 210, end: 245 },
  },
]
