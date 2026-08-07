import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getStoragePath, BUCKET } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { extractDocumentMetadata } from '@/lib/gemini'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const SUPPORTED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/msword': 'doc',
  'text/plain': 'txt',
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const formData  = await request.formData()
    const file      = formData.get('file') as File | null
    const saveMode  = formData.get('save') as string // 'extract-only' | 'save'
    const metaJson  = formData.get('metadata') as string // override metadata when saving

    if (!file) return NextResponse.json({ error: 'Tiada fail diterima' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Fail terlalu besar. Had: 50MB` }, { status: 413 })
    }
    if (!SUPPORTED_TYPES[file.type]) {
      return NextResponse.json({ error: `Jenis fail tidak disokong: ${file.type}` }, { status: 415 })
    }

    const supabase    = getAdminClient()
    const fileType    = SUPPORTED_TYPES[file.type]
    const storagePath = getStoragePath(file.name, fileType)

    // ── Step 1: Upload to Supabase Storage ────────────────────
    const fileBuffer  = await file.arrayBuffer()
    const fileBytes   = new Uint8Array(fileBuffer)

    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBytes, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (storageError) {
      return NextResponse.json({ error: `Gagal upload: ${storageError.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storageData.path)
    const publicUrl = urlData.publicUrl

    // ── Step 2: AI Metadata Extraction ────────────────────────
    // Convert file to base64 for Gemini
    const base64 = Buffer.from(fileBytes).toString('base64')
    let metadata

    try {
      metadata = await extractDocumentMetadata(base64, file.type, file.name)
    } catch (aiError) {
      console.error('AI extraction error:', aiError)
      // Return partial result with file uploaded but AI failed
      return NextResponse.json({
        file_url: publicUrl,
        file_path: storagePath,
        ai_error: 'Gagal mengekstrak metadata AI. Sila isi manual.',
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          author: '',
          year: new Date().getFullYear(),
          type: 'report',
          lang: 'BM',
          source: 'IRIS Institute',
          summary: '',
          tags: [],
          keywords: [],
          entities: { people: [], organizations: [], countries: [], topics: [] },
        },
      })
    }

    // ── Step 3: If save mode, save to database ────────────────
    if (saveMode === 'save') {
      const override = metaJson ? JSON.parse(metaJson) : {}
      const finalMeta = { ...metadata, ...override }

      const { data: doc, error: dbError } = await supabase
        .from('documents')
        .insert({
          title:        finalMeta.title,
          author:       finalMeta.author,
          type:         finalMeta.type,
          year:         finalMeta.year,
          lang:         finalMeta.lang,
          source:       finalMeta.source,
          publisher:    finalMeta.publisher,
          pages:        finalMeta.pages,
          summary:      finalMeta.summary,
          tags:         finalMeta.tags ?? [],
          keywords:     finalMeta.keywords ?? [],
          entities:     finalMeta.entities,
          file_url:     publicUrl,
          file_path:    storagePath,
          file_size:    file.size,
          file_type:    file.type,
          access_level: finalMeta.access_level ?? 'public',
          status:       'digital',
          created_by:   session.id,
        })
        .select()
        .single()

      if (dbError) {
        return NextResponse.json({ error: `Gagal simpan: ${dbError.message}` }, { status: 500 })
      }

      return NextResponse.json({ document: doc, metadata, file_url: publicUrl })
    }

    // ── Default: return extraction result for preview ─────────
    return NextResponse.json({
      file_url:  publicUrl,
      file_path: storagePath,
      file_size: file.size,
      metadata,
    })

  } catch (err: unknown) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Ralat server semasa upload' }, { status: 500 })
  }
}
