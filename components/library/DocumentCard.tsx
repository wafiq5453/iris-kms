'use client'
import { ExternalLink, FileText } from 'lucide-react'
import clsx from 'clsx'
import type { Document, DocumentType } from '@/types'
import { DOC_TYPE_CONFIG } from '@/types'

interface Props {
  doc: Document
  view: 'grid' | 'list'
  selected: boolean
  isStaff: boolean
  onSelect: () => void
}

export default function DocumentCard({ doc, view, selected, onSelect }: Props) {
  const cfg = DOC_TYPE_CONFIG[doc.type as DocumentType] ?? { label: doc.type, icon: '📄', color: '#64748b', bg: '#f1f5f9' }

  if (view === 'list') {
    return (
      <div
        onClick={onSelect}
        className={clsx(
          'flex items-center gap-4 px-4 py-3 bg-white rounded-xl border cursor-pointer transition-all duration-150',
          selected ? 'border-iris-400 bg-iris-50' : 'border-slate-200 hover:border-iris-300 hover:bg-slate-50'
        )}
      >
        <span className="text-xl w-8 text-center flex-shrink-0">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{doc.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {doc.author && <span>{doc.author} · </span>}
            {doc.year && <span>{doc.year} · </span>}
            {doc.source && <span>{doc.source}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="badge text-xs"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {doc.lang && <span className="badge badge-slate text-xs">{doc.lang}</span>}
          {doc.access_level === 'staff' && <span className="badge badge-amber text-xs">Staff</span>}
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'group bg-white rounded-xl border p-4 cursor-pointer transition-all duration-200',
        selected
          ? 'border-iris-400 bg-iris-50 shadow-card-hover'
          : 'border-slate-200 hover:border-iris-300 hover:shadow-card-hover'
      )}
    >
      {/* Type badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="badge text-xs"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.icon} {cfg.label}
        </span>
        {doc.access_level === 'staff' && (
          <span className="badge badge-amber text-xs">Restricted</span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2 leading-snug group-hover:text-iris-700 transition-colors">
        {doc.title}
      </h3>

      {/* Author */}
      {doc.author && (
        <p className="text-xs text-slate-500 mb-1 truncate">{doc.author}</p>
      )}

      {/* Source + year */}
      <p className="text-xs text-slate-400 mb-3">
        {[doc.source, doc.year, doc.lang].filter(Boolean).join(' · ')}
      </p>

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {doc.tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag text-[10px]">{tag}</span>
          ))}
          {doc.tags.length > 3 && (
            <span className="text-[10px] text-slate-400">+{doc.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Entity preview (key feature) */}
      {(doc.entities?.people?.length > 0 || doc.entities?.countries?.length > 0) && (
        <div className="border-t border-slate-100 pt-2 mt-1">
          {doc.entities.people?.slice(0, 2).map(p => (
            <span key={p} className="inline-flex items-center gap-1 text-[10px] text-violet-700 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5 mr-1 mb-1">
              👤 {p}
            </span>
          ))}
          {doc.entities.countries?.slice(0, 2).map(c => (
            <span key={c} className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 mr-1 mb-1">
              🌍 {c}
            </span>
          ))}
        </div>
      )}

      {/* Pages */}
      {doc.pages && (
        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
          <FileText size={11} />
          {doc.pages} muka surat
        </div>
      )}
    </div>
  )
}
