import { CURRENCY_SYMBOLS } from './constants'

export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const getCurrencySymbol = (currency = 'INR') => {
  return CURRENCY_SYMBOLS[currency] || currency
}