import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'
import { CATEGORIES, PAYMENT_MODE_LABELS } from '../../utils/constants'
import { formatDate } from '../../utils/formatDate'
import { useCurrency } from '../../hooks/useCurrency'

export default function ExpenseCard({ expense }) {
  const { format } = useCurrency()
  const cat = CATEGORIES.find(c => c.name === expense.category?.name)

  return (
    <Link to={`/expenses/${expense.id}`}>
      <div
        className="card-compact flex flex-col gap-2 hover:border-[--border-focus] transition-colors cursor-pointer"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: cat?.color || 'var(--text-muted)' }} />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{expense.title}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{expense.category?.name}</p>
            </div>
          </div>
          <p className="font-mono font-medium text-sm flex-shrink-0" style={{ color: 'var(--danger)' }}>
            -{format(expense.amount)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              {PAYMENT_MODE_LABELS[expense.paymentMode] || expense.paymentMode}
            </span>
            {expense.type === 'SHARED' || expense.sharedExpense ? (
              <Badge status="SHARED">Shared</Badge>
            ) : null}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(expense.date || expense.createdAt)}</p>
        </div>
      </div>
    </Link>
  )
}