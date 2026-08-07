import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { User, AuthSession } from '@/types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'iris-kms-secret-key-change-in-production'
)
const COOKIE_NAME = 'iris_kms_session'
const SESSION_DURATION = 60 * 60 * 24 * 7 // 7 days

export async function signToken(user: Omit<User, 'created_at'>): Promise<string> {
  return new SignJWT({
    sub: user.id,
    username: user.username,
    role: user.role,
    display_name: user.display_name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<AuthSession['user'] | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: payload.sub as string,
      username: payload.username as string,
      role: payload.role as 'staff' | 'researcher',
      display_name: payload.display_name as string | undefined,
      is_active: true,
      created_at: '',
    }
  } catch {
    return null
  }
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

export async function getSession(): Promise<AuthSession['user'] | null> {
  const token = await getSessionCookie()
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(): Promise<AuthSession['user']> {
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return session
}

export async function requireStaff(): Promise<AuthSession['user']> {
  const session = await requireAuth()
  if (session.role !== 'staff') throw new Error('FORBIDDEN')
  return session
}

export function authError(code: 'UNAUTHORIZED' | 'FORBIDDEN') {
  const status = code === 'UNAUTHORIZED' ? 401 : 403
  const message = code === 'UNAUTHORIZED'
    ? 'Sila log masuk untuk meneruskan.'
    : 'Anda tidak mempunyai akses kepada fungsi ini.'
  return Response.json({ error: message }, { status })
}
