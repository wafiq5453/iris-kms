import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// GET /api/admin/users
export async function GET() {
  const session = await getSession()
  if (session?.role !== 'staff') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, email, role, is_active, last_login, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/admin/users — create user
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (session?.role !== 'staff') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const { username, password, display_name, email, role } = await request.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Nama pengguna dan kata laluan diperlukan' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Kata laluan mestilah sekurang-kurangnya 8 aksara' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 10)
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('users')
    .insert({
      username:      username.toLowerCase().trim(),
      password_hash: hash,
      display_name,
      email,
      role:          role ?? 'researcher',
      invited_by:    session.id,
    })
    .select('id, username, display_name, email, role, is_active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nama pengguna sudah digunakan' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
