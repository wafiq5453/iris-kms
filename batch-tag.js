// IRIS KMS — Batch Tag Generator
// Run: node batch-tag.js
// Generates tags for all documents using Gemini AI

const { createClient } = require('@supabase/supabase-js')

// ── CONFIG — isi nilai dari .env.local kamu ──────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      || 'TUKAR_INI'
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY     || 'TUKAR_INI'
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY                || 'TUKAR_INI'
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function generateTags(title, author, keywords) {
  const prompt = `Kamu adalah sistem pengurusan pengetahuan. Berikan 3-6 tag tematik dalam Bahasa Melayu atau Bahasa Inggeris untuk dokumen ini.

Tajuk: ${title}
Pengarang: ${author || '-'}
Keywords: ${keywords || '-'}

Peraturan:
- Tag mesti berkaitan topik utama (contoh: geopolitik, Malaysia, ASEAN, dasar luar, keselamatan, ekonomi, sejarah, dll)
- Jangan guna nama pengarang sebagai tag
- Tag pendek (1-3 perkataan)
- Kembalikan HANYA senarai tag, pisah dengan koma. Tiada teks lain.

Contoh output: Malaysia, geopolitik, dasar luar, ASEAN`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0.3 }
        })
      }
    )
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const tags = text.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0 && t.length < 40)
    return tags
  } catch (e) {
    console.error('  Gemini error:', e.message)
    return []
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  console.log('IRIS KMS — Batch Tag Generator')
  console.log('================================')

  // Fetch all docs without meaningful tags
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, author, keywords, tags')
    .order('created_at', { ascending: true })

  if (error) { console.error('DB error:', error.message); return }

  const toProcess = docs.filter(d => {
    const tags = d.tags || []
    return tags.length === 0
  })

  console.log(`Jumlah dokumen: ${docs.length}`)
  console.log(`Perlu tag: ${toProcess.length}`)
  console.log('')

  let success = 0, failed = 0

  for (let i = 0; i < toProcess.length; i++) {
    const doc = toProcess[i]
    process.stdout.write(`[${i+1}/${toProcess.length}] ${doc.title.slice(0, 50)}...`)

    const tags = await generateTags(doc.title, doc.author, doc.keywords?.join(', '))

    if (tags.length > 0) {
      const { error: updateErr } = await supabase
        .from('documents')
        .update({ tags })
        .eq('id', doc.id)

      if (updateErr) {
        console.log(' ❌', updateErr.message)
        failed++
      } else {
        console.log(` ✓ [${tags.join(', ')}]`)
        success++
      }
    } else {
      console.log(' ⚠ tiada tags')
      failed++
    }

    // Delay to avoid rate limiting (1 req/sec)
    if (i < toProcess.length - 1) await sleep(1000)
  }

  console.log('')
  console.log(`================================`)
  console.log(`Selesai! ✓ ${success} berjaya, ✗ ${failed} gagal`)
}

main().catch(console.error)
