import api from './axios'

export const getSummary    = () => api.get('/dashboard/summary')
export const getRecentTxns = () => api.get('/dashboard/recent-transactions')