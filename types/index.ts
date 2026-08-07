// ============================================================
// IRIS KMS 2.0 — Global Types
// ============================================================

export type UserRole = 'staff' | 'researcher'

export interface User {
  id: string
  username: string
  display_name?: string
  email?: string
  role: UserRole
  is_active: boolean
  last_login?: string
  created_at: string
}

export interface AuthSession {
  user: User
  token: string
}

// ── Document Types ────────────────────────────────────────────
export type DocumentType =
  | 'book' | 'journal' | 'report' | 'manuscript' | 'policy'
  | 'article' | 'slide' | 'dataset' | 'bulletin'
  | 'working-paper' | 'strategic-report' | 'video'

export type DocumentLang = 'BM' | 'EN' | 'AR' | 'ZH' | 'MS' | 'Other'
export type DocumentStatus = 'digital' | 'available' | 'borrowed' | 'reference'
export type DocumentAccess = 'public' | 'staff'

export interface DocumentEntities {
  people: string[]
  organizations: string[]
  countries: string[]
  topics: string[]
}

export interface Document {
  id: string
  title: string
  author?: string
  type: DocumentType
  year?: number
  lang: DocumentLang
  source?: string
  publisher?: string
  isbn?: string
  call_number?: string
  location?: string
  status: DocumentStatus
  access_level: DocumentAccess

  // Content
  file_url?: string
  file_path?: string
  file_size?: number
  file_type?: string
  drive_id?: string
  pages?: number
  url?: string

  // AI-generated
  summary?: string
  content_text?: string
  entities: DocumentEntities

  // Categorization
  tags: string[]
  keywords: string[]

  // Audit
  created_by?: string
  created_at: string
  updated_at: string

  // Search rank (from query)
  rank?: number
}

// ── Extracted Metadata from AI ───────────────────────────────
export interface ExtractedMetadata {
  title: string
  author: string
  year: number
  type: DocumentType
  lang: DocumentLang
  source: string
  summary: string
  tags: string[]
  keywords: string[]
  entities: DocumentEntities
  pages?: number
  publisher?: string
  isbn?: string
}

// ── Upload State ─────────────────────────────────────────────
export type UploadStep = 'drop' | 'uploading' | 'extracting' | 'preview' | 'saving' | 'done'

export interface UploadFile {
  file: File
  step: UploadStep
  progress: number
  error?: string
  storagePath?: string
  publicUrl?: string
  metadata?: ExtractedMetadata
  documentId?: string
}

// ── Search ───────────────────────────────────────────────────
export interface SearchFilters {
  query: string
  type?: DocumentType | 'all'
  year?: number
  tags?: string[]
  access?: DocumentAccess | 'all'
}

export interface SearchResult {
  documents: Document[]
  total: number
  query: string
  entities_found?: {
    people: string[]
    organizations: string[]
    countries: string[]
  }
}

// ── Crawl Feed ───────────────────────────────────────────────
export interface CrawlItem {
  id: string
  source_name: string
  title: string
  url: string
  published_at?: string
  summary?: string
  tags: string[]
}

export interface CrawlSource {
  id: string
  name: string
  url: string
  category?: string
  is_active: boolean
}

// ── Wiki ─────────────────────────────────────────────────────
export interface WikiPage {
  id: string
  slug: string
  title: string
  body?: string
  category?: string
  tags: string[]
  updated_by?: string
  updated_at: string
}

// ── Knowledge Map ────────────────────────────────────────────
export interface MapNode {
  id: string
  label: string
  type: 'topic' | 'document' | 'entity' | 'person' | 'country' | 'organization'
  size?: number
  docCount?: number
  color?: string
  x?: number
  y?: number
}

export interface MapLink {
  source: string
  target: string
  strength?: number
}

export interface MapData {
  nodes: MapNode[]
  links: MapLink[]
}

// ── Admin ────────────────────────────────────────────────────
export interface CreateUserPayload {
  username: string
  password: string
  display_name?: string
  email?: string
  role: UserRole
}

export interface UpdateUserPayload {
  display_name?: string
  email?: string
  role?: UserRole
  is_active?: boolean
  password?: string
}

// ── API Responses ────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

// ── Document Type Config ──────────────────────────────────────
export const DOC_TYPE_CONFIG: Record<DocumentType, { label: string; icon: string; color: string; bg: string }> = {
  'book':            { label: 'Buku',            icon: '📚', color: '#2563eb', bg: '#dbeafe' },
  'journal':         { label: 'Jurnal',           icon: '📖', color: '#059669', bg: '#d1fae5' },
  'report':          { label: 'Laporan',          icon: '📊', color: '#d97706', bg: '#fef3c7' },
  'manuscript':      { label: 'Manuskrip',        icon: '📜', color: '#7c3aed', bg: '#ede9fe' },
  'policy':          { label: 'Dasar',            icon: '⚖️',  color: '#dc2626', bg: '#fee2e2' },
  'article':         { label: 'Artikel',          icon: '📝', color: '#0891b2', bg: '#cffafe' },
  'slide':           { label: 'Slaid',            icon: '📑', color: '#0284c7', bg: '#e0f2fe' },
  'dataset':         { label: 'Data',             icon: '📈', color: '#4f46e5', bg: '#e0e7ff' },
  'bulletin':        { label: 'Buletin',          icon: '📢', color: '#be185d', bg: '#fce7f3' },
  'working-paper':   { label: 'Kertas Kerja',     icon: '📋', color: '#065f46', bg: '#d1fae5' },
  'strategic-report':{ label: 'Laporan Strategik',icon: '🔍', color: '#92400e', bg: '#fef3c7' },
  'video':           { label: 'Video',            icon: '🎥', color: '#9f1239', bg: '#ffe4e6' },
}
