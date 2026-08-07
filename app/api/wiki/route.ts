import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

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
