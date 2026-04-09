import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2, Plus, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCategories } from '../../api/categories'
import { createExpense, updateExpense, getExpense } from '../../api/expenses'
import { getBudgets } from '../../api/budgets'
import { useAuth } from '../../hooks/useAuth'
import { useCurrency } from '../../hooks/useCurrency'
import { todayISO } from '../../utils/formatDate'
import { getCategoryMeta, sortCategories, PAYMENT_MODES, PAYMENT_MODE_LABELS } from '../../utils/constants'
import Button from '../../components/ui/Button'
import FriendSearchInput from '../../components/shared/FriendSearchInput'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'

const DEFAULT_FORM = {
  title: '', amount: '', categoryId: '', date: todayISO(),
  paymentMode: 'CASH', notes: '', isShared: false,
}

export default function AddExpensePage() {
  const { id }        = useParams()
  const isEdit        = !!id
  const navigate      = useNavigate()
  const { user }      = useAuth()
  const { symbol }    = useCurrency()

  const [form, setForm]         = useState(DEFAULT_FORM)
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [fetchingEdit, setFetchingEdit] = useState(isEdit)

  // Split state
  const [splits, setSplits]     = useState([])  // [{user, amount, pct}]
  const [splitMode, setSplitMode] = useState('amount') // 'amount' | 'pct'

  // Budget warning
  const [budgetWarning, setBudgetWarning] = useState(null)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let ignore = false

    const loadCategories = async () => {
      try {
        const res = await getCategories()
        if (ignore) return

        setCategories(
          sortCategories(
            (res.data.categories || []).map((category) => ({
              ...category,
              ...getCategoryMeta(category.name),
            }))
          )
        )
      } catch {
        if (!ignore) setCategories([])
      }
    }

    loadCategories()

    return () => {
      ignore = true
    }
  }, [])

  // Prefill for edit
  useEffect(() => {
    if (!isEdit) return
    const load = async () => {
      try {
        const res = await getExpense(id)
        const exp = res.data
        if (exp.type === 'SHARED') {
          toast.error('Shared expenses cannot be edited from this form yet')
          navigate(`/expenses/${id}`)
          return
        }
        setForm({
          title:       exp.title,
          amount:      String(exp.amount),
          categoryId:  exp.categoryId || exp.category?.id || '',
          date:        exp.date ? exp.date.split('T')[0] : todayISO(),
          paymentMode: exp.paymentMode,
          notes:       exp.notes || '',
          isShared:    exp.type === 'SHARED',
        })
      } catch {
        toast.error('Failed to load expense')
        navigate('/expenses')
      } finally {
        setFetchingEdit(false)
      }
    }
    load()
  }, [id, isEdit, navigate])

  // Auto-add "You" row when split toggled on
  useEffect(() => {
    if (form.isShared && splits.length === 0) {
      setSplits([{ user: { id: user?.id, username: user?.username, name: user?.name }, amount: '', pct: '' }])
    }
    if (!form.isShared) setSplits([])
  }, [form.isShared]) // eslint-disable-line

  // Budget check
  useEffect(() => {
    if (!form.categoryId || !form.amount || isNaN(Number(form.amount))) {
      setBudgetWarning(null); return
    }
    const check = async () => {
      try {
        const now = new Date()
        const res = await getBudgets({ month: now.getMonth() + 1, year: now.getFullYear() })
        const budget = res.data.budgets?.find(b => b.category?.id === form.categoryId || b.category?.name === form.categoryId)
        if (!budget) { setBudgetWarning(null); return }
        const newTotal = budget.spentAmount + Number(form.amount)
        const pct = (newTotal / budget.limitAmount) * 100
        if (pct > 100) {
          const over = newTotal - budget.limitAmount
          setBudgetWarning({ type: 'exceeded', msg: `This expense will exceed your ${budget.category?.name} budget by ${symbol}${over.toFixed(2)}`, pct })
        } else if (pct >= 80) {
          setBudgetWarning({ type: 'warning', msg: `Adding this expense will reach ${pct.toFixed(0)}% of your ${budget.category?.name} budget`, pct })
        } else {
          setBudgetWarning(null)
        }
      } catch { setBudgetWarning(null) }
    }
    check()
  }, [form.categoryId, form.amount, symbol])

  const totalAmount  = Number(form.amount) || 0
  const splitTotal   = splits.reduce((s, sp) => s + (Number(sp.amount) || 0), 0)
  const splitValid   = splits.length >= 2 && Math.abs(splitTotal - totalAmount) < 0.01

  const addFriend = (friend) => {
    if (splits.find(s => s.user.id === friend.id)) return
    setSplits(prev => [...prev, { user: friend, amount: '', pct: '' }])
  }

  const removeSplit = (userId) => {
    setSplits(prev => prev.filter(s => s.user.id !== userId))
  }

  const updateSplitAmount = (userId, val) => {
    setSplits(prev => prev.map(s => s.user.id === userId ? { ...s, amount: val } : s))
  }

  const splitEqually = () => {
    if (!totalAmount || splits.length === 0) return
    const each = (totalAmount / splits.length).toFixed(2)
    setSplits(prev => prev.map((s, i) => ({
      ...s,
      amount: i === splits.length - 1
        ? (totalAmount - each * (splits.length - 1)).toFixed(2)
        : each,
    })))
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim())   e.title      = 'Title is required'
    if (!form.amount)         e.amount     = 'Amount is required'
    else if (Number(form.amount) <= 0) e.amount = 'Amount must be greater than 0'
    if (!form.categoryId)     e.categoryId = 'Category is required'
    if (!form.date)           e.date       = 'Date is required'
    if (!form.paymentMode)    e.paymentMode = 'Payment mode is required'
    if (form.isShared) {
      if (splits.length < 2)  e.splits = 'Add at least one friend to split with'
      else if (!splitValid)   e.splits = `Split total (${symbol}${splitTotal.toFixed(2)}) must equal expense amount (${symbol}${totalAmount.toFixed(2)})`
    }
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const payload = {
        title:       form.title.trim(),
        amount:      Number(Number(form.amount).toFixed(2)),
        categoryId:  form.categoryId,
        date:        form.date,
        paymentMode: form.paymentMode,
        notes:       form.notes.trim() || undefined,
        isShared:    form.isShared,
      }
      if (form.isShared) {
        payload.splits = splits.map(s => ({
          userId:     s.user.id,
          owedAmount: Number(Number(s.amount).toFixed(2)),
        }))
      }
      if (isEdit) await updateExpense(id, payload)
      else        await createExpense(payload)
      toast.success(isEdit ? 'Expense updated!' : 'Expense added!')
      navigate('/expenses')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save expense')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingEdit) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
  }

  const f = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const excludeIds = splits.map(s => s.user.id)

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Details */}
        <div className="card space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            Basic Details
          </h3>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Title</label>
            <div className="relative">
              <input value={form.title} onChange={f('title')} maxLength={80}
                placeholder="e.g. Lunch at Restaurant"
                className={`input-base pr-16 ${errors.title ? 'input-error' : ''}`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: 'var(--text-muted)' }}>{form.title.length}/80</span>
            </div>
            {errors.title && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.title}</p>}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono"
                style={{ color: 'var(--text-muted)' }}>{symbol}</span>
              <input type="number" step="0.01" min="0.01" value={form.amount} onChange={f('amount')}
                placeholder="0.00"
                className={`input-base pl-8 ${errors.amount ? 'input-error' : ''}`} />
            </div>
            {errors.amount && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.amount}</p>}
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Category</label>
            <select value={form.categoryId} onChange={f('categoryId')}
              className={`input-base ${errors.categoryId ? 'input-error' : ''}`}
              disabled={categories.length === 0}>
              <option value="">{categories.length === 0 ? 'Loading categories...' : 'Select category'}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.categoryId}</p>}
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Date</label>
            <input type="date" value={form.date} max={todayISO()} onChange={f('date')}
              className={`input-base ${errors.date ? 'input-error' : ''}`} />
          </div>

          {/* Payment Mode */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Payment Mode</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_MODES.map(pm => (
                <button key={pm} type="button"
                  onClick={() => setForm(f => ({ ...f, paymentMode: pm }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  style={{
                    background:   form.paymentMode === pm ? 'var(--accent)' : 'var(--bg-elevated)',
                    color:        form.paymentMode === pm ? '#fff' : 'var(--text-secondary)',
                    borderColor:  form.paymentMode === pm ? 'var(--accent)' : 'var(--border)',
                  }}>
                  {PAYMENT_MODE_LABELS[pm]}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Notes (optional)</label>
            <div className="relative">
              <textarea value={form.notes} onChange={f('notes')} maxLength={200} rows={3}
                placeholder="Any additional details..."
                className="input-base resize-none" />
              <span className="absolute right-3 bottom-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {form.notes.length}/200
              </span>
            </div>
          </div>
        </div>

        {/* Budget Warning */}
        {budgetWarning && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg border"
            style={{
              background:   budgetWarning.type === 'exceeded' ? 'rgba(217,92,92,0.08)' : 'rgba(232,168,56,0.08)',
              borderColor:  budgetWarning.type === 'exceeded' ? 'var(--danger)' : 'var(--warn)',
              color:        budgetWarning.type === 'exceeded' ? 'var(--danger)' : 'var(--warn)',
            }}>
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">{budgetWarning.msg}</p>
          </div>
        )}

        {/* Split Section */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                Split with Others
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Share this expense with friends</p>
            </div>
            <button type="button" onClick={() => setForm(p => ({ ...p, isShared: !p.isShared }))}
              style={{ color: form.isShared ? 'var(--accent)' : 'var(--text-muted)' }}>
              {form.isShared ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          {form.isShared && (
            <div className="space-y-4">
              <div className="text-sm px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Total: <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                  {symbol}{(totalAmount || 0).toFixed(2)}
                </span> — allocate shares below
              </div>

              {/* Friend Search */}
              <FriendSearchInput
                onSelect={addFriend}
                excludeIds={excludeIds}
                placeholder="Search friends to add..."
              />

              {/* Split List */}
              {splits.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Participants</p>
                    <button type="button" onClick={splitEqually}
                      className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                      Split Equally
                    </button>
                  </div>

                  {splits.map((sp, idx) => {
                    const isYou = sp.user.id === user?.id
                    return (
                      <div key={sp.user.id} className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ background: 'var(--bg-elevated)' }}>
                        <Avatar username={sp.user.username} name={sp.user.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {isYou ? 'You' : sp.user.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{sp.user.username}</p>
                        </div>
                        <div className="relative w-28">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono"
                            style={{ color: 'var(--text-muted)' }}>{symbol}</span>
                          <input
                            type="number" step="0.01" min="0.01"
                            value={sp.amount}
                            onChange={e => updateSplitAmount(sp.user.id, e.target.value)}
                            className="input-base pl-7 text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        {!isYou && (
                          <button type="button" onClick={() => removeSplit(sp.user.id)}
                            className="p-1.5 rounded" style={{ color: 'var(--danger)' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {/* Split progress */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {symbol}{splitTotal.toFixed(2)} of {symbol}{totalAmount.toFixed(2)} allocated
                      </span>
                      {!splitValid && splitTotal > 0 && (
                        <span style={{ color: 'var(--danger)' }}>
                          {splitTotal > totalAmount
                            ? `Over by ${symbol}${(splitTotal - totalAmount).toFixed(2)}`
                            : `Under by ${symbol}${(totalAmount - splitTotal).toFixed(2)}`
                          }
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((splitTotal / (totalAmount || 1)) * 100, 100)}%`,
                          background: splitValid ? 'var(--success)' : splitTotal > totalAmount ? 'var(--danger)' : 'var(--accent)',
                        }} />
                    </div>
                  </div>
                </div>
              )}
              {errors.splits && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.splits}</p>}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button type="button" variant="secondary" onClick={() => navigate('/expenses')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Update Expense' : 'Save Expense'}
          </Button>
        </div>
      </form>
    </div>
  )
}
