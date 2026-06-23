import Link from "next/link"

export const metadata = {
  title: "Privacy Policy | Smart Mail AI",
  description: "Privacy Policy for Smart Mail AI.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: April 30, 2026</p>
          <p className="text-sm text-muted-foreground">
            This Privacy Policy explains how Smart Mail AI collects, uses, and protects your information.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            We collect account information (such as name and email), mailbox connection metadata, and data needed to provide
            core features like email sync, search, summaries, compose assistance, and analytics.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">2. How We Use Information</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            We use your information to operate the product, authenticate your account, connect mailboxes, sync and index email
            content, generate AI-assisted responses/features you request, and improve reliability and security.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">3. Google API Data Use</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            If you connect Gmail via Google OAuth, Smart Mail AI accesses only the scopes you authorize. Google user data is
            used solely to provide requested app functionality (for example reading synced messages and sending emails you
            initiate). We do not sell Google user data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">4. Security</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            We use reasonable technical and organizational safeguards to protect your data, including encrypted credential
            storage and authenticated API access controls.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">5. Data Retention</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            We retain data for as long as needed to provide the service, comply with legal obligations, resolve disputes, and
            enforce agreements. You can request deletion of your account data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">6. Contact</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            For privacy questions or requests, contact:{" "}
            <a className="text-primary underline underline-offset-2" href="mailto:support@ran-ai.com">
              support@ran-ai.com
            </a>
          </p>
        </section>

        <div className="pt-4">
          <Link href="/" className="text-sm text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
