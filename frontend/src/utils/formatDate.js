import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

const safeParse = (d) => {
  if (!d) return null
  try {
    const parsed = typeof d === 'string' ? parseISO(d) : new Date(d)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const formatDate = (d) => {
  const parsed = safeParse(d)
  return parsed ? format(parsed, 'MMM d, yyyy') : '—'
}

export const formatRelative = (d) => {
  const parsed = safeParse(d)
  return parsed ? formatDistanceToNow(parsed, { addSuffix: true }) : '—'
}

export const formatMonth = (m, y) => {
  try {
    return format(new Date(y, m - 1), 'MMMM yyyy')
  } catch {
    return `${m}/${y}`
  }
}

export const formatShortMonth = (m, y) => {
  try {
    return format(new Date(y, m - 1), 'MMM yy')
  } catch {
    return `${m}/${y}`
  }
}

export const todayISO = () => format(new Date(), 'yyyy-MM-dd')