import http from './index'

export const login = (data) => http.post('/api/login', data)
export const logout = () => http.post('/api/logout')
