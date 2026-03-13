import { Mail } from "lucide-react"

export default function LoginLoading() {
  return (
    <div className="flex min-h-svh bg-background">
      {/* Left panel - placeholder (matches login layout) */}
      <div className="hidden w-1/2 border-r border-border bg-card p-12 lg:block" />

      {/* Right panel - loading state */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Mail className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading login...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
