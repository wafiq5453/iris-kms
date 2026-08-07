import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (session?.role !== 'staff') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const body = await request.json()
  const update: Record<string, unknown> = {}

  if (body.display_name !== undefined) update.display_name = body.display_name
  if (body.email !== undefined)        update.email        = body.email
  if (body.role !== undefined)         update.role         = body.role
  if (body.is_active !== undefined)    update.is_active    = body.is_active

  // Password reset
  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: 'Kata laluan terlalu pendek' }, { status: 400 })
    }
    update.password_hash = await bcrypt.hash(body.password, 10)
  }

  // Prevent self-deactivation
  if (params.id === session.id && body.is_active === false) {
    return NextResponse.json({ error: 'Anda tidak boleh menyahaktifkan akaun sendiri' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', params.id)
    .select('id, username, display_name, email, role, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (session?.role !== 'staff') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  if (params.id === session.id) return NextResponse.json({ error: 'Tidak boleh padam akaun sendiri' }, { status: 400 })

  const supabase = getAdminClient()
  // Soft delete — just deactivate
  const { error } = await supabase.from('users').update({ is_active: false }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Pengguna dinyahaktifkan' })
}
