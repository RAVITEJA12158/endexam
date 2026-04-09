import api from './axios'

export const exportCSV = (params) => api.get('/export/csv', { params, responseType: 'blob' })