import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ message: 'Log keluar berjaya' })
  response.cookies.set('iris_kms_session', '', { maxAge: 0, path: '/' })
  return response
}
