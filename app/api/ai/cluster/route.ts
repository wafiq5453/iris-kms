import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { summarizeCluster } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documents, label } = await request.json()
  if (!documents?.length) {
    return NextResponse.json({ error: 'Tiada dokumen' }, { status: 400 })
  }

  try {
    const summary = await summarizeCluster(documents, label)
    return NextResponse.json({ summary })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Ralat AI'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
