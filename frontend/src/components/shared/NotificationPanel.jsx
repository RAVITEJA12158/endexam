import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, UserPlus, ArrowDownLeft, AlertTriangle, Users, X } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { formatRelative } from '../../utils/formatDate'

const typeIcon = {
  FRIEND_REQUEST:  <UserPlus size={14} />,
  FRIEND_ACCEPTED: <UserPlus size={14} />,
  SPLIT_CREATED:   <Users size={14} />,
  PAYMENT_RECEIVED:<ArrowDownLeft size={14} />,
  BUDGET_WARNING:  <AlertTriangle size={14} />,
  BUDGET_EXCEEDED: <AlertTriangle size={14} />,
}

const typeRoute = {
  FRIEND_REQUEST:   '/friends',
  FRIEND_ACCEPTED:  '/friends',
  SPLIT_CREATED:    '/settlements',
  PAYMENT_RECEIVED: '/settlements',
  BUDGET_WARNING:   '/budget',
  BUDGET_EXCEEDED:  '/budget',
}

export default function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const navigate = useNavigate()
  const panelRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleClick = (n) => {
    if (!n.isRead) markAsRead(n.id)
    navigate(typeRoute[n.type] || '/dashboard')
    onClose()
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-2xl z-50 flex flex-col"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', maxHeight: '420px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Bell size={14} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--accent)', color: '#fff' }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs"
              style={{ color: 'var(--accent)' }}
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            You're all caught up 🎉
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className="w-full text-left px-4 py-3 border-b flex gap-3 transition-colors"
              style={{
                borderColor: 'var(--border)',
                background: n.isRead ? 'transparent' : 'var(--accent-glow)',
                borderLeft: n.isRead ? 'none' : '2px solid var(--accent)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'var(--accent-glow)'}
            >
              <div className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }}>
                {typeIcon[n.type] || <Bell size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{n.body}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{formatRelative(n.createdAt)}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}