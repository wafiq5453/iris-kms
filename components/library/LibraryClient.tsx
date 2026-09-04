'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, X, RefreshCw, Grid3X3, List,
  BookOpen, FileText, SlidersHorizontal
} from 'lucide-react'
import clsx from 'clsx'
import type { Document, DocumentType, SearchFilters } from '@/types'
import { DOC_TYPE_CONFIG } from '@/types'
import DocumentCard from './DocumentCard'
import ReaderPanel from './ReaderPanel'

interface Props { isStaff: boolean }

export default function LibraryClient({ isStaff }: Props) {
  const [docs,     setDocs]     = useState<Document[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState<'grid' | 'list'>('grid')
  const [showSidebar, setShowSidebar] = useState(false)

  const [filters, setFilters] = useState<SearchFilters>({
    query: '', type: 'all', year: undefined, tags: [], access: 'all'
  })
  const [inputVal, setInputVal] = useState('')
  const searchTimer = useRef<NodeJS.Timeout>()

  const [selected,   setSelected]   = useState<Document | null>(null)
  const [readerOpen, setReaderOpen] = useState(false)

  const typeCounts = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] ?? 0) + 1; return acc
  }, {})
  const allTags = Array.from(new Set(docs.flatMap(d => d.tags ?? []))).slice(0, 30)
  const years   = Array.from(new Set(docs.map(d => d.year).filter(Boolean))).sort((a, b) => b! - a!)

  const fetchDocs = useCallback(async (f: SearchFilters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (f.query) params.set('q', f.query)
      if (f.type && f.type !== 'all') params.set('type', f.type)
      if (f.year)  params.set('year', String(f.year))
      if (f.tags?.length) f.tags.forEach(t => params.append('tag', t))
      params.set('limit', '500')
      const res  = await fetch(`/api/documents?${params}`)
      const data = await res.json()
      setDocs(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch { setDocs([]) }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { fetchDocs(filters) }, [filters, fetchDocs])

  function handleSearch(val: string) {
    setInputVal(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setFilters(f => ({ ...f, query: val })), 350)
  }

  function toggleTag(tag: string) {
    setFilters(f => ({
      ...f,
      tags: f.tags?.includes(tag) ? f.tags.filter(t => t !== tag) : [...(f.tags ?? []), tag]
    }))
  }

  function clearFilters() {
    setInputVal('')
    setFilters({ query: '', type: 'all', year: undefined, tags: [], access: 'all' })
  }

  const hasActiveFilters = filters.query || (filters.type && filters.type !== 'all') || filters.year || filters.tags?.length

  function openDoc(doc: Document) {
    setSelected(doc)
    setReaderOpen(true)
    setShowSidebar(false)
  }

  const SidebarContent = () => (
    <>
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="text-2xl font-bold text-iris-700">{total}</div>
        <div className="text-xs text-slate-500 mt-0.5">dokumen dalam koleksi</div>
      </div>
      <div className="px-3 pt-4 pb-2">
        <p className="section-label">Semua</p>
        <button
          onClick={() => { setFilters(f => ({ ...f, type: 'all' })); setShowSidebar(false) }}
          className={clsx('sb-item', (!filters.type || filters.type === 'all') && 'active')}
        >
          <BookOpen size={14} />
          <span>Semua Dokumen</span>
          <span className="ml-auto text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">{total}</span>
        </button>
      </div>
      {Object.entries(typeCounts).length > 0 && (
        <div className="px-3 py-2">
          <p className="section-label">Jenis</p>
          {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
            const cfg = DOC_TYPE_CONFIG[type as DocumentType]
            return (
              <button
                key={type}
                onClick={() => { setFilters(f => ({ ...f, type: type as DocumentType })); setShowSidebar(false) }}
                className={clsx('sb-item', filters.type === type && 'active')}
              >
                <span>{cfg?.icon ?? '📄'}</span>
                <span className="truncate">{cfg?.label ?? type}</span>
                <span className="ml-auto text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">{count}</span>
              </button>
            )
          })}
        </div>
      )}
      {allTags.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-100">
          <p className="section-label">Tag</p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={clsx(
                  'text-xs px-2 py-0.5 rounded-md border transition-colors duration-150',
                  filters.tags?.includes(tag)
                    ? 'bg-iris-100 text-iris-700 border-iris-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-iris-300'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="flex h-full overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-col border-r border-slate-200 bg-white flex-shrink-0 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setShowSidebar(false)} />
          <div className="fixed top-14 left-0 bottom-0 w-72 z-50 bg-white shadow-panel overflow-y-auto lg:hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="font-semibold text-slate-900 text-sm">Filter</span>
              <button onClick={() => setShowSidebar(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Search bar */}
        <div className="bg-white border-b border-slate-200 px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
          {/* Filter button — mobile */}
          <button
            onClick={() => setShowSidebar(true)}
            className="lg:hidden flex-shrink-0 p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-iris-50 hover:text-iris-700 relative"
          >
            <SlidersHorizontal size={16} />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-iris-600 rounded-full text-[9px] text-white flex items-center justify-center">
                !
              </span>
            )}
          </button>

          {/* Search input */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={inputVal}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Cari dokumen, pengarang, entiti..."
              className="input pl-8 pr-8 text-sm"
            />
            {inputVal && (
              <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Year — hidden on smallest screens */}
          <select
            value={filters.year ?? ''}
            onChange={e => setFilters(f => ({ ...f, year: e.target.value ? parseInt(e.target.value) : undefined }))}
            className="input hidden sm:block w-28 text-sm flex-shrink-0"
          >
            <option value="">Semua Tahun</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* View toggle */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden flex-shrink-0">
            <button onClick={() => setView('grid')} className={clsx('p-2', view === 'grid' ? 'bg-iris-50 text-iris-700' : 'text-slate-400')}>
              <Grid3X3 size={14} />
            </button>
            <button onClick={() => setView('list')} className={clsx('p-2', view === 'list' ? 'bg-iris-50 text-iris-700' : 'text-slate-400')}>
              <List size={14} />
            </button>
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="hidden sm:flex btn-ghost text-red-500 hover:text-red-700 hover:bg-red-50 text-xs flex-shrink-0">
              <X size={12} /> Reset
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="bg-iris-50 border-b border-iris-100 px-3 py-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-iris-600 font-medium">Filter:</span>
            {filters.type && filters.type !== 'all' && (
              <span className="badge badge-blue text-xs gap-1">
                {DOC_TYPE_CONFIG[filters.type]?.label ?? filters.type}
                <X size={10} className="cursor-pointer" onClick={() => setFilters(f => ({ ...f, type: 'all' }))} />
              </span>
            )}
            {filters.year && (
              <span className="badge badge-blue text-xs gap-1">
                {filters.year}
                <X size={10} className="cursor-pointer" onClick={() => setFilters(f => ({ ...f, year: undefined }))} />
              </span>
            )}
            {filters.tags?.map(tag => (
              <span key={tag} className="badge badge-blue text-xs gap-1">
                {tag}
                <X size={10} className="cursor-pointer" onClick={() => toggleTag(tag)} />
              </span>
            ))}
          </div>
        )}

        {/* Document grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm">Memuatkan dokumen...</span>
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <FileText size={40} strokeWidth={1} />
              <p className="text-sm font-medium text-slate-600">Tiada dokumen dijumpai</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-iris-600 hover:underline">
                  Cuba kosongkan filter
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="text-xs text-slate-500 mb-3">
                {filters.query ? `${docs.length} keputusan untuk "${filters.query}"` : `${docs.length} dokumen`}
              </div>
              <div className={clsx(
                view === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
                  : 'flex flex-col gap-2'
              )}>
                {docs.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    view={view}
                    selected={selected?.id === doc.id}
                    onSelect={() => openDoc(doc)}
                    isStaff={isStaff}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reader Panel */}
      {selected && (
        <ReaderPanel
          doc={selected}
          open={readerOpen}
          isStaff={isStaff}
          onClose={() => { setReaderOpen(false); setTimeout(() => setSelected(null), 300) }}
          onDocUpdated={updated => setDocs(d => d.map(x => x.id === updated.id ? updated : x))}
        />
      )}
    </div>
  )
}
