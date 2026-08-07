'use client'
import { useState, useCallback, DragEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Upload, FileText, CheckCircle2, AlertCircle, X,
  Sparkles, RefreshCw, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react'
import clsx from 'clsx'
import type { UploadFile, ExtractedMetadata, DocumentType, DocumentLang } from '@/types'
import { DOC_TYPE_CONFIG } from '@/types'

// Client-side Supabase (untuk upload direct — bypass Vercel 4.5MB limit)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ACCEPTED = '.pdf,.docx,.pptx,.xlsx,.doc,.txt'
const MAX_SIZE  = 50 * 1024 * 1024 // 50MB
const BUCKET    = 'documents'

function getStoragePath(filename: string): string {
  const date  = new Date()
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const clean = filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase()
  const uid   = Math.random().toString(36).slice(2, 8)
  return `${year}/${month}/${uid}_${clean}`
}

export default function UploadClient() {
  const [files,    setFiles]    = useState<UploadFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [activePreview, setActivePreview] = useState<number | null>(null)

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  function addFiles(newFiles: File[]) {
    const valid = newFiles.filter(f => {
      if (f.size > MAX_SIZE) { alert(`${f.name}: Fail terlalu besar (had 50MB)`); return false }
      return true
    })
    setFiles(prev => [...prev, ...valid.map(file => ({ file, step: 'drop' as const, progress: 0 }))])
  }

  function updateFile(idx: number, patch: Partial<UploadFile>) {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }

  function updateMetadata(idx: number, patch: Partial<ExtractedMetadata>) {
    setFiles(prev => prev.map((f, i) =>
      i === idx ? { ...f, metadata: f.metadata ? { ...f.metadata, ...patch } : f.metadata } : f
    ))
  }

  async function processFile(idx: number) {
    const item = files[idx]
    updateFile(idx, { step: 'uploading', progress: 10 })

    try {
      // Step 1: Upload direct ke Supabase Storage dari browser (bypass Vercel limit)
      const storagePath = getStoragePath(item.file.name)
      const { data: storageData, error: storageError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, item.file, { cacheControl: '3600', upsert: false })

      if (storageError) throw new Error(`Upload gagal: ${storageError.message}`)

      updateFile(idx, { progress: 50, storagePath })

      // Step 2: Get public URL
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storageData.path)
      const publicUrl = urlData.publicUrl

      updateFile(idx, { progress: 70, publicUrl, step: 'extracting' })

      // Step 3: Hantar file path ke API untuk AI extraction
      // Hantar fail kecil sebagai base64, fail besar skip extraction
      let metadata: ExtractedMetadata
      if (item.file.size <= 4 * 1024 * 1024) {
        // Fail < 4MB — hantar ke API untuk Gemini extraction
        const formData = new FormData()
        formData.append('file', item.file)
        formData.append('file_path', storagePath)
        formData.append('file_url', publicUrl)

        const res  = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Extraction gagal')
        metadata = data.metadata
      } else {
        // Fail > 4MB — isi metadata manual (Vercel limit)
        metadata = {
          title:     item.file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
          author:    '',
          year:      new Date().getFullYear(),
          type:      'report' as DocumentType,
          lang:      'BM' as DocumentLang,
          source:    'IRIS Institute',
          summary:   '',
          tags:      [],
          keywords:  [],
          entities:  { people: [], organizations: [], countries: [], topics: [] },
        }
      }

      updateFile(idx, { step: 'preview', progress: 100, metadata, publicUrl, storagePath })
      setActivePreview(idx)

    } catch (err: unknown) {
      updateFile(idx, { step: 'drop', progress: 0, error: err instanceof Error ? err.message : 'Ralat' })
    }
  }

  async function saveFile(idx: number) {
    const item = files[idx]
    if (!item.metadata || !item.storagePath) return
    updateFile(idx, { step: 'saving' })

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item.metadata,
          file_url:    item.publicUrl,
          file_path:   item.storagePath,
          file_size:   item.file.size,
          file_type:   item.file.type,
          status:      'digital',
          access_level: 'public',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal simpan')
      }

      updateFile(idx, { step: 'done', progress: 100 })
    } catch (err: unknown) {
      updateFile(idx, { step: 'preview', error: err instanceof Error ? err.message : 'Ralat' })
    }
  }

  const previewFiles = files.filter(f => f.step === 'preview' || f.step === 'saving' || f.step === 'done')

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">

      {/* Left: Drop + Queue */}
      <div className="w-full lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col max-h-72 lg:max-h-full">
        <div className="p-4 border-b border-slate-100 flex-shrink-0">
          <h1 className="text-base font-semibold text-slate-900">Upload Dokumen</h1>
          <p className="text-xs text-slate-500 mt-0.5">AI extract metadata — fail &lt;4MB automatik, lebih besar isi manual</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div
            className={clsx('drop-zone', dragging && 'drag-over')}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload size={24} className="mx-auto text-iris-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">Seret & lepas atau klik</p>
            <p className="text-xs text-slate-400 mt-1">PDF, DOCX, PPTX, XLSX · Had: 50MB</p>
            <input id="file-input" type="file" multiple accept={ACCEPTED} className="hidden"
              onChange={e => addFiles(Array.from(e.target.files ?? []))} />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-base flex-shrink-0">
                    {item.step === 'done' ? '✅' : item.step === 'uploading' || item.step === 'extracting' || item.step === 'saving' ? '⏳' : '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium truncate">{item.file.name}</p>
                    <p className="text-slate-400">{(item.file.size / 1024 / 1024).toFixed(1)} MB
                      {item.file.size > 4 * 1024 * 1024 && <span className="text-amber-500 ml-1">· isi manual</span>}
                    </p>
                    {item.error && <p className="text-red-500 mt-0.5 text-[10px] leading-tight">{item.error}</p>}
                    {(item.step === 'uploading' || item.step === 'extracting') && (
                      <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-iris-500 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    {item.step === 'extracting' && <p className="text-iris-600 mt-0.5 flex items-center gap-1"><Sparkles size={10} /> AI mengekstrak...</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {item.step === 'drop' && (
                      <button onClick={() => processFile(idx)} className="btn-primary text-xs py-1 px-2">
                        Proses <ChevronRight size={10} />
                      </button>
                    )}
                    {(item.step === 'preview' || item.step === 'done') && (
                      <button onClick={() => setActivePreview(activePreview === idx ? null : idx)} className="text-iris-600 p-1">
                        {activePreview === idx ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    )}
                    <button onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 p-1">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Metadata preview */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
        {previewFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
            <Sparkles size={32} strokeWidth={1} className="mb-3 text-iris-200" />
            <p className="text-sm text-slate-500 font-medium">Pratonton metadata</p>
            <p className="text-xs text-slate-400 mt-1">Upload fail dan tekan "Proses"</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {files.map((item, idx) => (
              (item.step === 'preview' || item.step === 'saving' || item.step === 'done') &&
              (activePreview === null || activePreview === idx) ? (
                <MetadataForm key={idx} item={item}
                  onUpdate={patch => updateMetadata(idx, patch)}
                  onSave={() => saveFile(idx)} />
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetadataForm({ item, onUpdate, onSave }: {
  item: UploadFile
  onUpdate: (p: Partial<ExtractedMetadata>) => void
  onSave: () => void
}) {
  const m = item.metadata
  if (!m) return null
  const disabled = item.step === 'done' || item.step === 'saving'
  const isLarge = item.file.size > 4 * 1024 * 1024
  const DOC_TYPES: DocumentType[] = ['book','journal','report','manuscript','policy','article','slide','dataset','bulletin','working-paper','strategic-report']
  const LANGS: DocumentLang[] = ['BM','EN','AR','ZH','Other']

  return (
    <div className={clsx('bg-white rounded-xl border shadow-card', item.step === 'done' && 'border-emerald-300')}>
      <div className="flex items-center gap-3 p-4 border-b border-slate-100">
        <FileText size={16} className="text-iris-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{item.file.name}</p>
          <p className="text-xs text-slate-400">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        {item.step === 'done' && <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 size={13} /> Disimpan</span>}
        {item.step === 'saving' && <span className="flex items-center gap-1 text-xs text-iris-600"><RefreshCw size={11} className="animate-spin" /> Menyimpan...</span>}
      </div>

      <div className={clsx('px-4 py-2 border-b flex items-center gap-2', isLarge ? 'bg-amber-50 border-amber-100' : 'bg-iris-50 border-iris-100')}>
        <Sparkles size={12} className={isLarge ? 'text-amber-600' : 'text-iris-600'} />
        <span className={clsx('text-xs font-medium', isLarge ? 'text-amber-700' : 'text-iris-700')}>
          {isLarge ? 'Fail besar — sila isi metadata secara manual' : 'Metadata diekstrak oleh Gemini AI — semak dan pinda jika perlu'}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="input-label">Tajuk *</label>
          <input type="text" className="input" value={m.title} onChange={e => onUpdate({ title: e.target.value })} disabled={disabled} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="input-label">Pengarang</label>
            <input type="text" className="input" value={m.author} onChange={e => onUpdate({ author: e.target.value })} disabled={disabled} />
          </div>
          <div>
            <label className="input-label">Tahun</label>
            <input type="number" className="input" value={m.year} onChange={e => onUpdate({ year: parseInt(e.target.value) })} disabled={disabled} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="input-label">Jenis</label>
            <select className="input" value={m.type} onChange={e => onUpdate({ type: e.target.value as DocumentType })} disabled={disabled}>
              {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_TYPE_CONFIG[t]?.label ?? t}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Bahasa</label>
            <select className="input" value={m.lang} onChange={e => onUpdate({ lang: e.target.value as DocumentLang })} disabled={disabled}>
              {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="input-label">Sumber / Penerbit</label>
          <input type="text" className="input" value={m.source} onChange={e => onUpdate({ source: e.target.value })} disabled={disabled} />
        </div>
        <div>
          <label className="input-label">Tag <span className="text-slate-400">(pisah koma)</span></label>
          <input type="text" className="input" value={m.tags.join(', ')}
            onChange={e => onUpdate({ tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} disabled={disabled} />
        </div>
        <div>
          <label className="input-label">Ringkasan</label>
          <textarea className="input min-h-[80px]" value={m.summary} onChange={e => onUpdate({ summary: e.target.value })} disabled={disabled} />
        </div>
        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
          <h4 className="text-xs font-semibold text-slate-600">Entiti</h4>
          {(['people', 'organizations', 'countries', 'topics'] as const).map(type => (
            <div key={type}>
              <label className="text-xs text-slate-500 mb-1 block">
                {type === 'people' ? '👤 Individu' : type === 'organizations' ? '🏛️ Organisasi' : type === 'countries' ? '🌍 Negara' : '💡 Topik'}
              </label>
              <input type="text" className="input text-xs"
                value={(m.entities[type] ?? []).join(', ')}
                onChange={e => onUpdate({ entities: { ...m.entities, [type]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                disabled={disabled} placeholder="Pisah dengan koma..." />
            </div>
          ))}
        </div>
      </div>

      {item.step === 'preview' && (
        <div className="flex items-center gap-3 p-4 border-t border-slate-100">
          {item.error && <p className="text-xs text-red-500 flex items-center gap-1 flex-1"><AlertCircle size={12} />{item.error}</p>}
          <button onClick={onSave} className="btn-primary ml-auto">
            <CheckCircle2 size={14} /> Simpan ke Perpustakaan
          </button>
        </div>
      )}
    </div>
  )
}
