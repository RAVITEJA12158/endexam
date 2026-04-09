import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { login as loginApi } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]   = useState({ identifier: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  const validate = () => {
    const e = {}
    if (!form.identifier.trim()) e.identifier = 'Username or email is required'
    if (!form.password)           e.password   = 'Password is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setLoading(true)
    try {
      const res = await loginApi({ identifier: form.identifier, password: form.password })
      login(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err) {
      const status = err.response?.status
      const msg    = err.response?.data?.error || 'Login failed'
      if (status === 401) setErrors({ form: 'Invalid credentials. Please check and try again.' })
      else toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-center flex-1 px-16 relative overflow-hidden"
        style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
        {/* Abstract SVG grid */}
        <svg className="absolute inset-0 opacity-10" width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--accent)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <TrendingUp size={20} color="#fff" />
            </div>
            <span className="font-bold text-2xl" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
              SpendSplit
            </span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            Track every rupee.<br />Split every bill.
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Personal budgets, shared expenses, and real-time settlements — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { label: 'Expense Categories', value: '8' },
              { label: 'Real-time Updates', value: '⚡' },
              { label: 'CSV Export', value: '📊' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-4 border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                <p className="text-2xl font-bold font-mono mb-1" style={{ color: 'var(--accent)' }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:max-w-md lg:flex-none lg:w-[420px]">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-xl" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>SpendSplit</span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            Welcome back
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Sign in to your account
          </p>

          {errors.form && (
            <div className="mb-4 px-4 py-3 rounded-lg border text-sm"
              style={{ background: 'var(--danger)/10', borderColor: 'var(--danger)/30', color: 'var(--danger)' }}>
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username or Email"
              placeholder="Enter username or email"
              value={form.identifier}
              onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
              error={errors.identifier}
              autoComplete="username"
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className={`input-base pr-10 ${errors.password ? 'border-[--danger]' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.password}</p>}
            </div>

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}