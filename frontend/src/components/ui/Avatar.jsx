const COLORS = [
  '#4A9B7F','#4A8FD4','#E8A838','#D95C5C',
  '#9B6ED4','#5BAD7F','#D4A84A','#6B8EC4',
]

function hashString(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export default function Avatar({ name = '', username = '', size = 'md', className = '' }) {
  const str = username || name || '?'
  const color = COLORS[hashString(str) % COLORS.length]
  const initials = str.slice(0, 2).toUpperCase()

  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  }

  return (
    <div
      className={`${sizes[size]} rounded-lg flex items-center justify-center font-mono font-bold flex-shrink-0 ${className}`}
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {initials}
    </div>
  )
}