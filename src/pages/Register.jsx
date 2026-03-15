import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { Button, Input, Card } from '../components/ui'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fname: '', lname: '', emailId: '', password: '', role: 'User' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) { return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.register(form)
      navigate('/login')
    } catch (err) { setError(err.message || 'Registration failed. Email may already be in use.') }
    setLoading(false)
  }

  const roles = [
    { value: 'User', label: 'Passenger', desc: 'Browse routes and track buses', icon: '??' },
    { value: 'driver', label: 'Driver', desc: 'Operate buses and update location', icon: '??' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A3 3 0 0020 16V8c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 9h12v4H6V9z"/>
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-xl">NexusBus</span>
        </div>

        <Card>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Create account</h1>
          <p className="text-sm text-gray-500 mb-5">Sign up to get started</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <Input label="First name" placeholder="Navtej" value={form.fname} onChange={set('fname')} required className="flex-1" />
              <Input label="Last name" placeholder="Sutar" value={form.lname} onChange={set('lname')} required className="flex-1" />
            </div>
            <Input label="Email" type="email" placeholder="you@example.com" value={form.emailId} onChange={set('emailId')} required />
            <Input label="Password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required />

            {/* Role selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(r => (
                  <button key={r.value} type="button" onClick={() => setForm(p => ({ ...p, role: r.value }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all
                      ${form.role === r.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <span className="text-xl block mb-1">{r.icon}</span>
                    <p className={`text-xs font-bold ${form.role === r.value ? 'text-blue-700' : 'text-gray-700'}`}>{r.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" fullWidth disabled={loading} size="lg">
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-5">
            Already have an account?{' '}
            <Link to="/login" onClick={() => window.history.back()} className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </Card>

        <p className="text-xs text-gray-400 text-center mt-4">
          Admin accounts are created by existing admins only.
        </p>
      </div>
    </div>
  )
}
