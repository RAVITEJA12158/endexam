import { useAuth } from './useAuth'
import { formatCurrency, getCurrencySymbol } from '../utils/formatCurrency'

export const useCurrency = () => {
  const { user } = useAuth()
  const currency = user?.currency || 'INR'
  return {
    format: (amount) => formatCurrency(amount, currency),
    symbol: getCurrencySymbol(currency),
    currency,
  }
}