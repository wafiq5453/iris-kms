'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
// Data diambil melalui API route /api/analytics

// ─── Types ─────────────────────────────────────────────────────────────────
interface Doc {
  id: string
  title: string | null
  author: string | null
  type: string | null
  produk: string | null
  year: number | null
  url: string | null
  sumber_rujukan: string | null
  source: string | null
  origin: string | null
  keywords: string[] | null
  tags: string[] | null
}

interface FreqEntry { label: string; count: number }

// ─── Constants ─────────────────────────────────────────────────────────────
const SKIP_AUTHORS = new Set([
  '-', 'fokusmyadmin', 'Admin', 'FOKUS', 'editorfokus',
  'Wafiqazman', 'Iris Info', 'null', '',
])

const ORIGIN_LABEL: Record<string, string> = {
  fokus_wp:       'fokus.my',
  telegram_fokus: 'Telegram',
  kms_katalog:    'KMS',
}

const WC_COLORS = [
  '#4d8fd1', '#7c6fbd', '#3d9e72', '#c06870',
  '#d4874a', '#6ba3de', '#9b89c4', '#56b38a',
]

// ─── Helpers ───────────────────────────────────────────────────────────────
function getKeywords(doc: Doc): string[] {
  const out: string[] = []
  ;(doc.keywords || []).forEach(k => { if (k?.trim()) out.push(k.trim().toUpperCase()) })
  ;(doc.tags || []).forEach(k => { if (k?.trim()) out.push(k.trim().toUpperCase()) })
  return [...new Set(out)]
}

function freq(
  docs: Doc[],
  keyFn: (d: Doc) => string[],
  filterFn?: (d: Doc) => boolean
): FreqEntry[] {
  const map: Record<string, number> = {}
  docs.forEach(d => {
    if (filterFn && !filterFn(d)) return
    keyFn(d).forEach(k => {
      if (!k || k === 'null' || k.length < 2) return
      map[k] = (map[k] || 0) + 1
    })
  })
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

// ─── Word Cloud ────────────────────────────────────────────────────────────
function WordCloud({
  entries, selected, onSelect,
}: { entries: FreqEntry[]; selected: string | null; onSelect: (v: string | null) => void }) {
  const top = entries.slice(0, 50)
  const max = top[0]?.count || 1
  const min = top[top.length - 1]?.count || 1
  const logMax = Math.log(max + 1), logMin = Math.log(min + 1)

  if (!top.length) return <p className="text-xs text-slate-500 italic">Tiada data</p>

  return (
    <div className="flex flex-wrap gap-2 items-center leading-relaxed">
      {top.map(({ label, count }, i) => {
        const ratio = logMax === logMin ? 0.5 : (Math.log(count + 1) - logMin) / (logMax - logMin)
        const size  = Math.round(11 + ratio * 10)
        const color = WC_COLORS[i % WC_COLORS.length]
        const isSel = selected === label
        return (
          <button
            key={label}
            onClick={() => onSelect(isSel ? null : label)}
            title={`${label}: ${count} rekod`}
            style={{ fontSize: `${size}px`, color, opacity: isSel ? 1 : 0.55 + ratio * 0.45 }}
            className={`font-medium rounded px-1.5 py-0.5 border transition-all ${
              isSel
                ? 'border-amber-500/50 bg-amber-500/10 !text-amber-400 !opacity-100'
                : 'border-transparent hover:border-slate-600 hover:opacity-100'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Bar ──────────────────────────────────────────────────────────────────
function Bar({
  entries, selected, onSelect, limit = 12, yearMode = false,
}: {
  entries: FreqEntry[]
  selected: string | null
  onSelect: (v: string | null) => void
  limit?: number
  yearMode?: boolean
}) {
  const top = entries.slice(0, limit)
  const max = top[0]?.count || 1
  if (!top.length) return <p className="text-xs text-slate-500 italic py-2">Tiada data</p>
  return (
    <div className="flex flex-col gap-1.5">
      {top.map(({ label, count }) => {
        const pct = Math.round((count / max) * 100)
        const isSel = selected === label
        return (
          <button key={label} onClick={() => onSelect(isSel ? null : label)}
            className="flex items-center gap-2 text-left group w-full">
            <span
              className={`shrink-0 text-xs truncate transition-colors ${
                yearMode ? 'w-10 font-mono' : 'w-36'
              } ${isSel ? 'text-amber-400' : 'text-slate-300 group-hover:text-slate-100'}`}
              title={label}
            >{label}</span>
            <div className="flex-1 h-3 bg-slate-800 rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm transition-all ${isSel ? 'bg-amber-400' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-500 w-8 text-right shrink-0">{count}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Filter chip ──────────────────────────────────────────────────────────
function Chip({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 bg-slate-800 border border-amber-500/40 text-amber-400 text-xs rounded px-2 py-1">
      <span className="text-slate-400">{label}:</span> {value}
      <button onClick={onRemove} className="ml-0.5 text-amber-400 hover:text-white text-sm leading-none">×</button>
    </span>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [docs, setDocs]       = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Filters
  const [year,   setYear]   = useState<number | null>(null)
  const [origin, setOrigin] = useState<string>('all')
  const [kw,     setKw]     = useState<string | null>(null)
  const [prod,   setProd]   = useState<string | null>(null)
  const [author, setAuthor] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)
  const PAGE_SIZE = 25

  // Load
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/analytics')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: Doc[] = await res.json()
        setDocs(data)
      } catch (err: any) {
        setError(err.message || 'Gagal memuatkan data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Derived
  const years = useMemo(() =>
    [...new Set(docs.filter(d => d.year).map(d => d.year as number))].sort(),
    [docs]
  )

  const filtered = useMemo(() => docs.filter(d => {
    if (year   && d.year !== year)                          return false
    if (origin !== 'all' && d.origin !== origin)            return false
    if (kw     && !getKeywords(d).includes(kw))             return false
    if (prod   && (d.produk || d.type || '') !== prod)      return false
    if (author && (d.author || '') !== author)              return false
    if (search) {
      const q = search.toLowerCase()
      if (!d.title?.toLowerCase().includes(q) && !d.author?.toLowerCase().includes(q)) return false
    }
    return true
  }), [docs, year, origin, kw, prod, author, search])

  // Chart data
  const kwEntries   = useMemo(() => freq(filtered, d => getKeywords(d)), [filtered])
  const prodEntries = useMemo(() => freq(filtered, d => {
    const v = d.produk || d.type || ''
    return v ? [v] : []
  }), [filtered])
  const authEntries = useMemo(() => freq(
    filtered, d => [d.author || ''],
    d => !SKIP_AUTHORS.has(d.author || '')
  ), [filtered])
  const yearEntries = useMemo(() => freq(
    filtered, d => d.year ? [String(d.year)] : []
  ), [filtered]).sort((a, b) => Number(b.label) - Number(a.label))

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageSlice  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasFilters = year || origin !== 'all' || kw || prod || author || search

  function resetAll() {
    setYear(null); setOrigin('all'); setKw(null)
    setProd(null); setAuthor(null); setSearch(''); setPage(1)
  }

  const selectYear = useCallback((v: string | null) => {
    setYear(v ? Number(v) : null); setPage(1)
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="text-slate-400 text-sm animate-pulse">Memuatkan data analitik…</div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="text-red-400 text-sm">Ralat: {error}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">IK</div>
        <div>
          <div className="text-sm font-semibold text-blue-400">
            IRIS KMC <span className="text-slate-500 font-normal">/ Analitik Pengetahuan</span>
          </div>
          <div className="text-xs text-slate-500">Knowledge Management Centre</div>
        </div>
        <div className="ml-auto flex gap-2">
          <div className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-xs font-mono">
            Jumlah: <span className="text-amber-400 font-semibold">{docs.length}</span>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-xs font-mono">
            Ditapis: <span className="text-amber-400 font-semibold">{filtered.length}</span>
          </div>
          <a href="/library" className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            ← Library
          </a>
        </div>
      </header>

      {/* Active filters */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-5 py-2 flex flex-wrap gap-2 items-center min-h-[38px]">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide shrink-0">Filter</span>
        {!hasFilters && <span className="text-xs text-slate-600 italic">Tiada — papar semua rekod</span>}
        {year   && <Chip label="Tahun"      value={String(year)}                    onRemove={() => { setYear(null); setPage(1) }} />}
        {origin !== 'all' && <Chip label="Platform" value={ORIGIN_LABEL[origin] || origin} onRemove={() => { setOrigin('all'); setPage(1) }} />}
        {kw     && <Chip label="Keyword"    value={kw}                              onRemove={() => { setKw(null); setPage(1) }} />}
        {prod   && <Chip label="Produk"     value={prod}                            onRemove={() => { setProd(null); setPage(1) }} />}
        {author && <Chip label="Penyumbang" value={author}                          onRemove={() => { setAuthor(null); setPage(1) }} />}
        {search && <Chip label="Cari"       value={search}                          onRemove={() => { setSearch(''); setPage(1) }} />}
        {hasFilters && (
          <button onClick={resetAll}
            className="ml-auto text-xs text-slate-500 border border-slate-700 rounded px-2 py-1 hover:border-amber-500 hover:text-amber-400 transition-colors">
            Tetapkan semula
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-2.5 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Tahun</label>
          <select
            value={year || ''}
            onChange={e => { setYear(e.target.value ? Number(e.target.value) : null); setPage(1) }}
            className="bg-slate-800 border border-slate-700 rounded-md text-slate-200 text-sm px-3 py-1.5 outline-none focus:border-blue-500 min-w-[130px]"
          >
            <option value="">Semua tahun</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="w-px h-5 bg-slate-700" />
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Platform</label>
          <div className="flex gap-1">
            {[
              { key: 'all',           label: 'Semua' },
              { key: 'fokus_wp',      label: 'fokus.my' },
              { key: 'telegram_fokus',label: 'Telegram' },
              { key: 'kms_katalog',   label: 'KMS' },
            ].map(o => (
              <button key={o.key}
                onClick={() => { setOrigin(o.key); setPage(1) }}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  origin === o.key
                    ? 'bg-blue-600 border-blue-600 text-white font-medium'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >{o.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Word cloud */}
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Keyword Terpopular</span>
          <span className="text-xs text-slate-600">klik untuk tapis</span>
        </div>
        <WordCloud entries={kwEntries} selected={kw} onSelect={v => { setKw(v); setPage(1) }} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-3">
        <div className="bg-slate-900 p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Produk IRIS</span>
            <span className="text-xs text-slate-600">klik untuk tapis</span>
          </div>
          <Bar entries={prodEntries} selected={prod} onSelect={v => { setProd(v); setPage(1) }} />
        </div>
        <div className="bg-slate-900 p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Penyumbang</span>
            <span className="text-xs text-slate-600">klik untuk tapis</span>
          </div>
          <Bar entries={authEntries} selected={author} onSelect={v => { setAuthor(v); setPage(1) }} />
        </div>
        <div className="bg-slate-900 p-4 col-span-2 sm:col-span-1">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Terbitan Ikut Tahun</span>
          </div>
          <Bar entries={yearEntries} selected={year ? String(year) : null}
            onSelect={v => selectYear(v)} limit={15} yearMode />
        </div>
      </div>

      {/* List */}
      <div className="px-5 pb-10">
        <div className="flex items-center gap-3 py-3 border-b border-slate-800 flex-wrap gap-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Senarai Terbitan</h3>
          <span className="text-xs font-mono text-slate-500">{filtered.length} rekod</span>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Cari tajuk atau penulis…"
            className="ml-auto bg-slate-800 border border-slate-700 rounded-md text-slate-200 text-sm px-3 py-1.5 outline-none focus:border-blue-500 w-full sm:w-64"
          />
        </div>

        {pageSlice.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm italic">
            Tiada rekod untuk tapisan ini.
          </div>
        ) : (
          pageSlice.map(doc => {
            const hasUrl  = !!(doc.url?.startsWith('http'))
            const hasSrc  = !!(doc.sumber_rujukan?.startsWith('http'))
            const produk  = doc.produk || doc.type || ''
            const originLbl = ORIGIN_LABEL[doc.origin || ''] || doc.origin || ''
            const originCls = {
              fokus_wp:       'border-purple-700/40 text-purple-400',
              telegram_fokus: 'border-blue-700/40 text-blue-400',
              kms_katalog:    'border-slate-700 text-slate-500',
            }[doc.origin || ''] || 'border-slate-700 text-slate-500'

            return (
              <div key={doc.id} className="border-b border-slate-800/70 py-3">
                <div className="text-sm leading-snug">
                  {hasUrl ? (
                    <a href={doc.url!} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                      {doc.title || '(tiada tajuk)'}
                    </a>
                  ) : (
                    <span className="text-slate-200">{doc.title || '(tiada tajuk)'}</span>
                  )}
                  {!hasUrl && hasSrc && (
                    <a href={doc.sumber_rujukan!} target="_blank" rel="noreferrer"
                      className="ml-2 text-xs text-slate-500 hover:text-slate-300 italic">
                      ↗ sumber rujukan
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {doc.year && <span className="text-[10px] border border-amber-500/40 text-amber-400 rounded px-1.5 py-0.5 font-mono">{doc.year}</span>}
                  {produk   && <span className="text-[10px] border border-blue-500/30 text-blue-400 rounded px-1.5 py-0.5">{produk}</span>}
                  {doc.author && !SKIP_AUTHORS.has(doc.author) && (
                    <span className="text-[10px] border border-green-600/30 text-green-500 rounded px-1.5 py-0.5">{doc.author}</span>
                  )}
                  {(getKeywords(doc)).slice(0, 2).map(k => (
                    <span key={k} className="text-[10px] border border-slate-700 text-slate-500 rounded px-1.5 py-0.5">{k}</span>
                  ))}
                  {originLbl && <span className={`text-[9px] border rounded px-1.5 py-0.5 ${originCls}`}>{originLbl}</span>}
                </div>
              </div>
            )
          })
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex gap-1.5 pt-5 justify-center flex-wrap">
            {page > 1 && (
              <button onClick={() => setPage(p => p - 1)}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm hover:border-blue-500">‹</button>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p); return acc
              }, [])
              .map((p, i) => p === '...'
                ? <span key={`e${i}`} className="text-slate-600 px-1 text-sm">…</span>
                : <button key={p} onClick={() => setPage(p as number)}
                    className={`rounded px-3 py-1.5 text-sm border transition-colors ${
                      page === p ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 hover:border-blue-500'
                    }`}>{p}</button>
              )}
            {page < totalPages && (
              <button onClick={() => setPage(p => p + 1)}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm hover:border-blue-500">›</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
