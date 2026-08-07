import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (session?.role !== 'staff') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const { body, title, category } = await request.json()
  const supabase = getAdminClient()

  const update: Record<string, unknown> = { updated_by: session.id }
  if (body !== undefined)     update.body     = body
  if (title !== undefined)    update.title    = title
  if (category !== undefined) update.category = category

  const { data, error } = await supabase
    .from('wiki_pages')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (session?.role !== 'staff') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const supabase = getAdminClient()
  const { error } = await supabase.from('wiki_pages').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Halaman dipadam' })
}
