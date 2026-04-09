import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Receipt, PlusCircle, Users, ArrowLeftRight,
  PieChart, UserPlus, MessageSquare, Download, LogOut,
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/expenses',     label: 'Expenses',         icon: Receipt },
  { to: '/expenses/add', label: 'Add Expense',      icon: PlusCircle, highlight: true },
  { to: '/settlements',  label: 'Settlements',      icon: ArrowLeftRight },
  { to: '/budget',       label: 'Budgets',          icon: PieChart },
  { to: '/friends',      label: 'Friends',          icon: UserPlus, showBadge: true },
  { to: '/groups',       label: 'Groups / Chat',    icon: MessageSquare },
  { to: '/export',       label: 'Export',           icon: Download },
]

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const { unreadCount }  = useNotifications()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div
      className="flex flex-col h-full w-64 border-r"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <span className="text-white font-bold text-sm font-mono">S</span>
          </div>
          <span className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            SpendSplit
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, highlight, showBadge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/expenses/add' ? false : to !== '/expenses'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'nav-active' : 'nav-inactive'
                } ${highlight ? 'mt-1' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    style={{ color: highlight ? 'var(--accent)' : isActive ? 'var(--accent)' : 'inherit' }}
                  />
                  <span className="flex-1">{label}</span>
                  {showBadge && unreadCount > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-mono"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <Avatar username={user?.username} name={user?.name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{user?.username} · {user?.currency}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--danger)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger)/10'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )
}