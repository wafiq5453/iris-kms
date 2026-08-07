'use client'
import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw, Clock, Globe } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ms } from 'date-fns/locale'
import type { CrawlItem, CrawlSource } from '@/types'

export default function FeedClient() {
  const [items,   setItems]   = useState<CrawlItem[]>([])
  const [sources, setSources] = useState<CrawlSource[]>([])
  const [loading, setLoading] = useState(true)
  const [selSrc,  setSelSrc]  = useState<string>('all')

  useEffect(() => { fetchFeed() }, [])

  async function fetchFeed() {
    setLoading(true)
    try {
      const res  = await fetch('/api/feed')
      const data = await res.json()
      setItems(data.data ?? [])
      setSources(data.sources ?? [])
    } finally {
      setLoading(false)
    }
  }

  const filtered = selSrc === 'all'
    ? items
    : items.filter(i => i.source_name === selSrc)

  return (
    <div className="flex h-full overflow-hidden">

      {/* Sidebar */}
      <aside className="w-48 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Sumber</h2>
        </div>
        <div className="flex-1 p-3">
          <button
            onClick={() => setSelSrc('all')}
            className={`sb-item ${selSrc === 'all' ? 'active' : ''}`}
          >
            <Globe size={13} /> Semua
            <span className="ml-auto text-xs badge badge-slate">{items.length}</span>
          </button>
          {sources.map(src => (
            <button
              key={src.id}
              onClick={() => setSelSrc(src.name)}
              className={`sb-item ${selSrc === src.name ? 'active' : ''}`}
            >
              <span className="truncate text-xs">{src.name}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-slate-100">
          <button onClick={fetchFeed} disabled={loading} className="btn-ghost w-full text-xs justify-center">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Kemaskini
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-16"><RefreshCw size={16} className="animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Globe size={32} strokeWidth={1} className="mb-3" />
            <p className="text-sm">Tiada artikel dalam suapan ini</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-xs text-slate-500 mb-4">{filtered.length} artikel</p>
            {filtered.map(item => (
              <article key={item.id} className="card p-4 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="badge badge-blue text-xs">{item.source_name}</span>
                      {item.published_at && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          {formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: ms })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2 leading-snug hover:text-iris-700">
                      <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                    </h3>
                    {item.summary && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.summary}</p>
                    )}
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 text-iris-500 hover:text-iris-700 p-1"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
