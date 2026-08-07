'use client'
import { useEffect, useState, useRef } from 'react'
import {
  Search, Plus, Edit2, Save, X, ChevronRight,
  BookOpen, Hash, Clock, RefreshCw, Eye, FileText,
  ChevronDown, Link2, Bold, Italic, List, Heading2
} from 'lucide-react'
import clsx from 'clsx'
import type { WikiPage } from '@/types'

interface Props { isStaff: boolean }

// ── Markdown renderer ─────────────────────────────────────────
function renderMarkdown(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^\*\*\*(.+)\*\*\*$/gm, '<p><strong><em>$1</em></strong></p>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^\-\-\-$/gm, '<hr/>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^(?!<[hublip]).+$/gm, '<p>$&</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/\n{2,}/g, '\n')
}

// ── TOC generator ─────────────────────────────────────────────
function extractTOC(md: string) {
  const headers: { level: number; text: string; id: string }[] = []
  const lines = md.split('\n')
  lines.forEach(line => {
    const m2 = line.match(/^## (.+)$/)
    const m3 = line.match(/^### (.+)$/)
    if (m2) headers.push({ level: 2, text: m2[1], id: m2[1].toLowerCase().replace(/\s+/g, '-') })
    if (m3) headers.push({ level: 3, text: m3[1], id: m3[1].toLowerCase().replace(/\s+/g, '-') })
  })
  return headers
}

const DEFAULT_TEMPLATE = `## Pengenalan

Tulis pengenalan halaman di sini.

## Latar Belakang

Kandungan latar belakang.

## Butiran Utama

### Subtopik 1

Kandungan subtopik.

### Subtopik 2

Kandungan subtopik.

## Rujukan

- Sumber 1
- Sumber 2
`

export default function WikiClient({ isStaff }: Props) {
  const [pages,    setPages]    = useState<WikiPage[]>([])
  const [selected, setSelected] = useState<WikiPage | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [editBody, setEditBody] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editCat,  setEditCat]  = useState('')
  const [search,   setSearch]   = useState('')
  const [creating, setCreating] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { fetchPages() }, [])

  async function fetchPages() {
    setLoading(true)
    try {
      const res  = await fetch('/api/wiki')
      const data = await res.json()
      setPages(data.data ?? [])
      if (data.data?.[0] && !selected) setSelected(data.data[0])
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── Filter + categories ───────────────────────────────────
  const filtered = pages.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.body?.toLowerCase().includes(search.toLowerCase())
  )

  const categories = Array.from(new Set(pages.map(p => p.category ?? 'Umum'))).sort()

  const byCategory = filtered.reduce<Record<string, WikiPage[]>>((acc, p) => {
    const cat = p.category ?? 'Umum'
    acc[cat] = acc[cat] ?? []
    acc[cat].push(p)
    return acc
  }, {})

  // ── Editor toolbar ────────────────────────────────────────
  function insertMd(before: string, after = '') {
    const ta = editorRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const sel   = editBody.substring(start, end)
    const newVal = editBody.substring(0, start) + before + sel + after + editBody.substring(end)
    setEditBody(newVal)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, start + before.length + sel.length)
    }, 0)
  }

  // ── Save ──────────────────────────────────────────────────
  async function handleSave() {
    if (!selected && !creating) return
    setSaving(true)
    try {
      if (creating) {
        const slug = editTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const res  = await fetch('/api/wiki', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editTitle, body: editBody, category: editCat || 'Umum', slug }),
        })
        if (res.ok) {
          const data = await res.json()
          setPages(p => [data.data, ...p])
          setSelected(data.data)
          setCreating(false)
          setEditing(false)
          showToast('Halaman berjaya dicipta')
        }
      } else if (selected) {
        const res = await fetch(`/api/wiki/${selected.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: editBody, title: editTitle, category: editCat }),
        })
        if (res.ok) {
          const data = await res.json()
          setSelected(data.data)
          setPages(p => p.map(x => x.id === data.data.id ? data.data : x))
          setEditing(false)
          showToast('Halaman dikemaskini')
        }
      }
    } finally {
      setSaving(false)
    }
  }

  function startEdit(page: WikiPage) {
    setEditBody(page.body ?? '')
    setEditTitle(page.title)
    setEditCat(page.category ?? 'Umum')
    setEditing(true)
    setCreating(false)
  }

  function startCreate() {
    setEditBody(DEFAULT_TEMPLATE)
    setEditTitle('')
    setEditCat('Umum')
    setCreating(true)
    setEditing(true)
    setSelected(null)
  }

  const toc = selected && !editing ? extractTOC(selected.body ?? '') : []

  // ── Sidebar content ───────────────────────────────────────
  const SidebarContent = () => (
    <>
      <div className="p-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-900">Wiki IRIS</h2>
        {isStaff && (
          <button onClick={() => { startCreate(); setSidebarOpen(false) }}
            className="btn-ghost p-1.5" title="Halaman baru">
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-100 flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari halaman..." className="input pl-8 text-xs py-1.5" />
        </div>
      </div>

      {/* Pages by category */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center py-6"><RefreshCw size={14} className="animate-spin text-slate-400" /></div>
        ) : (
          categories.map(cat => {
            const catPages = byCategory[cat]
            if (!catPages?.length) return null
            return (
              <div key={cat} className="mb-3">
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <Hash size={11} className="text-iris-500" />
                  <span className="text-xs font-semibold text-iris-700 uppercase tracking-wide">{cat}</span>
                  <span className="text-xs text-slate-400 ml-auto">{catPages.length}</span>
                </div>
                {catPages.map(page => (
                  <button key={page.id}
                    onClick={() => { setSelected(page); setEditing(false); setSidebarOpen(false) }}
                    className={clsx(
                      'w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      selected?.id === page.id
                        ? 'bg-iris-100 text-iris-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}>
                    <FileText size={12} className="flex-shrink-0 opacity-50" />
                    <span className="truncate">{page.title}</span>
                    {selected?.id === page.id && <ChevronRight size={12} className="ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )
          })
        )}
      </div>
    </>
  )

  return (
    <div className="flex h-full overflow-hidden bg-white">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-slate-200 bg-slate-50 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-14 left-0 bottom-0 w-72 z-50 bg-slate-50 flex flex-col shadow-panel md:hidden">
            <SidebarContent />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Article / Editor */}
        <div className="flex-1 overflow-y-auto">

          {/* Toolbar */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">

            {/* Mobile sidebar toggle */}
            <button onClick={() => setSidebarOpen(true)} className="md:hidden btn-ghost p-2">
              <BookOpen size={16} />
            </button>

            {selected && !editing && (
              <nav className="flex items-center gap-1 text-xs text-slate-500 flex-1">
                <span>Wiki</span>
                <ChevronRight size={12} />
                <span className="text-iris-600">{selected.category ?? 'Umum'}</span>
                <ChevronRight size={12} />
                <span className="text-slate-900 font-medium truncate">{selected.title}</span>
              </nav>
            )}

            {editing && (
              <span className="text-sm font-medium text-slate-700 flex-1">
                {creating ? 'Halaman Baru' : `Edit: ${selected?.title ?? editTitle}`}
              </span>
            )}

            {!editing && !selected && <span className="flex-1" />}

            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              {isStaff && selected && !editing && (
                <button onClick={() => startEdit(selected)} className="btn-secondary text-xs py-1.5">
                  <Edit2 size={12} /> Edit
                </button>
              )}
              {editing && (
                <>
                  <button onClick={() => { setEditing(false); setCreating(false) }} className="btn-ghost text-xs py-1.5">
                    <X size={12} /> Batal
                  </button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5">
                    {saving ? <><RefreshCw size={12} className="animate-spin" />Menyimpan...</> : <><Save size={12} />Simpan</>}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Editor mode */}
          {editing ? (
            <div className="p-4 max-w-4xl mx-auto">
              {/* Title + Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="sm:col-span-2">
                  <label className="input-label">Tajuk Halaman</label>
                  <input type="text" className="input text-lg font-semibold" value={editTitle}
                    onChange={e => setEditTitle(e.target.value)} placeholder="Tajuk halaman..." />
                </div>
                <div>
                  <label className="input-label">Kategori</label>
                  <input type="text" className="input" value={editCat}
                    onChange={e => setEditCat(e.target.value)}
                    list="categories-list" placeholder="contoh: Geopolitik" />
                  <datalist id="categories-list">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* Markdown toolbar */}
              <div className="flex items-center gap-1 p-2 bg-slate-50 border border-slate-200 border-b-0 rounded-t-lg">
                <button onClick={() => insertMd('**', '**')} title="Bold" className="btn-ghost p-1.5 text-xs"><Bold size={14} /></button>
                <button onClick={() => insertMd('*', '*')} title="Italic" className="btn-ghost p-1.5 text-xs"><Italic size={14} /></button>
                <button onClick={() => insertMd('## ')} title="Heading" className="btn-ghost p-1.5 text-xs"><Heading2 size={14} /></button>
                <button onClick={() => insertMd('- ')} title="List" className="btn-ghost p-1.5 text-xs"><List size={14} /></button>
                <button onClick={() => insertMd('[teks](', ')')} title="Link" className="btn-ghost p-1.5 text-xs"><Link2 size={14} /></button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <span className="text-xs text-slate-400 ml-1">Markdown disokong</span>
              </div>

              {/* Textarea */}
              <textarea
                ref={editorRef}
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                className="w-full border border-slate-200 rounded-b-lg p-4 font-mono text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-iris-500 resize-none"
                style={{ minHeight: '60vh' }}
                placeholder="Tulis kandungan dalam format Markdown..."
              />

              <p className="text-xs text-slate-400 mt-2">
                Guna ## untuk heading, **teks** untuk bold, - untuk senarai, [teks](url) untuk pautan.
              </p>
            </div>

          ) : selected ? (
            /* Article view */
            <div className="flex gap-0">
              <article className="flex-1 p-6 lg:p-8 max-w-3xl">
                {/* Article header */}
                <div className="mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-blue text-xs">{selected.category ?? 'Umum'}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">{selected.title}</h1>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      Dikemaskini {new Date(selected.updated_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {selected.tags?.length > 0 && (
                      <span className="flex items-center gap-1 flex-wrap">
                        {selected.tags.map(t => (
                          <span key={t} className="tag text-[10px]">{t}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Article body */}
                {selected.body ? (
                  <div
                    className="wiki-body"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.body) }}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <FileText size={32} strokeWidth={1} className="mx-auto mb-3" />
                    <p className="text-sm">Halaman ini masih kosong.</p>
                    {isStaff && (
                      <button onClick={() => startEdit(selected)} className="btn-primary text-sm mt-3">
                        <Edit2 size={13} /> Mula Edit
                      </button>
                    )}
                  </div>
                )}
              </article>

              {/* TOC sidebar */}
              {toc.length > 0 && (
                <div className="hidden xl:block w-52 flex-shrink-0 p-4 border-l border-slate-100">
                  <div className="sticky top-16">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Kandungan</p>
                    <nav className="space-y-1">
                      {toc.map((item, i) => (
                        <a key={i} href={`#${item.id}`}
                          className={clsx(
                            'block text-xs text-slate-600 hover:text-iris-700 py-1 leading-snug transition-colors',
                            item.level === 3 && 'pl-3 text-slate-400'
                          )}>
                          {item.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                </div>
              )}
            </div>

          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
              <BookOpen size={40} strokeWidth={1} className="mb-3" />
              <p className="text-sm font-medium text-slate-600">Pilih halaman dari senarai</p>
              {isStaff && (
                <button onClick={startCreate} className="btn-primary text-sm mt-4">
                  <Plus size={14} /> Cipta Halaman Pertama
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast">
          <Save size={13} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
