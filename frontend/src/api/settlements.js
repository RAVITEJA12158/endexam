import api from './axios'

export const getOwed       = ()              => api.get('/settlements/owe')
export const getOwedToMe   = ()              => api.get('/settlements/owed')
export const paySettlement = (splitId, data) => api.post(`/settlements/${splitId}/pay`, data)
export const markPaid      = (splitId)       => api.post(`/settlements/${splitId}/mark-paid`)