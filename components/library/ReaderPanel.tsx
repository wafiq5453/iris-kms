'use client'
import { useState } from 'react'
import { X, Sparkles, ExternalLink, Download, Users, Building2, Globe, Tag, RefreshCw, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import type { Document } from '@/types'
import { DOC_TYPE_CONFIG } from '@/types'

interface Props {
  doc: Document
  open: boolean
  isStaff: boolean
  onClose: () => void
  onDocUpdated: (doc: Document) => void
}

type ReaderTab = 'summary' | 'content' | 'metadata'

export default function ReaderPanel({ doc, open, isStaff, onClose, onDocUpdated }: Props) {
  const [tab, setTab]           = useState<ReaderTab>('summary')
  const [summarizing, setSumm]  = useState(false)
  const [aiText, setAiText]     = useState(doc.summary ?? '')

  const cfg = DOC_TYPE_CONFIG[doc.type] ?? { label: doc.type, icon: '📄', color: '#64748b', bg: '#f1f5f9' }

  async function handleSummarize() {
    setSumm(true)
    try {
      const res  = await fetch(`/api/documents/${doc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize' }),
      })
      const data = await res.json()
      if (data.summary) {
        setAiText(data.summary)
        onDocUpdated({ ...doc, summary: data.summary })
      }
    } catch {
      setAiText('Gagal menjana ringkasan. Cuba lagi.')
    } finally {
      setSumm(false)
    }
  }

  // Render markdown-ish AI output
  function renderAI(text: string) {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <h3 key={i} className="text-sm font-semibold text-slate-900 mt-4 mb-1.5">{line.slice(2, -2)}</h3>
        }
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return <li key={i} className="text-sm text-slate-700 leading-relaxed">{line.slice(2)}</li>
        }
        if (line.trim() === '') return <div key={i} className="h-2" />
        return <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>
      })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx('fixed inset-0 bg-slate-900/30 z-40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={clsx('reader-panel', open ? 'open' : 'closed', 'z-50')}>

        {/* Header */}
        <div className="border-b border-slate-200 p-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span
                className="badge text-xs mb-2"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.icon} {cfg.label}
              </span>
              <h2 className="text-base font-semibold text-slate-900 leading-snug line-clamp-3">{doc.title}</h2>
              {doc.author && <p className="text-xs text-slate-500 mt-1">{doc.author}</p>}
            </div>
            <button onClick={onClose} className="btn-ghost p-1.5 flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {doc.file_url && (
              <a href={doc.file_url} target="_blank" rel="noreferrer" className="btn-primary text-xs py-1.5">
                <ExternalLink size={12} />
                Buka Fail
              </a>
            )}
            {doc.url && doc.url !== '#' && (
              <a href={doc.url} target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1.5">
                <ExternalLink size={12} />
                Sumber
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 flex-shrink-0">
          {(['summary', 'content', 'metadata'] as ReaderTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
                tab === t
                  ? 'text-iris-700 border-iris-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              )}
            >
              {t === 'summary' ? '✦ Ringkasan AI' : t === 'content' ? '📄 Kandungan' : '📋 Metadata'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Summary tab */}
          {tab === 'summary' && (
            <div className="p-4">
              {!aiText ? (
                <div className="text-center py-8">
                  <Sparkles size={32} className="mx-auto text-iris-300 mb-3" />
                  <p className="text-sm text-slate-600 mb-4">Ringkasan AI belum dijana untuk dokumen ini.</p>
                  <button onClick={handleSummarize} disabled={summarizing} className="btn-primary">
                    {summarizing ? <><RefreshCw size={13} className="animate-spin" /> Menjana...</> : <><Sparkles size={13} /> Jana Ringkasan AI</>}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-iris-500 animate-pulse-dot" />
                      <span className="text-xs font-medium text-iris-700 uppercase tracking-wide">Ringkasan AI</span>
                    </div>
                    <button onClick={handleSummarize} disabled={summarizing} className="btn-ghost text-xs p-1">
                      <RefreshCw size={11} className={summarizing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <div className="bg-iris-50 border border-iris-200 rounded-xl p-4 ai-content">
                    {summarizing
                      ? <div className="flex items-center gap-2 text-sm text-slate-500"><RefreshCw size={13} className="animate-spin" />Menjana...</div>
                      : renderAI(aiText)
                    }
                  </div>
                </>
              )}

              {/* Entities section */}
              {(doc.entities.people?.length > 0 || doc.entities.organizations?.length > 0 ||
                doc.entities.countries?.length > 0 || doc.entities.topics?.length > 0) && (
                <div className="mt-5">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Entiti Dikenal Pasti</h4>
                  {doc.entities.people?.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700 mb-1.5">
                        <Users size={12} /> Individu
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {doc.entities.people.map(p => (
                          <span key={p} className="badge text-xs bg-violet-50 text-violet-700 border border-violet-200">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {doc.entities.organizations?.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 mb-1.5">
                        <Building2 size={12} /> Organisasi
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {doc.entities.organizations.map(o => (
                          <span key={o} className="badge text-xs bg-blue-50 text-blue-700 border border-blue-200">{o}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {doc.entities.countries?.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 mb-1.5">
                        <Globe size={12} /> Negara
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {doc.entities.countries.map(c => (
                          <span key={c} className="badge text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {doc.entities.topics?.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-1.5">
                        <Tag size={12} /> Topik
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {doc.entities.topics.map(t => (
                          <span key={t} className="badge text-xs bg-amber-50 text-amber-700 border border-amber-200">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Content tab */}
          {tab === 'content' && (
            <div className="p-4">
              {doc.file_url ? (
                <div>
                  <div className="rounded-xl overflow-hidden border border-slate-200 mb-3" style={{ height: 480 }}>
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(doc.file_url)}&embedded=true`}
                      className="w-full h-full border-none"
                      title={doc.title}
                    />
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs w-full justify-center">
                    <Download size={12} />
                    Muat Turun Fail
                  </a>
                </div>
              ) : doc.content_text ? (
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {doc.content_text.slice(0, 3000)}
                  {doc.content_text.length > 3000 && <span className="text-slate-400">...[teks dipendekkan]</span>}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">Tiada pratonton tersedia.</p>
                  {doc.url && doc.url !== '#' && (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-iris-600 text-sm hover:underline mt-2 block">
                      Buka di sumber asal →
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metadata tab */}
          {tab === 'metadata' && (
            <div className="p-4">
              <div className="space-y-0 divide-y divide-slate-100 text-sm">
                {[
                  ['Tajuk',       doc.title],
                  ['Pengarang',   doc.author],
                  ['Tahun',       doc.year],
                  ['Jenis',       cfg.label],
                  ['Bahasa',      doc.lang],
                  ['Sumber',      doc.source],
                  ['Penerbit',    doc.publisher],
                  ['ISBN',        doc.isbn],
                  ['No. Rujukan', doc.call_number],
                  ['Lokasi',      doc.location],
                  ['Status',      doc.status],
                  ['Akses',       doc.access_level],
                  ['Muka Surat',  doc.pages],
                  ['Saiz Fail',   doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : null],
                  ['Tags',        doc.tags?.join(', ')],
                  ['Keywords',    doc.keywords?.join(', ')],
                ].filter(([, v]) => v).map(([key, val]) => (
                  <div key={String(key)} className="flex gap-4 py-2.5">
                    <span className="text-slate-500 text-xs w-28 flex-shrink-0 pt-0.5">{key}</span>
                    <span className="text-slate-900 text-xs flex-1">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
