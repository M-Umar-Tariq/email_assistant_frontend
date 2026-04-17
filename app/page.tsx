"use client"

import Link from "next/link"
import { useState, useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap, registerScrollTrigger } from "@/lib/gsap-ui"
import {
  Mail,
  Sparkles,
  BarChart3,
  Search,
  PenSquare,
  Shield,
  Zap,
  ArrowRight,
  Check,
  Menu,
  X,
  Globe,
  Star,
  Tag,
  Mic,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { BetaLabel } from "@/components/beta-label"
import { cn } from "@/lib/utils"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  // { label: "Pricing", href: "#pricing" },
]

const features = [
  {
    icon: Sparkles,
    title: "Daily Briefing",
    description: "Start each morning with an AI-generated executive summary. Prioritized action items, deadlines, and risks -- across every mailbox.",
  },
  {
    icon: Search,
    title: "Natural language search",
    description:
      "Search across synced mail with plain-English questions. Results lean on indexed content so you can trace answers back to real threads.",
  },
  {
    icon: PenSquare,
    title: "Compose & Smart Mail Assistant",
    description:
      "Write and reply from a dedicated compose experience, then jump into the Smart Mail Assistant for drafting help, tone tweaks, and context-aware suggestions.",
  },
  {
    icon: BarChart3,
    title: "Email analytics",
    description:
      "See volume trends, inbox health, and how mail is flowing over time—built from the same metadata that powers your unified inbox.",
  },
  {
    icon: Globe,
    title: "Multi-mailbox sync",
    description:
      "Connect Gmail, Outlook, and IMAP in one place. Color-coded mailboxes, per-account filters, and automatic sync keep everything current.",
  },
  {
    icon: Tag,
    title: "Labels, follow-ups & calendar",
    description:
      "Teach the model your label rules, track follow-ups, surface contacts, and keep meetings extracted from mail on a built-in calendar view.",
  },
  {
    icon: Mic,
    title: "Voice agent (Pro)",
    description:
      "On the Pro plan, use the in-app voice agent for hands-free navigation and mail tasks—without living inside the keyboard.",
  },
  {
    icon: Shield,
    title: "Security-minded setup",
    description:
      "Encrypted mailbox credentials, OAuth where the provider supports it, and JWT-backed sessions for the app—aligned with how this codebase connects and syncs mail today.",
  },
]

const steps = [
  {
    step: "01",
    title: "Connect your mailboxes",
    description:
      "Sign up and link Gmail, Outlook, or IMAP. Smart Mail AI Beta stores metadata and searchable content so the app can reason across accounts—without replacing your provider’s inbox.",
  },
  {
    step: "02",
    title: "Sync, label, and index",
    description:
      "Background sync pulls new mail, applies your AI label rules, indexes text for search, and (when it makes sense) suggests meetings and follow-ups from what you receive.",
  },
  {
    step: "03",
    title: "Work from one command center",
    description:
      "Triage from a unified inbox; unlock deeper AI, agent automation, and analytics as you move up tiers—with voice only on Pro. Send Feedback anytime when something should work differently.",
  },
]

const plans = [
  {
    name: "Core",
    tagline: "Inbox / Essential",
    mailboxLine: "Up to 3 mailboxes",
    price: "$0",
    description:
      "A full email workspace—sync, triage, and search—plus light AI helpers. No full AI compose suite, autonomous agent, or voice.",
    features: [
      "Up to 3 connected mailboxes (Gmail, Outlook, or IMAP)",
      "Background sync, per-mailbox colors, unified inbox, and account settings",
      "Read, send, reply, and forward; archive, trash, spam, and snooze; attachments",
      "Natural-language search over synced mail (indexed in-app)",
      "Basic AI: suggested questions on a thread and short reply hints",
      "In-app feedback",
    ],
    cta: "Create free account",
    highlighted: true,
  },
  {
    name: "Smart",
    tagline: "Smart AI",
    mailboxLine: "4–15 mailboxes",
    price: "$29",
    description:
      "Everything in Core, scaled for more mailboxes, with the full AI layer—Q&A, briefings, and compose tools. Agent automation and voice stay on Pro.",
    features: [
      "4–15 connected mailboxes with the same sync and security model",
      "Everything in Core",
      "Ask AI across your mail; deep Q&A on a single email",
      "Rich suggested questions and instant replies",
      "AI-assisted compose: generate, rewrite, and proofread; contact intelligence",
      "Daily briefing and AI briefing across connected accounts",
    ],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Pro",
    tagline: "Agent + Ops",
    mailboxLine: "15+ mailboxes",
    price: "$79",
    description:
      "For agencies and high-volume teams: every Smart-tier AI capability, plus the agent, operations tooling, analytics, admin—and the only tier with voice.",
    features: [
      "15+ connected mailboxes (agency, support, or multi-brand inboxes)",
      "Everything in Smart: full AI search, compose, and briefings",
      "AI agent: chat, suggestions, profile, and approved execution",
      "Voice agent (speak)—hands-free navigation and mail tasks",
      "Follow-ups, calendar, email analytics, admin dashboard, and smart relabel",
      "Encrypted credentials and OAuth where the provider supports it",
    ],
    cta: "Get started",
    highlighted: false,
  },
]

const testimonials = [
  {
    id: "wf-1",
    quote:
      "Connect mailboxes, run sync, then use the daily briefing and unified inbox—filter by account or AI labels applied after messages are indexed.",
    name: "Typical flow",
    role: "What the app is built for",
    rating: 5,
  },
  {
    id: "wf-2",
    quote:
      "Ask natural-language questions over synced mail; results point back to real threads. Compose and reply with the in-app AI assistant when you need a draft or tone pass.",
    name: "Search & compose",
    role: "Shipped in the product",
    rating: 5,
  },
  {
    id: "wf-3",
    quote:
      "On Pro, track follow-ups, calendar, and analytics; use the voice agent for hands-free work—then send feedback from inside the app.",
    name: "Ops & voice (Pro)",
    role: "Same codebase you run locally",
    rating: 5,
  },
]

const stats = [
  { value: "IMAP", label: "Gmail, Outlook & IMAP mailboxes" },
  { value: "Sync", label: "Background sync & per-mailbox inbox" },
  { value: "AI", label: "Tiered: essentials → smart AI → agent" },
  { value: "Beta", label: "Features match the live app" },
]

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const items = navRef.current?.querySelectorAll("[data-gsap='nav-item']")
      if (!items?.length) return
      gsap.from(items, {
        y: -14,
        opacity: 0,
        duration: 0.48,
        stagger: 0.07,
        ease: "power2.out",
      })
    },
    { scope: navRef },
  )

  useGSAP(
    () => {
      if (!mobileOpen || !mobileMenuRef.current) return
      gsap.from(mobileMenuRef.current.querySelectorAll("[data-gsap='nav-mobile']"), {
        opacity: 0,
        x: -14,
        duration: 0.24,
        stagger: 0.045,
        ease: "power2.out",
      })
    },
    { dependencies: [mobileOpen] },
  )

  return (
    <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" data-gsap="nav-item" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Mail className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="flex items-center text-base font-semibold">
            <span className="text-foreground">Smart Mail </span>
            <span className="text-primary">AI</span>
            <BetaLabel />
          </span>
        </Link>

        <div data-gsap="nav-item" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div data-gsap="nav-item" className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/signup">
              Get started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <button
          data-gsap="nav-item"
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div ref={mobileMenuRef} className="border-t border-border bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                data-gsap="nav-mobile"
                href={link.href}
                className="text-sm text-muted-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div data-gsap="nav-mobile" className="flex flex-col gap-2 pt-2">
              <Button variant="outline" size="sm" asChild className="border-border text-foreground">
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild className="bg-primary text-primary-foreground">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

function HeroSection() {
  const root = useRef<HTMLElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      const items = root.current?.querySelectorAll("[data-gsap='hero']")
      if (!items?.length) return
      gsap.from(items, {
        opacity: 0,
        y: 28,
        duration: 0.55,
        stagger: 0.09,
        ease: "power2.out",
      })
    },
    { scope: root },
  )

  useGSAP(
    () => {
      const glow = glowRef.current
      if (!glow) return
      gsap.to(glow, {
        y: 14,
        scale: 1.05,
        duration: 5.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative flex flex-col items-center px-6 pb-20 pt-32 md:pt-40">
      <div className="absolute inset-0 overflow-hidden">
        <div
          ref={glowRef}
          className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl will-change-transform"
        />
      </div>

      <div className="relative flex max-w-3xl flex-col items-center text-center">
        <div data-gsap="hero" className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">AI-powered Email Workspace</span>
        </div>

        <h1 data-gsap="hero" className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
          Your inbox, understood
          <br />
          <span className="text-primary">by AI</span>
        </h1>

        <p data-gsap="hero" className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Connect all your mailboxes. Get daily briefings, search with natural language, compose with AI, and turn email chaos into actionable clarity.
        </p>

        <div data-gsap="hero" className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-sm">
            <Link href="/signup">
              Create free account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="border-border text-foreground hover:bg-secondary h-12 px-8 text-sm">
            <a href="#features">Explore features</a>
          </Button>
        </div>

        <p data-gsap="hero" className="mt-4 text-xs text-muted-foreground">No credit card to sign up. Beta features evolve weekly—your feedback shapes the roadmap.</p>
      </div>
    </section>
  )
}

function StatsBar() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      registerScrollTrigger()
      const cells = root.current?.querySelectorAll("[data-gsap='stat']")
      if (!cells?.length) return
      gsap.from(cells, {
        scrollTrigger: { trigger: root.current, start: "top 88%" },
        opacity: 0,
        y: 16,
        duration: 0.4,
        stagger: 0.07,
        ease: "power2.out",
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="border-y border-border bg-card/50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-0 divide-x divide-border md:grid-cols-4">
        {stats.map((stat) => {
          const isBeta = stat.value === "Beta"
          return (
            <div
              key={stat.label}
              data-gsap="stat"
              className={cn(
                "flex flex-col items-center gap-2 px-6 py-8",
                isBeta && "bg-amber-500/[0.08] dark:bg-amber-500/10",
              )}
            >
              {isBeta ? (
                <BetaLabel className="!ml-0 scale-110 md:scale-125" />
              ) : (
                <span className="text-2xl font-bold text-foreground md:text-3xl">{stat.value}</span>
              )}
              <span className="text-center text-xs text-muted-foreground">{stat.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FeaturesSection() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (!root.current) return
      registerScrollTrigger()
      const st = { trigger: root.current, start: "top 82%" }
      gsap.from(root.current.querySelectorAll("[data-gsap='feature-head']"), {
        scrollTrigger: st,
        opacity: 0,
        y: 20,
        duration: 0.5,
        stagger: 0.07,
        ease: "power2.out",
      })
      gsap.from(root.current.querySelectorAll("[data-gsap='feature-card']"), {
        scrollTrigger: st,
        opacity: 0,
        y: 22,
        duration: 0.42,
        stagger: 0.05,
        ease: "power2.out",
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="features" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p data-gsap="feature-head" className="mb-3 text-sm font-medium text-primary">Features</p>
          <h2 data-gsap="feature-head" className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Built around how this app actually works
          </h2>
          <p data-gsap="feature-head" className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            Below is what the product is built for—multi-mailbox sync, tiered AI from light hints to full writing & Q&A, agent and ops on Pro, and voice only on the
            top tier—not a slide-deck wish list.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              data-gsap="feature-card"
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/20"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (!root.current) return
      registerScrollTrigger()
      const st = { trigger: root.current, start: "top 82%" }
      gsap.from(root.current.querySelectorAll("[data-gsap='how-head']"), {
        scrollTrigger: st,
        opacity: 0,
        y: 18,
        duration: 0.45,
        stagger: 0.08,
        ease: "power2.out",
      })
      gsap.from(root.current.querySelectorAll("[data-gsap='how-step']"), {
        scrollTrigger: st,
        opacity: 0,
        y: 24,
        duration: 0.45,
        stagger: 0.12,
        ease: "power2.out",
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="how-it-works" className="border-y border-border bg-card/30 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p data-gsap="how-head" className="mb-3 text-sm font-medium text-primary">How it works</p>
          <h2 data-gsap="how-head" className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Up and running in minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.step} data-gsap="how-step" className="relative flex flex-col items-center text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-lg font-bold text-primary">
                {step.step}
              </div>
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+40px)] top-7 hidden h-px w-[calc(100%-80px)] bg-border md:block" />
              )}
              <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (!root.current) return
      registerScrollTrigger()
      const st = { trigger: root.current, start: "top 82%" }
      gsap.from(root.current.querySelectorAll("[data-gsap='testimonial-head']"), {
        scrollTrigger: st,
        opacity: 0,
        y: 18,
        duration: 0.45,
        stagger: 0.07,
        ease: "power2.out",
      })
      gsap.from(root.current.querySelectorAll("[data-gsap='testimonial-card']"), {
        scrollTrigger: st,
        opacity: 0,
        y: 20,
        duration: 0.42,
        stagger: 0.1,
        ease: "power2.out",
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p data-gsap="testimonial-head" className="mb-3 text-sm font-medium text-primary">How it fits together</p>
          <h2 data-gsap="testimonial-head" className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Workflows the app actually supports
          </h2>
          <p data-gsap="testimonial-head" className="mx-auto mt-4 max-w-lg text-pretty text-sm text-muted-foreground">
            Short descriptions of what you can do with sync, briefing, search, and compose—not paid testimonials.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.id} data-gsap="testimonial-card" className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                {`"${t.quote}"`}
              </p>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (!root.current) return
      registerScrollTrigger()
      const st = { trigger: root.current, start: "top 82%" }
      gsap.from(root.current.querySelectorAll("[data-gsap='pricing-head']"), {
        scrollTrigger: st,
        opacity: 0,
        y: 18,
        duration: 0.45,
        stagger: 0.06,
        ease: "power2.out",
      })
      gsap.from(root.current.querySelectorAll("[data-gsap='pricing-card']"), {
        scrollTrigger: st,
        opacity: 0,
        y: 24,
        duration: 0.45,
        stagger: 0.1,
        ease: "power2.out",
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="pricing" className="border-y border-border bg-card/30 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p data-gsap="pricing-head" className="mb-3 text-sm font-medium text-primary">Pricing</p>
          <h2 data-gsap="pricing-head" className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Plans by feature tier—and mailbox scale
          </h2>
          <p data-gsap="pricing-head" className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            Each tier adds stronger AI and automation; higher tiers also raise how many mailboxes you can connect. Paid checkout is not wired yet—sign up free
            while billing is off. Voice agent is exclusive to Pro; listed items match what this repo is built to support.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              data-gsap="pricing-card"
              className={`relative flex flex-col rounded-xl border p-6 ${
                plan.highlighted
                  ? "border-primary bg-card shadow-lg shadow-primary/5"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Current
                </div>
              )}
              <div className="mb-5">
                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{plan.tagline}</p>
                <p className="mt-1 text-sm font-medium text-primary">{plan.mailboxLine}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  {plan.price !== "$0" && <span className="text-sm text-muted-foreground">/month</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <ul className="mb-6 flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`w-full ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <Link href="/signup">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      registerScrollTrigger()
      const items = root.current?.querySelectorAll("[data-gsap='cta']")
      if (!items?.length) return
      gsap.from(items, {
        scrollTrigger: { trigger: root.current, start: "top 85%" },
        opacity: 0,
        y: 20,
        duration: 0.48,
        stagger: 0.08,
        ease: "power2.out",
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h2 data-gsap="cta" className="text-balance text-3xl font-bold text-foreground md:text-4xl">
          Ready to try the workspace?
        </h2>
        <p data-gsap="cta" className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
          Create an account, connect a mailbox, and see the briefing, inbox, and AI tools in minutes. If something’s missing, tell us from Feedback in the app.
        </p>
        <div data-gsap="cta" className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8">
            <Link href="/signup">
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="h-12 border-border px-8">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      registerScrollTrigger()
      const parts = root.current?.querySelectorAll("[data-gsap='footer']")
      if (!parts?.length) return
      gsap.from(parts, {
        scrollTrigger: { trigger: root.current, start: "top 94%" },
        opacity: 0,
        y: 12,
        duration: 0.42,
        stagger: 0.07,
        ease: "power2.out",
      })
    },
    { scope: root },
  )

  return (
    <footer ref={root} className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <div data-gsap="footer" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Mail className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="flex items-center text-sm font-semibold">
            <span className="text-foreground">Smart Mail </span>
            <span className="text-primary">AI</span>
            <BetaLabel className="scale-95" />
          </span>
        </div>
        <div data-gsap="footer" className="flex flex-wrap items-center justify-center gap-6">
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Support</a>
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </div>
        <p data-gsap="footer" className="text-xs text-muted-foreground">
          {"2026 Smart Mail AI Beta. All rights reserved."}
        </p>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-svh bg-background">
      <Navbar />
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      {/* <PricingSection /> */}
      <CtaSection />
      <Footer />
    </main>
  )
}
