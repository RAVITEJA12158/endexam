import api from './axios'

export const getSharedExpenses = ()    => api.get('/shared-expenses')
export const getSharedExpense  = (id)  => api.get(`/shared-expenses/${id}`)