import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    console.log('[LOGIN] Attempt:', username)

    if (!username || !password) {
      return NextResponse.json({ error: 'Nama pengguna dan kata laluan diperlukan.' }, { status: 400 })
    }

    // Direct Supabase client (avoid getAdminClient wrapper)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find user
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('id, username, password_hash, display_name, role, is_active')
      .eq('username', username.toLowerCase().trim())
      .single()

    console.log('[LOGIN] DB result:', user ? 'found' : 'not found', dbError?.message)

    if (dbError || !user) {
      return NextResponse.json({ error: 'Nama pengguna atau kata laluan tidak sah.' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Akaun anda telah dinyahaktifkan.' }, { status: 403 })
    }

    // Inline bcrypt compare using native crypto to avoid module issues
    const bcrypt = await import('bcryptjs')
    const valid = await bcrypt.compare(password, user.password_hash)
    console.log('[LOGIN] Password match:', valid)

    if (!valid) {
      return NextResponse.json({ error: 'Nama pengguna atau kata laluan tidak sah.' }, { status: 401 })
    }

    // Update last login
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id)

    // Create JWT
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? 'iris-kms-secret-key-change-in-production'
    )
    const token = await new SignJWT({
      sub: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    console.log('[LOGIN] Success for:', username)

    const response = NextResponse.json({
      user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role },
      message: 'Log masuk berjaya',
    })

    response.cookies.set('iris_kms_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[LOGIN] Error:', msg)
    return NextResponse.json({ error: 'Ralat: ' + msg }, { status: 500 })
  }
}
