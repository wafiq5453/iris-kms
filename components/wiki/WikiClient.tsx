'use client'
import { useEffect, useState } from 'react'
import { Globe, Plus, Edit2, RefreshCw, ChevronRight } from 'lucide-react'
import type { WikiPage } from '@/types'

interface Props { isStaff: boolean }

// Simple markdown-to-html converter
function renderMarkdown(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hlu])/gm, '<p>') + '</p>'
}

export default function WikiClient({ isStaff }: Props) {
  const [pages,    setPages]    = useState<WikiPage[]>([])
  const [selected, setSelected] = useState<WikiPage | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [editBody, setEditBody] = useState('')

  useEffect(() => {
    fetchPages()
  }, [])

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

  function startEdit() {
    setEditBody(selected?.body ?? '')
    setEditing(true)
  }

  async function saveEdit() {
    if (!selected) return
    const res = await fetch(`/api/wiki/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: editBody }),
    })
    if (res.ok) {
      const data = await res.json()
      setSelected(data.data)
      setPages(p => p.map(x => x.id === data.data.id ? data.data : x))
      setEditing(false)
    }
  }

  const byCategory = pages.reduce<Record<string, WikiPage[]>>((acc, p) => {
    const cat = p.category ?? 'Umum'
    acc[cat] = acc[cat] ?? []
    acc[cat].push(p)
    return acc
  }, {})

  return (
    <div className="flex h-full overflow-hidden">

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Wiki</h2>
          {isStaff && (
            <button className="btn-ghost p-1.5 text-xs" title="Laman baru">
              <Plus size={13} />
            </button>
          )}
        </div>
        <div className="flex-1 p-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-6"><RefreshCw size={14} className="animate-spin text-slate-400" /></div>
          ) : Object.entries(byCategory).map(([cat, catPages]) => (
            <div key={cat}>
              <p className="section-label">{cat}</p>
              {catPages.map(page => (
                <button
                  key={page.id}
                  onClick={() => { setSelected(page); setEditing(false) }}
                  className={`sb-item ${selected?.id === page.id ? 'active' : ''}`}
                >
                  <Globe size={13} />
                  <span className="truncate">{page.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Globe size={40} strokeWidth={1} className="mb-3" />
            <p className="text-sm">Pilih laman wiki dari senarai</p>
          </div>
        ) : editing ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-900">{selected.title}</h1>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Batal</button>
                <button onClick={saveEdit} className="btn-primary text-sm">Simpan</button>
              </div>
            </div>
            <textarea
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              className="input w-full min-h-[500px] font-mono text-sm"
              placeholder="Tulis dalam format Markdown..."
            />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{selected.title}</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Dikemaskini: {new Date(selected.updated_at).toLocaleDateString('ms-MY')}
                </p>
              </div>
              {isStaff && (
                <button onClick={startEdit} className="btn-secondary text-sm">
                  <Edit2 size={13} /> Edit
                </button>
              )}
            </div>
            <div
              className="wiki-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.body ?? '*Tiada kandungan.*') }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
