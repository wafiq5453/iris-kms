'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Network, Calendar, Search, RefreshCw, Sparkles, X } from 'lucide-react'
import * as d3 from 'd3'
import clsx from 'clsx'
import type { Document, MapNode, MapLink } from '@/types'

type MapView = 'graph' | 'timeline'

const NODE_COLORS: Record<string, string> = {
  topic:        '#1d4ed8',
  document:     '#0891b2',
  person:       '#7c3aed',
  organization: '#059669',
  country:      '#d97706',
}

export default function KnowledgeMapClient() {
  const [view,      setView]      = useState<MapView>('graph')
  const [docs,      setDocs]      = useState<Document[]>([])
  const [query,     setQuery]     = useState('')
  const [selTags,   setSelTags]   = useState<string[]>([])
  const [loading,   setLoading]   = useState(true)
  const [aiText,    setAiText]    = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const allTags = Array.from(new Set(docs.flatMap(d => d.tags))).sort()

  const filteredDocs = docs.filter(d => {
    const matchQ = !query || d.title.toLowerCase().includes(query.toLowerCase())
      || d.entities?.people?.some(p => p.toLowerCase().includes(query.toLowerCase()))
      || d.entities?.topics?.some(t => t.toLowerCase().includes(query.toLowerCase()))
    const matchT = selTags.length === 0 || selTags.every(t => d.tags.includes(t))
    return matchQ && matchT
  })

  useEffect(() => {
    fetch('/api/documents?limit=200')
      .then(r => r.json())
      .then(data => { setDocs(data.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const buildGraph = useCallback((): { nodes: MapNode[]; links: MapLink[] } => {
    const nodes: MapNode[] = []
    const links: MapLink[] = []
    const nodeIds = new Set<string>()

    const addNode = (id: string, label: string, type: MapNode['type'], size = 10) => {
      if (!nodeIds.has(id)) {
        nodeIds.add(id)
        nodes.push({ id, label, type, size })
      }
    }

    filteredDocs.forEach(doc => {
      addNode(`doc:${doc.id}`, doc.title.slice(0, 40), 'document', 8)
      doc.tags.forEach(tag => {
        const tagId = `tag:${tag}`
        addNode(tagId, tag, 'topic', 14)
        links.push({ source: tagId, target: `doc:${doc.id}` })
      })
      doc.entities?.people?.slice(0, 5).forEach(p => {
        const pid = `person:${p}`
        addNode(pid, p, 'person', 10)
        links.push({ source: pid, target: `doc:${doc.id}`, strength: 0.5 })
      })
      doc.entities?.countries?.slice(0, 3).forEach(c => {
        const cid = `country:${c}`
        addNode(cid, c, 'country', 12)
        links.push({ source: cid, target: `doc:${doc.id}`, strength: 0.4 })
      })
    })

    return { nodes, links }
  }, [filteredDocs])

  useEffect(() => {
    if (view !== 'graph' || !svgRef.current || loading) return

    const { nodes, links } = buildGraph()
    if (nodes.length === 0) return

    const el = svgRef.current
    const W  = el.clientWidth || 800
    const H  = el.clientHeight || 500

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el)
    const g   = svg.append('g')

    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', e => g.attr('transform', e.transform))
    )

    const sim = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80).strength((d: any) => d.strength ?? 0.7))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size + 4))

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6)

    const dragBehavior = d3.drag<SVGGElement, MapNode>()
      .on('start', (e, d: any) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
      .on('drag',  (e, d: any) => { d.fx = e.x; d.fy = e.y })
      .on('end',   (e, d: any) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(dragBehavior as any)

    node.append('circle')
      .attr('r',    (d: MapNode) => d.size ?? 8)
      .attr('fill', (d: MapNode) => NODE_COLORS[d.type] ?? '#64748b')
      .attr('fill-opacity', 0.85)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)

    node.append('text')
      .text((d: MapNode) => d.label.length > 20 ? d.label.slice(0, 20) + '…' : d.label)
      .attr('font-size', 9)
      .attr('fill', '#334155')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: MapNode) => (d.size ?? 8) + 10)
      .attr('pointer-events', 'none')

    sim.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => { sim.stop() }
  }, [view, buildGraph, loading])

  async function handleAISummary() {
    if (filteredDocs.length === 0) return
    setAiLoading(true)
    const label = selTags.join(', ') || query || 'semua dokumen'
    try {
      const res  = await fetch('/api/documents?limit=20')
      const data = await res.json()
      const docList = (data.data as Document[]).map((d: Document) => ({
        title: d.title, author: d.author, year: d.year
      }))
      const response = await fetch('/api/ai/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: docList, label }),
      })
      const aiData = await response.json()
      setAiText(aiData.summary ?? '')
    } catch {
      setAiText('Gagal menjana analisis.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="flex h-full overflow-hidden bg-white">
      <div className="w-56 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white">
        <div className="p-3 border-b border-slate-100">
          <h1 className="text-sm font-semibold text-slate-900">Peta Ilmu</h1>
          <p className="text-xs text-slate-400">{filteredDocs.length} dokumen</p>
        </div>

        <div className="p-3 border-b border-slate-100">
          <p className="section-label mb-2">Pandangan</p>
          <div className="space-y-1">
            {[
              { id: 'graph' as MapView,    label: 'Graf Hubungan', Icon: Network },
              { id: 'timeline' as MapView, label: 'Garis Masa',    Icon: Calendar },
            ].map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setView(id)} className={clsx('sb-item', view === id && 'active')}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-b border-slate-100">
          <p className="section-label mb-2">Cari Entiti</p>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Nama, topik..." className="input pl-7 text-xs" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="section-label mb-2">Filter Tag</p>
          <div className="flex flex-wrap gap-1">
            {allTags.map(tag => (
              <button key={tag}
                onClick={() => setSelTags(s => s.includes(tag) ? s.filter(t => t !== tag) : [...s, tag])}
                className={clsx(
                  'text-xs px-2 py-0.5 rounded-md border transition-colors',
                  selTags.includes(tag)
                    ? 'bg-iris-100 text-iris-700 border-iris-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-iris-200'
                )}
              >{tag}</button>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-slate-100">
          <button onClick={handleAISummary} disabled={aiLoading || filteredDocs.length === 0}
            className="btn-primary w-full justify-center text-xs py-2">
            {aiLoading ? <><RefreshCw size={11} className="animate-spin" />Menganalisis...</> : <><Sparkles size={11} />Rumus dengan AI</>}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {aiText && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-iris-50 border-b border-iris-200 p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-medium text-iris-700">
                <Sparkles size={12} /> Analisis AI
              </div>
              <button onClick={() => setAiText('')} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{aiText}</p>
          </div>
        )}

        <div className="absolute top-3 right-3 z-10 bg-white border border-slate-200 rounded-xl p-3 shadow-card">
          <p className="text-xs font-semibold text-slate-500 mb-2">Petunjuk</p>
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-xs text-slate-600 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              {type === 'topic' ? 'Tag/Topik' : type === 'document' ? 'Dokumen' : type === 'person' ? 'Individu' : type === 'organization' ? 'Organisasi' : 'Negara'}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-3 text-slate-500">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Membina peta ilmu...</span>
          </div>
        ) : view === 'graph' ? (
          <svg ref={svgRef} className="flex-1 w-full" style={{ background: '#fafafa' }} />
        ) : (
          <TimelineView docs={filteredDocs} />
        )}
      </div>
    </div>
  )
}

function TimelineView({ docs }: { docs: Document[] }) {
  const byYear = docs.reduce<Record<number, Document[]>>((acc, d) => {
    if (d.year) { acc[d.year] = acc[d.year] ?? []; acc[d.year].push(d) }
    return acc
  }, {})
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {years.map(year => (
        <div key={year} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-xl font-bold text-iris-700">{year}</div>
            <div className="flex-1 h-px bg-iris-100" />
            <span className="text-xs text-slate-400">{byYear[year].length} dokumen</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {byYear[year].map(doc => (
              <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl text-sm hover:border-iris-300 transition-colors">
                <p className="font-medium text-slate-900 line-clamp-2 mb-1">{doc.title}</p>
                {doc.author && <p className="text-xs text-slate-500">{doc.author}</p>}
                {doc.tags.slice(0, 2).map(t => <span key={t} className="tag text-xs mr-1 mt-1 inline-block">{t}</span>)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
