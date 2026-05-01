import Link from "next/link"

export const metadata = {
  title: "Terms of Service | Smart Mail AI",
  description: "Terms of Service for Smart Mail AI.",
}

export default function TermsPage() {
  return (
    <main className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: April 30, 2026</p>
          <p className="text-sm text-muted-foreground">
            These Terms of Service govern your access to and use of Smart Mail AI.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            By using Smart Mail AI, you agree to these Terms. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">2. Service Description</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Smart Mail AI provides tools for mailbox connection, synchronization, search, AI-assisted writing, analytics, and
            related workflow features. Features may change over time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">3. Account Responsibilities</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            You are responsible for maintaining the confidentiality of your account credentials and for activity occurring under
            your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">4. Acceptable Use</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            You agree not to use the service for unlawful activity, abuse, security testing without authorization, or actions
            that disrupt the platform for other users.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">5. Third-Party Services</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Smart Mail AI may integrate with third-party services such as Google APIs. Your use of those services is also
            subject to their terms and policies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            To the maximum extent permitted by law, Smart Mail AI is provided "as is" without warranties, and we are not liable
            for indirect, incidental, special, consequential, or punitive damages.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">7. Changes to Terms</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            We may update these Terms from time to time. Continued use of the service after updates means you accept the
            revised Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Questions about these Terms:{" "}
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
