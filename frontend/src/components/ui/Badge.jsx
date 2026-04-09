export default function Badge({ status, children, className = '' }) {
  const map = {
    PAID:           'badge-paid',
    PARTIALLY_PAID: 'badge-partial',
    PENDING:        'badge-pending',
    SHARED:         'badge-shared',
    INFO:           'badge-info',
  }
  return (
    <span className={`${map[status] || 'badge-info'} ${className}`}>
      {children}
    </span>
  )
}