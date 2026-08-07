import { headers } from 'next/headers'
import WikiClient from '@/components/wiki/WikiClient'

export default async function WikiPage() {
  const h    = await headers()
  const role = h.get('x-user-role') ?? 'researcher'
  return <WikiClient isStaff={role === 'staff'} />
}
