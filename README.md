# IRIS KMS 2.0 — Knowledge Management System

Sistem Pengurusan Pengetahuan untuk IRIS Institute Malaysia.

## Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| AI | Gemini 2.5 Flash |
| Auth | JWT custom (httpOnly cookie) |
| Hosting | Vercel |

## Ciri-ciri Utama

- 🔍 **Carian Semantik** — cari "Anwar Ibrahim" dan temui semua dokumen yang menyebutnya, walaupun nama tidak ada dalam tajuk
- 🤖 **Ekstrakan Metadata AI** — upload PDF/DOCX, Gemini akan auto-ekstrak tajuk, pengarang, entiti, ringkasan
- 📚 **Perpustakaan** — grid/list dengan filter jenis, tahun, tag
- 📖 **Reader Panel** — buka dokumen dalam panel slide-in dengan ringkasan AI
- 🗺️ **Peta Ilmu** — D3.js force graph hubungan dokumen, entiti, topik
- 📡 **Suapan Berita** — RSS dari 8 sumber penyelidikan global
- 📝 **Wiki** — pangkalan pengetahuan dalaman yang boleh diedit staff
- 👥 **Admin** — urus pengguna, tetapan sistem

## Persediaan

### 1. Supabase

1. Cipta projek baru di [supabase.com](https://supabase.com)
2. Jalankan `supabase/schema.sql` dalam SQL Editor
3. Cipta bucket storage bernama `documents`:
   - Public: **false**
   - File size limit: 52428800 (50MB)

### 2. Environment Variables

Salin `.env.example` ke `.env.local` dan isi semua nilai:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-32-char-secret-here
GEMINI_API_KEY=AIzaSy...
```

### 3. Pasang dependencies dan jalankan

```bash
npm install
npm run dev
```

### 4. Log masuk pertama

- URL: `http://localhost:3000/login`
- Username: `admin`
- Password: `iris2026`

> ⚠️ **Tukar kata laluan admin segera** melalui panel Admin > Pengurusan Pengguna.

## Deploy ke Vercel

1. Push kod ke GitHub
2. Import project di Vercel
3. Tetapkan semua environment variables
4. Deploy

## Struktur Projek

```
iris-kms/
├── app/
│   ├── (dashboard)/          # Halaman utama (dilindungi auth)
│   │   ├── library/          # Perpustakaan dokumen
│   │   ├── upload/           # Upload + AI ekstrakan
│   │   ├── wiki/             # Wiki dalaman
│   │   ├── feed/             # Suapan RSS
│   │   ├── map/              # Peta Ilmu (D3.js)
│   │   └── admin/            # Panel admin
│   ├── api/                  # API routes
│   │   ├── auth/             # Login/logout
│   │   ├── documents/        # CRUD dokumen + carian
│   │   ├── upload/           # Upload + AI ekstrakan
│   │   ├── feed/             # RSS aggregator
│   │   ├── wiki/             # Wiki CRUD
│   │   └── admin/users/      # Pengurusan pengguna
│   └── login/                # Halaman log masuk
├── components/               # React components
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── auth.ts               # JWT utilities
│   └── gemini.ts             # AI utilities
├── types/                    # TypeScript types
├── supabase/
│   └── schema.sql            # Schema + seed data
└── middleware.ts             # Route protection
```

## Peranan Pengguna

| Peranan | Keupayaan |
|---------|-----------|
| **Staff** | Upload, edit, padam dokumen; urus pengguna; akses admin |
| **Penyelidik** | Baca, cari, filter dokumen; akses wiki dan suapan |

## Aliran Carian Semantik

```
Pengguna taip "Anwar Ibrahim"
        ↓
API calls search_documents() RPC
        ↓
PostgreSQL checks:
  • tsvector (tajuk + pengarang + ringkasan + teks penuh)
  • entities JSONB (people, organizations, countries, topics)
  • ILIKE fallback untuk nama yang tidak dalam tsvector
        ↓
Keputusan diisih mengikut relevansi
```

## Aliran Upload AI

```
Fail didrop → Upload ke Supabase Storage → Tukar ke base64
        ↓
Gemini 2.5 Flash analisis fail dan ekstrak:
  • Tajuk, Pengarang, Tahun, Jenis, Bahasa, Sumber
  • Ringkasan (3-4 perenggan)
  • Tags, Keywords
  • Entiti: orang, organisasi, negara, topik
        ↓
Pratonton kepada pengguna untuk semak dan pinda
        ↓
Simpan ke database (tsvector auto-dikira oleh trigger)
```
