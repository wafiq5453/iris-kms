// ============================================================
// IRIS KMS — Gemini AI Utilities
// ============================================================

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

async function callGemini(
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  maxTokens = 4096
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.2,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return text
}

// ── Metadata extraction from uploaded document ────────────────
export async function extractDocumentMetadata(
  fileBase64: string,
  mimeType: string,
  filename: string
) {
  const prompt = `Kamu adalah sistem ekstraksi metadata untuk sistem pengurusan pengetahuan akademik IRIS Institute Malaysia.

Analisis dokumen ini dan ekstrak maklumat berikut. Kembalikan HANYA objek JSON yang sah, tanpa teks lain, tanpa markdown code block.

{
  "title": "tajuk penuh dokumen (bukan nama fail)",
  "author": "nama pengarang atau penulis, pisah dengan koma jika berbilang",
  "year": 2024,
  "type": "pilih SATU: book|journal|report|manuscript|policy|article|slide|dataset|bulletin|working-paper|strategic-report",
  "lang": "pilih SATU: BM|EN|AR|ZH|Other",
  "source": "nama penerbit, jurnal, atau institusi",
  "publisher": "nama penerbit jika ada",
  "pages": 0,
  "summary": "ringkasan komprehensif 3-4 perenggan dalam bahasa yang sama dengan dokumen. Terangkan isi kandungan utama, hujah, dan kesimpulan.",
  "tags": ["tag1", "tag2", "tag3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "entities": {
    "people": ["senarai nama individu yang disebut dalam dokumen — termasuk pemimpin politik, akademik, tokoh sejarah"],
    "organizations": ["senarai nama organisasi, institusi, syarikat, badan kerajaan"],
    "countries": ["senarai nama negara yang disebut"],
    "topics": ["topik utama — contoh: geopolitik, dasar luar, keselamatan, ekonomi, ASEAN"]
  }
}

Nama fail: ${filename}
`

  const text = await callGemini([
    { text: prompt },
    { inlineData: { mimeType, data: fileBase64 } },
  ], 8192)

  // Extract JSON from response (handle if Gemini wraps in markdown)
  const jsonStr = extractJson(text)
  const parsed = JSON.parse(jsonStr)

  // Ensure entities always has all fields
  if (!parsed.entities) parsed.entities = {}
  parsed.entities.people        = parsed.entities.people        ?? []
  parsed.entities.organizations = parsed.entities.organizations ?? []
  parsed.entities.countries     = parsed.entities.countries     ?? []
  parsed.entities.topics        = parsed.entities.topics        ?? []

  return parsed
}

// ── On-demand AI summarization for existing documents ─────────
export async function summarizeDocument(
  title: string,
  content: string,
  lang = 'BM'
): Promise<string> {
  const langInstruction = lang === 'EN'
    ? 'Write the summary in English.'
    : 'Tulis ringkasan dalam Bahasa Melayu.'

  const prompt = `Kamu adalah analis penyelidikan senior di IRIS Institute.

Dokumen: "${title}"

${langInstruction}

Tulis ringkasan struktur berikut (gunakan format ini dengan tepat):

**Gambaran Keseluruhan**
[2-3 ayat menerangkan apa dokumen ini tentang]

**Kepentingan Strategik**
[Mengapa dokumen ini penting untuk Malaysia dan ASEAN]

**Poin Utama**
• [poin 1]
• [poin 2]
• [poin 3]
• [poin 4 jika ada]

**Kesimpulan**
[1-2 ayat tentang implikasi dan cadangan]

Kandungan dokumen:
${content.slice(0, 6000)}`

  return callGemini([{ text: prompt }], 2048)
}

// ── AI summary for Knowledge Map cluster ──────────────────────
export async function summarizeCluster(
  documents: Array<{ title: string; author?: string; year?: number }>,
  filterLabel: string
): Promise<string> {
  const docList = documents.map(d => `- ${d.title}${d.author ? ` (${d.author})` : ''}${d.year ? `, ${d.year}` : ''}`).join('\n')

  const prompt = `Berdasarkan koleksi dokumen berikut dalam kategori/topik "${filterLabel}", tulis analisis ringkas 2-3 perenggan tentang tema utama, jurang pengetahuan, dan trend yang dapat dikesan.

Dokumen:
${docList}

Analisis:`

  return callGemini([{ text: prompt }], 1024)
}

// ── Search enhancement: extract entities from query ───────────
export async function extractQueryEntities(query: string): Promise<{
  people: string[]
  organizations: string[]
  countries: string[]
  keywords: string[]
}> {
  const prompt = `Dari pertanyaan carian ini, kenal pasti entiti. Kembalikan JSON sahaja, tanpa teks lain.

Query: "${query}"

{
  "people": ["nama individu jika ada"],
  "organizations": ["nama organisasi jika ada"],
  "countries": ["nama negara jika ada"],
  "keywords": ["kata kunci utama"]
}`

  try {
    const text = await callGemini([{ text: prompt }], 256)
    return JSON.parse(extractJson(text))
  } catch {
    return { people: [], organizations: [], countries: [], keywords: [query] }
  }
}

// ── Utility: extract JSON from potentially markdown-wrapped response ──
function extractJson(text: string): string {
  // Remove ```json ... ``` wrapping
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) return match[1].trim()

  // Find first { and last }
  const start = text.indexOf('{')
  const end   = text.lastIndexOf('}')
  if (start !== -1 && end !== -1) return text.slice(start, end + 1)

  return text.trim()
}
