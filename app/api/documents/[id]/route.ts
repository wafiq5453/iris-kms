import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { summarizeDocument } from '@/lib/gemini'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  const isStaff = session?.role === 'staff'
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Dokumen tidak dijumpai' }, { status: 404 })
  if (data.access_level === 'staff' && !isStaff) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  return NextResponse.json({ data })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await request.json()
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('documents')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const supabase = getAdminClient()

  // Get file path first (for storage cleanup)
  const { data: doc } = await supabase.from('documents').select('file_path').eq('id', params.id).single()
  
  if (doc?.file_path) {
    await supabase.storage.from('documents').remove([doc.file_path])
  }

  const { error } = await supabase.from('documents').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: 'Dokumen dipadam' })
}

// POST /api/documents/[id] — with action
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await request.json()
  const supabase = getAdminClient()

  if (action === 'summarize') {
    const { data: doc } = await supabase
      .from('documents')
      .select('title, content_text, lang, summary')
      .eq('id', params.id)
      .single()

    if (!doc) return NextResponse.json({ error: 'Dokumen tidak dijumpai' }, { status: 404 })

    // Return cached summary if exists
    if (doc.summary) return NextResponse.json({ summary: doc.summary })

    if (!doc.content_text) {
      return NextResponse.json({ error: 'Tiada kandungan untuk dirumuskan' }, { status: 400 })
    }

    const summary = await summarizeDocument(doc.title, doc.content_text, doc.lang)

    // Cache the summary
    await supabase.from('documents').update({ summary }).eq('id', params.id)

    return NextResponse.json({ summary })
  }

  return NextResponse.json({ error: 'Tindakan tidak diketahui' }, { status: 400 })
}
