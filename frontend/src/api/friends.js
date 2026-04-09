import api from './axios'

export const getFriends    = ()           => api.get('/friends')
export const getRequests   = ()           => api.get('/friends/requests')
export const getSent       = ()           => api.get('/friends/sent')
export const sendRequest   = (identifier) => api.post('/friends/request', { identifier })
export const acceptRequest = (id)         => api.put(`/friends/request/${id}/accept`)
export const rejectRequest = (id)         => api.put(`/friends/request/${id}/reject`)
export const removeFriend  = (id)         => api.delete(`/friends/${id}`)
export const searchUsers   = (q)          => api.get('/friends/search', { params: { q } })