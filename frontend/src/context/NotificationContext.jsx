import { createContext, useState, useEffect, useCallback, useContext } from 'react'
import toast from 'react-hot-toast'
import { getNotifications, markRead, markAllRead } from '../api/notifications'
import { AuthContext } from './AuthContext'
import { SocketContext } from './SocketContext'

export const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext)
  const socketCtx = useContext(SocketContext)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const res = await getNotifications({ unreadOnly: false, limit: 50 })
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unreadCount || 0)
    } catch { /* silent */ }
  }, [isAuthenticated])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Listen for new notifications from socket
  useEffect(() => {
    if (!socketCtx?.socket) return
    const handler = ({ notification }) => {
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((c) => c + 1)
      toast(notification.title, {
        icon: '🔔',
        style: {
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--accent)',
        },
      })
    }
    socketCtx.socket.on('notification:new', handler)
    socketCtx.socket.on('expense:shared_created', ({ sharedExpense }) => {
      toast(`You were added to a shared expense: ${sharedExpense?.title || ''}`, {
        icon: '💸',
      })
    })
    return () => {
      socketCtx.socket?.off('notification:new', handler)
    }
  }, [socketCtx?.socket])

  const addNotification = useCallback((n) => {
    setNotifications((prev) => [n, ...prev])
    setUnreadCount((c) => c + 1)
  }, [])

  const markAsRead = useCallback(async (id) => {
    try {
      await markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch { /* silent */ }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* silent */ }
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, addNotification, markAsRead, markAllAsRead, fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}