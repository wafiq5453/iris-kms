import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'iris-kms-secret-key-change-in-production'
)

const PUBLIC_PATHS = ['/login', '/api/auth/login']
const STAFF_ONLY   = ['/upload', '/admin', '/api/admin', '/api/upload', '/api/documents']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow public API routes
  if (pathname.startsWith('/api/search') || pathname.startsWith('/api/feed')) {
    // Still check auth for access_level filtering
  }

  // Get session token
  const token = request.cookies.get('iris_kms_session')?.value

  if (!token) {
    // Redirect to login for page routes
    if (!pathname.startsWith('/api/')) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    // Check staff-only routes
    if (STAFF_ONLY.some(p => pathname.startsWith(p))) {
      if (payload.role !== 'staff') {
        if (!pathname.startsWith('/api/')) {
          return NextResponse.redirect(new URL('/', request.url))
        }
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Pass user info to headers for server components
    const headers = new Headers(request.headers)
    headers.set('x-user-id',   payload.sub as string)
    headers.set('x-user-role', payload.role as string)
    headers.set('x-username',  payload.username as string)

    return NextResponse.next({ request: { headers } })
  } catch {
    // Invalid token
    if (!pathname.startsWith('/api/')) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('iris_kms_session')
      return response
    }
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fonts|images).*)',
  ],
}
