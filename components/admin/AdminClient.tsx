'use client'
import { useEffect, useState } from 'react'
import {
  Users, Plus, Settings, RefreshCw, Shield, UserCheck,
  UserX, KeyRound, AlertCircle, CheckCircle2, Trash2
} from 'lucide-react'
import clsx from 'clsx'
import type { User } from '@/types'

type AdminTab = 'users' | 'settings'

export default function AdminClient() {
  const [tab,     setTab]     = useState<AdminTab>('users')
  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast,   setToast]   = useState('')

  // New user form
  const [newUser, setNewUser] = useState({ username: '', password: '', display_name: '', role: 'researcher' })

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    const res  = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers(u => [data.data, ...u])
      setNewUser({ username: '', password: '', display_name: '', role: 'researcher' })
      setShowAdd(false)
      showToast('Pengguna berjaya dicipta')
    } else {
      showToast(`Ralat: ${data.error}`)
    }
  }

  async function toggleActive(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !user.is_active }),
    })
    if (res.ok) {
      setUsers(u => u.map(x => x.id === user.id ? { ...x, is_active: !x.is_active } : x))
      showToast(`Pengguna ${!user.is_active ? 'diaktifkan' : 'dinyahaktifkan'}`)
    }
  }

  async function changeRole(user: User, role: string) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setUsers(u => u.map(x => x.id === user.id ? { ...x, role: role as 'staff' | 'researcher' } : x))
      showToast(`Peranan dikemaskini`)
    }
  }

  const staffCount = users.filter(u => u.role === 'staff').length
  const activeCount = users.filter(u => u.is_active).length

  return (
    <div className="flex h-full overflow-hidden">

      {/* Sidebar */}
      <aside className="w-48 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Admin</h2>
        </div>
        <div className="p-3 space-y-1">
          <button onClick={() => setTab('users')} className={clsx('sb-item', tab === 'users' && 'active')}>
            <Users size={14} /> Pengurusan Pengguna
          </button>
          <button onClick={() => setTab('settings')} className={clsx('sb-item', tab === 'settings' && 'active')}>
            <Settings size={14} /> Tetapan
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">

        {tab === 'users' && (
          <div className="max-w-3xl">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Jumlah Pengguna', value: users.length, icon: Users, color: 'text-iris-700', bg: 'bg-iris-50' },
                { label: 'Staff Aktif',      value: staffCount,   icon: Shield, color: 'text-violet-700', bg: 'bg-violet-50' },
                { label: 'Pengguna Aktif',   value: activeCount,  icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
              ].map(stat => (
                <div key={stat.label} className="card p-4">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-2', stat.bg)}>
                    <stat.icon size={16} className={stat.color} />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Senarai Pengguna</h2>
              <div className="flex gap-2">
                <button onClick={fetchUsers} className="btn-ghost p-2">
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setShowAdd(s => !s)} className="btn-primary text-sm">
                  <Plus size={13} /> Tambah Pengguna
                </button>
              </div>
            </div>

            {/* Add User Form */}
            {showAdd && (
              <div className="card p-4 mb-4 border-iris-200 bg-iris-50">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Pengguna Baru</h3>
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="input-label">Nama Pengguna *</label>
                      <input className="input" value={newUser.username}
                        onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="input-label">Nama Paparan</label>
                      <input className="input" value={newUser.display_name}
                        onChange={e => setNewUser(u => ({ ...u, display_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="input-label">Kata Laluan *</label>
                      <input type="password" className="input" value={newUser.password} minLength={8}
                        onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="input-label">Peranan</label>
                      <select className="input" value={newUser.role}
                        onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                        <option value="researcher">Penyelidik</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Batal</button>
                    <button type="submit" className="btn-primary text-sm">Cipta Pengguna</button>
                  </div>
                </form>
              </div>
            )}

            {/* User table */}
            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw size={16} className="animate-spin text-slate-400" /></div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Pengguna', 'Peranan', 'Status', 'Log Masuk Terakhir', 'Tindakan'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-iris-100 flex items-center justify-center text-iris-700 text-xs font-semibold uppercase">
                              {user.username[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{user.display_name ?? user.username}</p>
                              <p className="text-xs text-slate-400">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.role}
                            onChange={e => changeRole(user, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-iris-500"
                          >
                            <option value="researcher">Penyelidik</option>
                            <option value="staff">Staff</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx(
                            'badge text-xs',
                            user.is_active ? 'badge-green' : 'badge-red'
                          )}>
                            {user.is_active ? '● Aktif' : '○ Tidak aktif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString('ms-MY') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive(user)}
                            className={clsx('btn-ghost text-xs p-1.5', user.is_active ? 'hover:text-red-500' : 'hover:text-emerald-600')}
                            title={user.is_active ? 'Nyahaktifkan' : 'Aktifkan'}
                          >
                            {user.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-xl">
            <h2 className="text-base font-semibold text-slate-900 mb-6">Tetapan Sistem</h2>
            <div className="card p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Maklumat Sistem</h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span>Versi KMS</span><span className="font-medium">2.0.0</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span>Database</span><span className="font-medium">Supabase (PostgreSQL)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span>AI Engine</span><span className="font-medium">Gemini 2.5 Flash</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Storage</span><span className="font-medium">Supabase Storage</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Nota Keselamatan</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <p className="font-medium mb-1">⚠️ Tukar kata laluan admin lalai</p>
                  <p>Pastikan kata laluan <code>iris2026</code> telah ditukar sebelum digunakan dalam persekitaran pengeluaran.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}
