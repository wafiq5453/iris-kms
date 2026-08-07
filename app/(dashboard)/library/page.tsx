import { headers } from 'next/headers'
import LibraryClient from '@/components/library/LibraryClient'

export default async function LibraryPage() {
  const h    = await headers()
  const role = h.get('x-user-role') ?? 'researcher'
  return <LibraryClient isStaff={role === 'staff'} />
}
