import api from './axios'

export const getGroups   = ()                    => api.get('/groups')
export const getMessages = (groupId, params)     => api.get(`/groups/${groupId}/messages`, { params })
export const sendMessage = (groupId, data)       => api.post(`/groups/${groupId}/messages`, data)