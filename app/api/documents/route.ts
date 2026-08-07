import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// GET /api/documents — list/search documents
export async function GET(request: NextRequest) {
  const session = await getSession()
  const isStaff = session?.role === 'staff'

  const { searchParams } = new URL(request.url)
  const query  = searchParams.get('q') || ''
  const type   = searchParams.get('type')
  const year   = searchParams.get('year')
  const tag    = searchParams.get('tag')
  const limit  = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = getAdminClient()

  try {
    // Use the SQL search function for complex queries
    if (query) {
      const { data, error } = await supabase.rpc('search_documents', {
        query_text: query,
        filter_type: type || null,
        filter_year: year ? parseInt(year) : null,
        filter_access: isStaff ? 'staff' : 'public',
        result_limit: limit,
        result_offset: offset,
      })

      if (error) throw error
      return NextResponse.json({ data, total: data?.length ?? 0 })
    }

    // No query — return all with filters
    let q = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!isStaff) q = q.eq('access_level', 'public')
    if (type)     q = q.eq('type', type)
    if (year)     q = q.eq('year', parseInt(year))
    if (tag)      q = q.contains('tags', [tag])

    const { data, error, count } = await q
    if (error) throw error

    return NextResponse.json({ data, total: count ?? 0 })
  } catch (err: unknown) {
    console.error('Documents GET error:', err)
    return NextResponse.json({ error: 'Gagal memuatkan dokumen' }, { status: 500 })
  }
}

// POST /api/documents — create document (staff only)
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...body,
        created_by: session.id,
        entities: body.entities ?? { people: [], organizations: [], countries: [], topics: [] },
        tags: body.tags ?? [],
        keywords: body.keywords ?? [],
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('Documents POST error:', err)
    return NextResponse.json({ error: 'Gagal menyimpan dokumen' }, { status: 500 })
  }
}
