import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

export const revalidate = 1800 // 30 min cache

async function parseRss(url: string, sourceName: string) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'IRIS-KMS/2.0 RSS Reader' },
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text()

    const items: Array<{
      id: string; source_name: string; title: string;
      url: string; published_at: string; summary: string; tags: string[]
    }> = []

    // Parse RSS items
    const itemMatches = text.matchAll(/<item>([\s\S]*?)<\/item>/gi)
    for (const match of itemMatches) {
      const item = match[1]
      const title    = decodeHtml(extract(item, 'title'))
      const link     = extract(item, 'link') || extract(item, 'guid')
      const pubDate  = extract(item, 'pubDate') || extract(item, 'dc:date')
      const desc     = decodeHtml(stripHtml(extract(item, 'description')))

      if (!title || !link) continue

      items.push({
        id:          Buffer.from(link).toString('base64').slice(0, 16),
        source_name: sourceName,
        title:       title.slice(0, 200),
        url:         link,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        summary:     desc.slice(0, 400),
        tags:        [],
      })

      if (items.length >= 5) break // max 5 per source
    }

    return items
  } catch {
    return []
  }
}

function extract(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'))
            || xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return m?.[1]?.trim() ?? ''
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
}

export async function GET() {
  try {
    const supabase = getAdminClient()
    const { data: sources } = await supabase
      .from('crawl_sources')
      .select('*')
      .eq('is_active', true)

    if (!sources?.length) {
      return NextResponse.json({ data: [], sources: [] })
    }

    // Fetch all sources in parallel
    const results = await Promise.allSettled(
      sources.map(s => parseRss(s.url, s.name))
    )

    const items = results
      .filter((r): r is PromiseFulfilledResult<typeof items> => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())

    return NextResponse.json({ data: items, sources, total: items.length })
  } catch (err) {
    console.error('Feed error:', err)
    return NextResponse.json({ error: 'Gagal memuatkan suapan' }, { status: 500 })
  }
}
