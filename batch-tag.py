# IRIS KMS — Batch Tag Generator (Python, tanpa AI)
# Guna keyword matching dari tajuk dokumen
# Run: python batch-tag.py

import csv, json, re, urllib.request, urllib.parse

SUPABASE_URL     = 'https://hcwkrgvbmhknzstklafd.supabase.co'
SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjd2tyZ3ZibWhrbnpzdGtsYWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc1OTgwOSwiZXhwIjoyMDk5MzM1ODA5fQ.9yNqM6nYJliUdKgz6-l3pB6e-DiM6X8c4Iyv2rfqyK8'

# ── Kamus keyword → tag ───────────────────────────────────────
TAG_RULES = {
    # Negara & Kawasan
    'malaysia':        'Malaysia',
    'malaysian':       'Malaysia',
    'melayu':          'Malaysia',
    'asean':           'ASEAN',
    'asia':            'Asia',
    'china':           'China',
    'chinese':         'China',
    'sino':            'China',
    'russia':          'Rusia',
    'russian':         'Rusia',
    'america':         'Amerika Syarikat',
    'american':        'Amerika Syarikat',
    'united states':   'Amerika Syarikat',
    'usa':             'Amerika Syarikat',
    'britain':         'Britain',
    'british':         'Britain',
    'uk ':             'Britain',
    'europe':          'Eropah',
    'european':        'Eropah',
    'middle east':     'Timur Tengah',
    'arab':            'Dunia Arab',
    'israel':          'Israel',
    'ukraine':         'Ukraine',
    'india':           'India',
    'japan':           'Jepun',
    'korea':           'Korea',
    'indonesia':       'Indonesia',
    'singapore':       'Singapura',
    'thailand':        'Thailand',
    'vietnam':         'Vietnam',
    'philippines':     'Filipina',
    'africa':          'Afrika',
    'iran':            'Iran',
    'taiwan':          'Taiwan',
    'pakistan':        'Pakistan',
    'myanmar':         'Myanmar',

    # Geopolitik & Keselamatan
    'geopolit':        'geopolitik',
    'geostrat':        'geopolitik',
    'strateg':         'strategik',
    'security':        'keselamatan',
    'keselamatan':     'keselamatan',
    'defence':         'pertahanan',
    'defense':         'pertahanan',
    'pertahanan':      'pertahanan',
    'military':        'tentera',
    'tentera':         'tentera',
    'war':             'peperangan',
    'perang':          'peperangan',
    'conflict':        'konflik',
    'konflik':         'konflik',
    'intelligence':    'perisikan',
    'perisikan':       'perisikan',
    'counterinsurgen': 'insurgensi',
    'insurgenc':       'insurgensi',
    'terrorism':       'keganasan',
    'terror':          'keganasan',
    'nuclear':         'nuklear',
    'weapon':          'senjata',
    'nato':            'NATO',
    'cold war':        'Perang Dingin',
    'power':           'kuasa',

    # Politik & Tadbir Urus
    'politic':         'politik',
    'politik':         'politik',
    'democracy':       'demokrasi',
    'demokrat':        'demokrasi',
    'election':        'pilihan raya',
    'governance':      'tadbir urus',
    'government':      'kerajaan',
    'kerajaan':        'kerajaan',
    'policy':          'dasar awam',
    'dasar':           'dasar awam',
    'reform':          'reformasi',
    'parliament':      'parlimen',
    'parlimen':        'parlimen',
    'leader':          'kepimpinan',
    'leadership':      'kepimpinan',
    'revolution':      'revolusi',
    'regime':          'rejim',
    'authorit':        'autoritarianisme',
    'diplomat':        'diplomasi',
    'foreign policy':  'dasar luar',
    'hubungan luar':   'dasar luar',
    'hubungan antar':  'hubungan antarabangsa',
    'international':   'hubungan antarabangsa',

    # Ekonomi
    'econom':          'ekonomi',
    'ekonomi':         'ekonomi',
    'trade':           'perdagangan',
    'perdagangan':     'perdagangan',
    'finance':         'kewangan',
    'kewangan':        'kewangan',
    'develop':         'pembangunan',
    'pembangunan':     'pembangunan',
    'globali':         'globalisasi',
    'market':          'pasaran',
    'investment':      'pelaburan',
    'oil':             'petroleum',
    'petroleum':       'petroleum',
    'energy':          'tenaga',
    'teknologi':       'teknologi',
    'technology':      'teknologi',
    'digital':         'ekonomi digital',
    'artificial intel':'kecerdasan buatan',
    'ai ':             'kecerdasan buatan',

    # Malaysia Spesifik
    'rancangan malaysia': 'Rancangan Malaysia',
    'rmk':             'Rancangan Malaysia',
    'wawasan':         'Wawasan 2020',
    'bumiputera':      'bumiputera',
    'ketuanan':        'ketuanan Melayu',
    'islam':           'Islam',
    'muslim':          'Islam',
    'perlembagaan':    'perlembagaan',
    'constitution':    'perlembagaan',
    'felda':           'FELDA',
    'petronas':        'PETRONAS',
    'mahathir':        'Mahathir Mohamad',
    'anwar':           'Anwar Ibrahim',
    'najib':           'Najib Razak',
    'masyarakat':      'masyarakat',
    'sosial':          'sosial',
    'social':          'sosial',
    'pendidikan':      'pendidikan',
    'education':       'pendidikan',

    # Sejarah
    'histor':          'sejarah',
    'sejarah':         'sejarah',
    'colonial':        'kolonialisme',
    'kolonial':        'kolonialisme',
    'empire':          'empayar',
    'revolution':      'revolusi',
    'world war':       'Perang Dunia',
    'ancient':         'sejarah kuno',

    # Akademik / Umum
    'strateg':         'strategik',
    'analys':          'analisis',
    'report':          'laporan',
    'laporan':         'laporan',
    'review':          'ulasan',
    'theory':          'teori',
    'teori':           'teori',
    'research':        'penyelidikan',
    'survey':          'kajian',
    'study':           'kajian',
    'kajian':          'kajian',
    'nasional':        'nasional',
    'national':        'nasional',
    'global':          'global',
    'world':           'dunia',
    'future':          'masa depan',
    'crisis':          'krisis',
    'krisis':          'krisis',
    'perpaduan':       'perpaduan',
    'unity':           'perpaduan',
    'biografi':        'biografi',
    'biography':       'biografi',
    'memoir':          'biografi',
}

def get_tags(title, author=''):
    text = (title + ' ' + (author or '')).lower()
    found = set()
    for keyword, tag in TAG_RULES.items():
        if keyword.lower() in text:
            found.add(tag)
    tags = list(found)[:6]
    if not tags:
        tags = ['umum']
    return tags

def supabase_request(method, path, body=None):
    url  = SUPABASE_URL + '/rest/v1/' + path
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(url, data=data, method=method)
    req.add_header('apikey', SERVICE_ROLE_KEY)
    req.add_header('Authorization', 'Bearer ' + SERVICE_ROLE_KEY)
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=minimal')
    try:
        with urllib.request.urlopen(req) as res:
            raw = res.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        print(f'HTTP {e.code}: {e.read().decode()}')
        return None

print('IRIS KMS — Batch Tag Generator (Python)')
print('=========================================')

# Fetch semua dokumen tanpa tags
docs = supabase_request('GET', 'documents?select=id,title,author,tags&order=created_at.asc&limit=500')
if not docs:
    print('Gagal fetch dokumen'); exit(1)

to_process = [d for d in docs if not d.get('tags') or len(d['tags']) == 0]
print(f'Jumlah dokumen: {len(docs)}')
print(f'Perlu tag: {len(to_process)}')
print('')

success, failed = 0, 0

for i, doc in enumerate(to_process):
    title  = doc.get('title', '')
    author = doc.get('author', '')
    tags   = get_tags(title, author)
    doc_id = doc['id']

    result = supabase_request('PATCH', f'documents?id=eq.{doc_id}', {'tags': tags})
    
    if result is not None:
        print(f"[{i+1}/{len(to_process)}] ✓ {title[:45]:<45} → {', '.join(tags[:3])}")
        success += 1
    else:
        print(f"[{i+1}/{len(to_process)}] ✗ {title[:45]}")
        failed += 1

print('')
print('=========================================')
print(f'Selesai! ✓ {success} berjaya, ✗ {failed} gagal')
