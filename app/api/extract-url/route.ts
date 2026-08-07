import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { fileUrl, fileName, mimeType } = await request.json()

  if (!fileUrl) {
    return NextResponse.json({ error: 'fileUrl diperlukan' }, { status: 400 })
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL
  if (!appsScriptUrl) {
    return NextResponse.json({ error: 'Apps Script tidak dikonfigurasi' }, { status: 500 })
  }

  try {
    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:   'extractFromUrl',
        fileUrl,
        fileName,
        mimeType: mimeType || 'application/pdf',
      }),
    })

    const data = await res.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error || 'Extraction gagal' }, { status: 500 })
    }

    return NextResponse.json({ metadata: data.metadata })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Ralat server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
