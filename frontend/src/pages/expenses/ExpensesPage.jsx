import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, Pencil, Trash2, Eye, Download, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getExpenses, deleteExpense } from '../../api/expenses'
import { getCategories } from '../../api/categories'
import { useCurrency } from '../../hooks/useCurrency'
import { formatDate } from '../../utils/formatDate'
import { CATEGORIES, PAYMENT_MODE_LABELS } from '../../utils/constants'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest First' },
  { value: 'oldest',      label: 'Oldest First' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc',  label: 'Lowest Amount' },
]

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
}))

export default function ExpensesPage() {
  const { format } = useCurrency()
  const navigate   = useNavigate()
  const now = new Date()

  const [expenses, setExpenses]   = useState([])
  const [total, setTotal]         = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [limit, setLimit]         = useState(20)

  // Filters
  const [search, setSearch]       = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState([])
  const [month, setMonth]         = useState('')
  const [year, setYear]           = useState(String(now.getFullYear()))
  const [sort, setSort]           = useState('newest')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit, sort }
      if (search)     params.search     = search
      if (categoryId) params.categoryId = categoryId
      if (month)      params.month      = month
      if (year)       params.year       = year
      const res = await getExpenses(params)
      setExpenses(res.data.expenses || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.totalPages || 1)
    } catch {
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [page, limit, sort, search, categoryId, month, year])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await getCategories()
        setCategories(res.data.categories || [])
      } catch {
        toast.error('Failed to load categories')
      }
    }
    loadCategories()
  }, [])

  const hasFilters = search || categoryId || month || sort !== 'newest'

  const clearFilters = () => {
    setSearch(''); setCategoryId(''); setMonth(''); setSort('newest'); setPage(1)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteExpense(deleteTarget.id)
      toast.success('Expense deleted')
      setDeleteTarget(null)
      fetchExpenses()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot delete this expense')
    } finally {
      setDeleting(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {total} expense{total !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <Link to="/export">
            <Button variant="secondary" size="sm">
              <Download size={14} /> Export
            </Button>
          </Link>
          <Link to="/expenses/add">
            <Button variant="primary" size="sm">
              <Plus size={14} /> Add Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative col-span-2 lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search title or notes..."
              className="input-base pl-9"
            />
          </div>

          {/* Category */}
          <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1) }} className="input-base">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Month */}
          <select value={month} onChange={e => { setMonth(e.target.value); setPage(1) }} className="input-base">
            <option value="">All Months</option>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          {/* Year */}
          <select value={year} onChange={e => { setYear(e.target.value); setPage(1) }} className="input-base">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }} className="input-base w-48">
            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs btn-ghost py-1.5">
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-4 flex-1 rounded" />
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon="💸"
            title="No expenses found"
            description={hasFilters ? 'Try adjusting your filters' : 'Add your first expense to get started'}
            action={
              !hasFilters && (
                <Link to="/expenses/add">
                  <Button variant="primary" size="sm"><Plus size={14} /> Add Expense</Button>
                </Link>
              )
            }
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Date', 'Title', 'Category', 'Amount', 'Payment', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => {
                    const cat = CATEGORIES.find(c => c.name === exp.category?.name)
                    const isShared = exp.type === 'SHARED' || !!exp.sharedExpense
                    return (
                      <tr key={exp.id} className="border-b transition-colors"
                        style={{ borderColor: 'var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(exp.date || exp.createdAt)}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                              {exp.title}
                            </span>
                            {isShared && <Badge status="SHARED">Shared</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: cat?.color || 'var(--text-muted)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{exp.category?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--danger)' }}>
                          -{format(exp.amount)}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {PAYMENT_MODE_LABELS[exp.paymentMode] || exp.paymentMode}
                        </td>
                        <td className="px-4 py-3">
                          {isShared && exp.sharedExpense?.splits ? (() => {
                            const mySplit = exp.sharedExpense.splits[0]
                            return mySplit ? <Badge status={mySplit.status}>{mySplit.status === 'PARTIALLY_PAID' ? 'Partial' : mySplit.status}</Badge> : null
                          })() : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link to={`/expenses/${exp.id}`}>
                              <button className="p-1.5 rounded transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--info)'; e.currentTarget.style.background = 'var(--info)/10' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                                <Eye size={14} />
                              </button>
                            </Link>
                            {!isShared && (
                              <>
                                <Link to={`/expenses/${exp.id}/edit`}>
                                  <button className="p-1.5 rounded transition-colors"
                                    style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-glow)' }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                                    <Pencil size={14} />
                                  </button>
                                </Link>
                                <button
                                  onClick={() => setDeleteTarget(exp)}
                                  className="p-1.5 rounded transition-colors"
                                  style={{ color: 'var(--text-muted)' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger)/10' }}
                                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {expenses.map(exp => {
                const cat = CATEGORIES.find(c => c.name === exp.category?.name)
                return (
                  <Link key={exp.id} to={`/expenses/${exp.id}`}>
                    <div className="px-4 py-3 flex items-center gap-3"
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat?.color || 'var(--text-muted)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{exp.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {exp.category?.name} · {formatDate(exp.date || exp.createdAt)}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-medium flex-shrink-0" style={{ color: 'var(--danger)' }}>
                        -{format(exp.amount)}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              ← Prev
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: p === page ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: p === page ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {p}
                </button>
              )
            })}
            <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next →
            </Button>
            <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
              className="input-base w-20 text-xs">
              {[10, 20, 50].map(l => <option key={l} value={l}>{l}/page</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Expense"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{deleteTarget?.title}"</strong>?
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
