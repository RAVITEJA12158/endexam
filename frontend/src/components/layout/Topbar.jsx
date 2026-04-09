import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import Avatar from '../ui/Avatar'
import NotificationPanel from '../shared/NotificationPanel'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'

const pageTitles = {
  '/dashboard':    'Dashboard',
  '/expenses':     'Expenses',
  '/expenses/add': 'Add Expense',
  '/settlements':  'Settlements',
  '/budget':       'Budgets',
  '/friends':      'Friends',
  '/groups':       'Group Chat',
  '/export':       'Export Data',
}

export default function Topbar({ onMenuClick }) {
  const { user }            = useAuth()
  const { unreadCount }     = useNotifications()
  const { pathname }        = useLocation()
  const [notifOpen, setNotifOpen] = useState(false)

  const title = pageTitles[pathname] ||
    (pathname.startsWith('/expenses/') && pathname.endsWith('/edit') ? 'Edit Expense' :
    pathname.startsWith('/expenses/') ? 'Expense Detail' :
    pathname.startsWith('/groups/') ? 'Group Chat' : 'SpendSplit')

  return (
    <header
      className="flex items-center justify-between px-6 py-3 border-b z-30 sticky top-0"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-1.5 rounded-lg"
          style={{ color: 'var(--text-secondary)' }}
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>
        <h1
          className="font-semibold text-base"
          style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Currency */}
        <span className="text-xs px-2 py-1 rounded-lg font-mono hidden sm:block"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          {user?.currency || 'INR'}
        </span>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        {/* Avatar */}
        <Avatar username={user?.username} name={user?.name} size="sm" />
      </div>
    </header>
  )
}