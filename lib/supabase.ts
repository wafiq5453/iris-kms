import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (for client components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client (server-side only — never expose service role key to browser)
export function getAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Admin client cannot be used in browser')
  }
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Storage helpers ───────────────────────────────────────────
export const BUCKET = 'documents'

export async function uploadToStorage(
  file: File,
  path: string
): Promise<{ url: string; path: string } | { error: string }> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) return { error: error.message }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return { url: urlData.publicUrl, path: data.path }
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error) return null
  return data.signedUrl
}

export function getStoragePath(filename: string, type: string): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const clean = filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase()
  const uniqueId = Math.random().toString(36).slice(2, 8)
  return `${year}/${month}/${type}/${uniqueId}_${clean}`
}
