import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { useCurrency } from '../../hooks/useCurrency'

export default function SettlementRow({ settlement, type, onPay, onMarkPaid }) {
  const { format } = useCurrency()
  const remaining = settlement.owedAmount - settlement.paidAmount

  return (
    <div className="card-compact flex items-center gap-4">
      <Avatar
        username={type === 'owe' ? settlement.owedTo?.username : settlement.owedBy?.username}
        name={type === 'owe' ? settlement.owedTo?.name : settlement.owedBy?.name}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {settlement.sharedExpense?.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {type === 'owe'
            ? `Owed to @${settlement.owedTo?.username}`
            : `Owed by @${settlement.owedBy?.username}`}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-mono font-medium text-sm" style={{ color: type === 'owe' ? 'var(--danger)' : 'var(--success)' }}>
          {format(remaining)}
        </p>
        <Badge status={settlement.status} className="mt-1">
          {settlement.status === 'PARTIALLY_PAID' ? 'Partial' : settlement.status}
        </Badge>
      </div>

      {type === 'owe' && (
        <Button variant="primary" size="sm" onClick={() => onPay(settlement)}>
          Pay
        </Button>
      )}
      {type === 'owed' && (
        <Button variant="secondary" size="sm" onClick={() => onMarkPaid(settlement)}>
          Mark Paid
        </Button>
      )}
    </div>
  )
}