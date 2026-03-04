"use client"

import Link from "next/link"
import { useState } from "react"
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
  MessageSquare,
  Clock,
  Globe,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
]

const features = [
  {
    icon: Sparkles,
    title: "Daily Briefing",
    description: "Start each morning with an AI-generated executive summary. Prioritized action items, deadlines, and risks -- across every mailbox.",
  },
  {
    icon: Search,
    title: "AI Search & Q&A",
    description: "Ask natural-language questions across all your mailboxes. Find commitments, extract data, and get instant answers with source citations.",
  },
  {
    icon: PenSquare,
    title: "Compose Copilot",
    description: "Draft, reply, and rewrite emails with AI assistance. Choose your tone, apply quick templates, and generate context-aware responses.",
  },
  {
    icon: BarChart3,
    title: "Email Analytics",
    description: "Understand your email patterns. Volume trends, response times, top contacts, and category breakdowns in one clean dashboard.",
  },
  {
    icon: Globe,
    title: "Multi-Mailbox Sync",
    description: "Connect Gmail, Outlook, and IMAP accounts. One unified inbox with per-mailbox filtering and color-coded organization.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "End-to-end encryption, audit logs, configurable data retention, and role-based access. SOC 2 Type II compliant.",
  },
]

const steps = [
  {
    step: "01",
    title: "Connect your mailboxes",
    description: "Link your Gmail, Outlook, or IMAP accounts in seconds. MailMind securely syncs your email history.",
  },
  {
    step: "02",
    title: "AI indexes everything",
    description: "Our AI processes and understands every thread, attachment, and relationship across all your accounts.",
  },
  {
    step: "03",
    title: "Get actionable insights",
    description: "Receive daily briefings, ask questions in natural language, and compose emails faster with AI copilot.",
  },
]

const plans = [
  {
    name: "Starter",
    price: "$19",
    description: "For individuals managing personal and work email.",
    features: [
      "Up to 2 mailboxes",
      "Daily AI briefings",
      "Basic search & Q&A",
      "Compose copilot",
      "7-day analytics",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$49",
    description: "For power users and team leads who live in email.",
    features: [
      "Up to 5 mailboxes",
      "Priority briefings with risk alerts",
      "Advanced Q&A with citations",
      "Full compose & rewrite suite",
      "30-day analytics & exports",
      "Slack & webhook integrations",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For organizations needing security, scale, and control.",
    features: [
      "Unlimited mailboxes",
      "Custom AI models & prompts",
      "SSO & SCIM provisioning",
      "Audit logs & compliance",
      "Dedicated support & SLA",
      "On-premise deployment option",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
]

const testimonials = [
  {
    quote: "MailMind cut my email processing time by 60%. The daily briefing alone saves me an hour every morning.",
    name: "Sarah Chen",
    role: "VP of Operations, TechScale",
    rating: 5,
  },
  {
    quote: "The AI search is incredible. I asked 'what did the vendor promise about delivery?' and got an exact answer with sources.",
    name: "Marcus Rivera",
    role: "Head of Procurement, GlobalTrade",
    rating: 5,
  },
  {
    quote: "We rolled this out to our entire executive team. The unified inbox and analytics have transformed how we operate.",
    name: "Emily Park",
    role: "CTO, Nexus Ventures",
    rating: 5,
  },
]

const stats = [
  { value: "60%", label: "less time in email" },
  { value: "3.2x", label: "faster response times" },
  { value: "10K+", label: "teams using MailMind" },
  { value: "99.9%", label: "uptime guaranteed" },
]

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Mail className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold text-foreground">MailMind</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
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

        <div className="hidden items-center gap-3 md:flex">
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
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2">
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
  return (
    <section className="relative flex flex-col items-center px-6 pb-20 pt-32 md:pt-40">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative flex max-w-3xl flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">AI-Powered Email Intelligence</span>
        </div>

        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
          Your inbox, understood
          <br />
          <span className="text-primary">by AI</span>
        </h1>

        <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Connect all your mailboxes. Get daily briefings, search with natural language, compose with AI, and turn email chaos into actionable clarity.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-sm">
            <Link href="/signup">
              Start free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="border-border text-foreground hover:bg-secondary h-12 px-8 text-sm">
            <a href="#features">See how it works</a>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">No credit card required. 14-day free trial.</p>
      </div>
    </section>
  )
}

function StatsBar() {
  return (
    <section className="border-y border-border bg-card/50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-0 divide-x divide-border md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1 px-6 py-8">
            <span className="text-2xl font-bold text-foreground md:text-3xl">{stat.value}</span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium text-primary">Features</p>
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Everything you need to master your inbox
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            MailMind connects to all your email accounts and uses AI to surface what matters, when it matters.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
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
  return (
    <section id="how-it-works" className="border-y border-border bg-card/30 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium text-primary">How it works</p>
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Up and running in minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.step} className="relative flex flex-col items-center text-center">
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
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium text-primary">Testimonials</p>
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Trusted by teams everywhere
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-xl border border-border bg-card p-6">
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
  return (
    <section id="pricing" className="border-y border-border bg-card/30 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium text-primary">Pricing</p>
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
            Start free, upgrade when you need more power. All plans include a 14-day trial.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-6 ${
                plan.highlighted
                  ? "border-primary bg-card shadow-lg shadow-primary/5"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Most popular
                </div>
              )}
              <div className="mb-5">
                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-sm text-muted-foreground">/month</span>}
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
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
          Ready to take control of your inbox?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
          Join thousands of professionals who reclaimed their time with MailMind.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8">
            <Link href="/signup">
              Start free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Mail className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">MailMind</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Support</a>
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </div>
        <p className="text-xs text-muted-foreground">
          {"2026 MailMind. All rights reserved."}
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
      <PricingSection />
      <CtaSection />
      <Footer />
    </main>
  )
}
