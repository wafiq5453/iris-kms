'use client'
import { Suspense, useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') || '/library'

  const [form, setForm]       = useState({ username: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Log masuk gagal')
      router.push(redirect)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ralat tidak diketahui')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-iris-700 text-white text-2xl font-bold shadow-lg mb-4">
          I
        </div>
        <h1 className="text-2xl font-bold text-slate-900">IRIS KMS</h1>
        <p className="text-sm text-slate-500 mt-1">Knowledge Management System</p>
      </div>

      <div className="card p-6 shadow-panel">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Log Masuk</h2>
        <p className="text-sm text-slate-500 mb-6">Masukkan kelayakan anda untuk meneruskan.</p>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Nama Pengguna</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" className="input pl-9" placeholder="username"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required autoComplete="username" autoFocus />
            </div>
          </div>

          <div>
            <label className="input-label">Kata Laluan</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={showPw ? 'text' : 'password'} className="input pl-9 pr-10" placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required autoComplete="current-password" />
              <button type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPw(s => !s)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengesahkan...</>
            ) : 'Log Masuk'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        IRIS Institute — Sistem Pengurusan Pengetahuan v2.0
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-iris-50 to-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-iris-700 text-white text-2xl font-bold mb-4">I</div>
          <p className="text-slate-500 text-sm">Memuatkan...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
