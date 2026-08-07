-- ============================================================
-- IRIS KMS 2.0 — Supabase Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fuzzy text search

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  email         TEXT,
  role          TEXT DEFAULT 'researcher' CHECK (role IN ('staff', 'researcher')),
  is_active     BOOLEAN DEFAULT true,
  invited_by    UUID REFERENCES users(id),
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: default admin user (password: iris2026 — change immediately)
-- Password hash for 'iris2026':
INSERT INTO users (username, password_hash, display_name, role)
VALUES ('admin', '$2a$10$rQJ8oP8QaT2KJkL3mN6O.u0gWkL5v2vYdKxZs3XwPqRjT1mU9cBnK', 'Administrator', 'staff')
ON CONFLICT DO NOTHING;

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL,
  author        TEXT,
  type          TEXT DEFAULT 'report' CHECK (type IN (
                  'book','journal','report','manuscript','policy',
                  'article','slide','dataset','bulletin',
                  'working-paper','strategic-report','video'
                )),
  year          INTEGER,
  lang          TEXT DEFAULT 'BM' CHECK (lang IN ('BM','EN','AR','ZH','MS','Other')),
  source        TEXT,
  publisher     TEXT,
  isbn          TEXT,
  call_number   TEXT,
  location      TEXT DEFAULT 'digital',
  status        TEXT DEFAULT 'digital' CHECK (status IN ('digital','available','borrowed','reference')),
  access_level  TEXT DEFAULT 'public' CHECK (access_level IN ('public','staff')),

  -- Content
  file_url      TEXT,              -- Supabase Storage URL
  file_path     TEXT,              -- storage bucket path
  file_size     BIGINT,            -- bytes
  file_type     TEXT,              -- MIME type
  drive_id      TEXT,              -- legacy Google Drive ID
  pages         INTEGER,
  url           TEXT,              -- external URL if any

  -- AI-generated content
  summary       TEXT,              -- AI-generated summary
  content_text  TEXT,              -- full extracted text from document
  entities      JSONB DEFAULT '{
    "people": [],
    "organizations": [],
    "countries": [],
    "topics": []
  }'::jsonb,

  -- Categorization
  tags          TEXT[] DEFAULT '{}',
  keywords      TEXT[] DEFAULT '{}',

  -- Search vector (auto-updated via trigger)
  search_vector TSVECTOR,

  -- Audit
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Full-text search trigger ─────────────────────────────────
CREATE OR REPLACE FUNCTION documents_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_search_trigger
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_update_search_vector();

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documents_search    ON documents USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_documents_entities  ON documents USING GIN(entities);
CREATE INDEX IF NOT EXISTS idx_documents_tags      ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_type      ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_year      ON documents(year DESC);
CREATE INDEX IF NOT EXISTS idx_documents_access    ON documents(access_level);
CREATE INDEX IF NOT EXISTS idx_documents_created   ON documents(created_at DESC);

-- ── Updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CRAWL SOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS crawl_sources (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,              -- RSS feed URL
  category   TEXT,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default sources (same as v2)
INSERT INTO crawl_sources (name, url, category) VALUES
  ('Brookings', 'https://www.brookings.edu/feed/', 'Dasar'),
  ('RAND', 'https://www.rand.org/pubs/rss.xml', 'Keselamatan'),
  ('ISEAS', 'https://www.iseas.edu.sg/feed/', 'ASEAN'),
  ('Chatham House', 'https://www.chathamhouse.org/rss.xml', 'Antarabangsa'),
  ('IISS', 'https://www.iiss.org/rss', 'Keselamatan'),
  ('CFR', 'https://www.cfr.org/rss/all', 'Geopolitik'),
  ('The Diplomat', 'https://thediplomat.com/feed/', 'Asia Pasifik'),
  ('SSRN', 'https://papers.ssrn.com/rss/harg.cfm?per=12&total=5&ntype=2&ID=12550', 'Akademik')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAVED ARTICLES (dari Crawl Feed → Library)
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_articles (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_name  TEXT,
  title        TEXT NOT NULL,
  url          TEXT,
  published_at TIMESTAMPTZ,
  tags         TEXT[] DEFAULT '{}',
  summary      TEXT,
  saved_by     UUID REFERENCES users(id),
  document_id  UUID REFERENCES documents(id),  -- jika disimpan ke Library
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WIKI PAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS wiki_pages (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug       TEXT UNIQUE NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,                       -- markdown content
  category   TEXT,
  tags       TEXT[] DEFAULT '{}',
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER wiki_pages_updated_at
  BEFORE UPDATE ON wiki_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default wiki pages
INSERT INTO wiki_pages (slug, title, category, body) VALUES
(
  'tentang-iris',
  'Tentang IRIS Institute',
  'Umum',
  '## Tentang IRIS Institute

IRIS Institute (Institut Penyelidikan Strategik dan Intelijen) adalah sebuah institusi penyelidikan dasar awam terkemuka di Malaysia yang berfokus kepada kajian geopolitik, keselamatan serantau, dan hubungan antarabangsa.

## Misi

Menghasilkan penyelidikan berkualiti tinggi yang memaklumkan dasar awam Malaysia dalam konteks geopolitik global yang semakin kompleks.

## Fokus Penyelidikan

- Geopolitik Asia Tenggara
- Keselamatan Serantau
- Ekonomi Politik Antarabangsa
- Dasar Luar Malaysia
- Perisikan Strategik'
),
(
  'misi-visi',
  'Misi dan Visi',
  'Umum',
  '## Misi

Menghasilkan penyelidikan yang berani, bebas, dan berimpak dalam bidang keselamatan dan geopolitik.

## Visi

Menjadi pusat penyelidikan strategik terkemuka di Asia Tenggara menjelang 2030.'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- LOAN RECORDS (Buku Fizikal)
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_records (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id  UUID REFERENCES documents(id) NOT NULL,
  borrower     TEXT NOT NULL,
  borrowed_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  due_at       DATE,
  returned_at  DATE,
  notes        TEXT,
  recorded_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS (Row Level Security) — optional, enable if using Supabase Auth
-- For this app we use custom JWT auth via API routes, so RLS is optional
-- But enable for safety:
-- ============================================================
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Anyone can read public docs" ON documents FOR SELECT USING (access_level = 'public');
-- CREATE POLICY "Staff can do anything" ON documents FOR ALL USING (true);

-- ============================================================
-- STORAGE BUCKET SETUP
-- Run this in Supabase Dashboard > Storage > New bucket:
-- Name: documents
-- Public: false (controlled via signed URLs)
-- File size limit: 52428800 (50MB)
-- Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.*,
--                     application/msword, application/vnd.google-apps.*
-- ============================================================

-- ============================================================
-- HELPER FUNCTION: Search documents
-- ============================================================
CREATE OR REPLACE FUNCTION search_documents(
  query_text TEXT,
  filter_type TEXT DEFAULT NULL,
  filter_year INTEGER DEFAULT NULL,
  filter_access TEXT DEFAULT 'public',
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, title TEXT, author TEXT, type TEXT, year INTEGER,
  tags TEXT[], summary TEXT, entities JSONB, access_level TEXT,
  file_url TEXT, drive_id TEXT, pages INTEGER, lang TEXT,
  source TEXT, created_at TIMESTAMPTZ, rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.title, d.author, d.type, d.year,
    d.tags, d.summary, d.entities, d.access_level,
    d.file_url, d.drive_id, d.pages, d.lang,
    d.source, d.created_at,
    CASE
      WHEN query_text = '' THEN 0
      ELSE ts_rank(d.search_vector, plainto_tsquery('english', query_text))
    END as rank
  FROM documents d
  WHERE
    -- Access filter
    (filter_access = 'staff' OR d.access_level = 'public')
    -- Type filter
    AND (filter_type IS NULL OR d.type = filter_type)
    -- Year filter
    AND (filter_year IS NULL OR d.year = filter_year)
    -- Text search (when query provided)
    AND (
      query_text = ''
      OR d.search_vector @@ plainto_tsquery('english', query_text)
      -- Entity search: search within entities JSONB
      OR d.entities::text ILIKE '%' || query_text || '%'
      -- Trigram search on title
      OR d.title ILIKE '%' || query_text || '%'
      OR d.author ILIKE '%' || query_text || '%'
    )
  ORDER BY rank DESC, d.year DESC, d.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;
