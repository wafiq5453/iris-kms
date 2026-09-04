import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Guna service role key — server-side sahaja, selamat
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const all: any[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, author, type, produk, year, url, sumber_rujukan, source, origin, keywords, tags')
      .range(from, from + 999)
      .order('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  return NextResponse.json(all, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate' } // cache 5 minit
  })
}
