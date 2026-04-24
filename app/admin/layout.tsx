import type { Metadata } from "next"
import "./admin.css"

export const metadata: Metadata = {
  title: "Admin · Smart Mail AI Beta",
  description: "Smart Mail AI Beta administration",
  icons: {
    icon: '/favicon.png',
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-app-bg text-slate-100 antialiased">{children}</div>
}
