import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('wiki_pages')
    .select('*')
    .order('category', { ascending: true })
    .order('title', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (session?.role !== 'staff') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const { title, body, category, slug } = await request.json()
  if (!title) return NextResponse.json({ error: 'Tajuk diperlukan' }, { status: 400 })

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('wiki_pages')
    .insert({ title, body, category, slug: slug || title.toLowerCase().replace(/\s+/g, '-'), tags: [] })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
