export default function Card({ children, className = '', compact = false, ...props }) {
  return (
    <div className={`${compact ? 'card-compact' : 'card'} ${className}`} {...props}>
      {children}
    </div>
  )
}