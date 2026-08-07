import { headers } from 'next/headers'
import Navbar from '@/components/layout/Navbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const role     = h.get('x-user-role') ?? 'researcher'
  const username = h.get('x-username') ?? ''
  const userId   = h.get('x-user-id') ?? ''

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <Navbar role={role as 'staff' | 'researcher'} username={username} userId={userId} />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
