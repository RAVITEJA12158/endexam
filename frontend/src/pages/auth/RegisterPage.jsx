import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, X, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { register as registerApi } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { CURRENCY_OPTIONS } from '../../utils/constants'

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Special character', ok: /[!@#$%^&*]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const label = score === 0 ? '' : score === 1 ? 'Weak' : score === 2 ? 'Medium' : 'Strong'
  const color = score === 1 ? 'var(--danger)' : score === 2 ? 'var(--warn)' : 'var(--success)'

  if (!password) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i <= score ? color : 'var(--border)' }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map(c => (
            <span key={c.label} className="text-[10px] flex items-center gap-1"
              style={{ color: c.ok ? 'var(--success)' : 'var(--text-muted)' }}>
              {c.ok ? <Check size={9} /> : <X size={9} />}
              {c.label}
            </span>
          ))}
        </div>
        {label && <span className="text-[10px] font-medium" style={{ color }}>{label}</span>}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm] = useState({
    fullName: '', username: '', email: '',
    currency: 'INR', password: '', confirmPassword: '',
  })
  const [errors, setErrors]       = useState({})
  const [showPass, setShowPass]   = useState(false)
  const [showConf, setShowConf]   = useState(false)
  const [loading, setLoading]     = useState(false)

  const validate = () => {
    const e = {}
    if (!form.fullName.trim())   e.fullName = 'Full name is required'
    if (!form.username.trim())   e.username = 'Username is required'
    else if (!/^[a-z0-9_]{3,30}$/i.test(form.username)) e.username = '3-30 chars, letters/numbers/underscore only'
    if (!form.email.trim())      e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format'
    if (!form.password)          e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'At least 8 characters required'
    else if (!/[A-Z]/.test(form.password)) e.password = 'Must contain at least one uppercase letter'
    else if (!/[!@#$%^&*]/.test(form.password)) e.password = 'Must contain at least one special character (!@#$%^&*)'
    if (!form.confirmPassword)   e.confirmPassword = 'Please confirm your password'
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setLoading(true)
    try {
      const res = await registerApi(form)
      login(res.data.token, res.data.user)
      toast.success('Account created!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed'
      if (err.response?.status === 409) {
        if (msg.toLowerCase().includes('username')) setErrors({ username: 'Username already taken' })
        else setErrors({ email: 'Email already registered' })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const f = (field) => (e) => {
    const val = field === 'username' ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') : e.target.value
    setForm(prev => ({ ...prev, [field]: val }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left decorative */}
      <div className="hidden lg:flex flex-col justify-center flex-1 px-16 relative overflow-hidden"
        style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
        <svg className="absolute inset-0 opacity-10" width="100%" height="100%">
          <defs>
            <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--accent)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid2)" />
        </svg>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <TrendingUp size={20} color="#fff" />
            </div>
            <span className="font-bold text-2xl" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>SpendSplit</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            Start tracking<br />smarter today.
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Join thousands of users managing their finances with SpendSplit.
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 lg:max-w-md lg:flex-none lg:w-[460px]">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>Create account</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Fill in your details to get started</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" placeholder="Your full name" value={form.fullName}
              onChange={f('fullName')} error={errors.fullName} maxLength={100} />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Username</label>
              <div className="relative">
                <input
                  value={form.username}
                  onChange={f('username')}
                  placeholder="e.g. john_doe"
                  className={`input-base ${errors.username ? 'input-error' : ''}`}
                  minLength={3} maxLength={30}
                />
              </div>
              {errors.username && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.username}</p>}
            </div>

            <Input label="Email" type="email" placeholder="you@example.com"
              value={form.email} onChange={f('email')} error={errors.email} />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Currency Preference</label>
              <select
                value={form.currency}
                onChange={f('currency')}
                className="input-base"
              >
                {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min 8 chars, 1 uppercase, 1 special"
                  value={form.password}
                  onChange={f('password')}
                  className={`input-base pr-10 ${errors.password ? 'input-error' : ''}`}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.password}</p>}
              <PasswordStrength password={form.password} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
              <div className="relative">
                <input
                  type={showConf ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={f('confirmPassword')}
                  className={`input-base pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                />
                <button type="button" onClick={() => setShowConf(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.confirmPassword}</p>}
              {form.confirmPassword && form.password === form.confirmPassword && !errors.confirmPassword && (
                <p className="text-xs flex items-center gap-1" style={{ color: 'var(--success)' }}>
                  <Check size={10} /> Passwords match
                </p>
              )}
            </div>

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Create Account
            </Button>
          </form>

          <p className="text-sm text-center mt-5" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
