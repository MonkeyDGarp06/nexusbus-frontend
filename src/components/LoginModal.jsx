import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api'
import { Link } from 'react-router-dom'
import { Button, Input } from './ui'

export default function LoginModal({ onClose, onSuccess, requiredRole }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) { return (e) => setForm((p) => ({ ...p, [field]: e.target.value })) }

  const roleLabel = requiredRole === 'driver' ? 'Driver' : requiredRole === 'admin' ? 'Admin' : 'Driver / Admin'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.me({ email: form.email, password: form.password })
      const role = data.role?.toLowerCase()

      // Check role matches the tab they clicked
      if (requiredRole === 'driver' && role !== 'driver') {
        setError(`This account has role "${data.role}". Please use the ${data.role} login instead.`)
        setLoading(false)
        return
      }
      if (requiredRole === 'admin' && role !== 'admin') {
        setError(`This account has role "${data.role}". Please use the ${data.role} login instead.`)
        setLoading(false)
        return
      }

      login({ ...data, email: form.email, password: form.password })
      if (onSuccess) onSuccess(data)
      else onClose()
    } catch {
      setError('Invalid email or password.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <button onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center
            ${requiredRole === 'driver' ? 'bg-blue-600' : requiredRole === 'admin' ? 'bg-amber-500' : 'bg-blue-600'}`}>
            {requiredRole === 'driver' ? (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM3 7h14l2 6H1L3 7z" />
              </svg>
            ) : requiredRole === 'admin' ? (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A3 3 0 0020 16V8c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 9h12v4H6V9z"/>
              </svg>
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">NexusBus</p>
            <p className={`text-xs font-semibold
              ${requiredRole === 'driver' ? 'text-blue-600' : requiredRole === 'admin' ? 'text-amber-600' : 'text-gray-500'}`}>
              {roleLabel} Login
            </p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in as {roleLabel}</h2>
        <p className="text-sm text-gray-500 mb-5">
          {requiredRole === 'driver'
            ? 'Driver accounts only. Admins use the Admin tab.'
            : requiredRole === 'admin'
            ? 'Admin accounts only. Drivers use the Driver tab.'
            : 'For drivers and admins only.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com"
            value={form.email} onChange={set('email')} required />
          <Input label="Password" type="password" placeholder="••••••"
            value={form.password} onChange={set('password')} required />
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <Button type="submit" fullWidth disabled={loading} size="lg">
            {loading ? 'Signing in...' : `Sign in as ${roleLabel}`}
          </Button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          New {roleLabel.toLowerCase()}?{' '}
          <Link to="/register" onClick={onClose} className="text-blue-600 hover:underline font-medium">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
