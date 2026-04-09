export const CATEGORIES = [
  { name: 'Food',             color: '#4A9B7F', icon: '🍜' },
  { name: 'Transport',        color: '#4A8FD4', icon: '🚗' },
  { name: 'Shopping',         color: '#E8A838', icon: '🛍️' },
  { name: 'Education',        color: '#9B6ED4', icon: '📚' },
  { name: 'Entertainment',    color: '#D95C5C', icon: '🎬' },
  { name: 'Health & Medical', color: '#5BAD7F', icon: '🏥' },
  { name: 'Utilities',        color: '#D4A84A', icon: '💡' },
  { name: 'Others',           color: '#6B8EC4', icon: '📦' },
]

const CATEGORY_ORDER = new Map(CATEGORIES.map(({ name }, index) => [name, index]))

export const getCategoryMeta = (name) =>
  CATEGORIES.find((category) => category.name === name) || { color: '#6B8EC4', icon: '•' }

export const sortCategories = (categories = []) =>
  [...categories].sort((left, right) => {
    const leftOrder = CATEGORY_ORDER.get(left.name) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = CATEGORY_ORDER.get(right.name) ?? Number.MAX_SAFE_INTEGER
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return (left.name || '').localeCompare(right.name || '')
  })

export const PAYMENT_MODES = ['CASH', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING']

export const PAYMENT_MODE_LABELS = {
  CASH:        'Cash',
  UPI:         'UPI',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD:  'Debit Card',
  NET_BANKING: 'Net Banking',
}

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
}

export const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹) — Indian Rupee' },
  { value: 'USD', label: 'USD ($) — US Dollar' },
  { value: 'EUR', label: 'EUR (€) — Euro' },
  { value: 'GBP', label: 'GBP (£) — British Pound' },
  { value: 'JPY', label: 'JPY (¥) — Japanese Yen' },
]

export const CHART_COLORS = [
  '#4A9B7F', '#4A8FD4', '#E8A838', '#D95C5C',
  '#9B6ED4', '#5BAD7F', '#D4A84A', '#6B8EC4',
]

export const SPLIT_STATUS = {
  PENDING:        'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID:           'PAID',
}
