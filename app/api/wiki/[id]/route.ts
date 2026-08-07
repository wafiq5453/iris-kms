import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (session?.role !== 'staff') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const { body } = await request.json()
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('wiki_pages').update({ body, updated_by: session.id }).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
