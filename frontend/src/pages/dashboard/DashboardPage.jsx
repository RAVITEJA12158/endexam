import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Calendar, Receipt, Zap,
  ArrowUpRight, ArrowDownLeft, Minus
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getSummary, getRecentTxns } from '../../api/dashboard'
import { useCurrency } from '../../hooks/useCurrency'
import { useSocket } from '../../hooks/useSocket'
import { formatRelative } from '../../utils/formatDate'
import { CATEGORIES } from '../../utils/constants'
import ExpensePieChart from '../../components/charts/ExpensePieChart'
import MonthlyBarChart from '../../components/charts/MonthlyBarChart'
import DailyLineChart from '../../components/charts/DailyLineChart'
import Badge from '../../components/ui/Badge'

function StatCard({ icon: Icon, label, value, sub, iconColor, valueColor }) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          <p className="text-2xl font-mono font-medium mt-1" style={{ color: valueColor || 'var(--text-primary)' }}>
            {value}
          </p>
          {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        <div className="p-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
          <Icon size={18} style={{ color: iconColor || 'var(--accent)' }} />
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card flex flex-col gap-3">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton h-8 w-32 rounded" />
      <div className="skeleton h-3 w-16 rounded" />
    </div>
  )
}

export default function DashboardPage() {
  const { format } = useCurrency()
  const { onSettlementUpdate } = useSocket()
  const [summary, setSummary]   = useState(null)
  const [recent, setRecent]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [chartTab, setChartTab] = useState('monthly')

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, txnRes] = await Promise.all([getSummary(), getRecentTxns()])
      setSummary(sumRes.data)
      setRecent(txnRes.data.transactions || [])
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Real-time: refetch settlements section
  useEffect(() => {
    return onSettlementUpdate(() => fetchData())
  }, [onSettlementUpdate, fetchData])

  const cm = summary?.currentMonth
  const now = new Date()
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              icon={TrendingUp} label="Total This Month"
              value={format(cm?.totalExpenses || 0)} sub={monthName}
            />
            <StatCard
              icon={Calendar} label="Total This Year"
              value={format(summary?.currentYear?.totalExpenses || 0)}
              sub={`Year ${now.getFullYear()}`}
            />
            <StatCard
              icon={Receipt} label="Transactions"
              value={cm?.transactionCount || 0} sub="this month"
            />
            <StatCard
              icon={Zap} label="Highest Category"
              value={cm?.highestCategory?.name || '—'}
              sub={cm?.highestCategory ? format(cm.highestCategory.amount) : 'No data'}
              iconColor="var(--warn)"
            />
          </>
        )}
      </div>

      {/* Settlement Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="card flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(217,92,92,0.1)' }}>
                <ArrowUpRight size={18} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>You Owe</p>
                <p className="font-mono font-medium text-lg" style={{ color: 'var(--danger)' }}>
                  {format(summary?.settlements?.totalOwe || 0)}
                </p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(91,173,127,0.1)' }}>
                <ArrowDownLeft size={18} style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Owed to You</p>
                <p className="font-mono font-medium text-lg" style={{ color: 'var(--success)' }}>
                  {format(summary?.settlements?.totalOwed || 0)}
                </p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <Minus size={18} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Net Balance</p>
                {(() => {
                  const net = summary?.settlements?.netBalance || 0
                  return (
                    <p className="font-mono font-medium text-lg"
                      style={{ color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {format(Math.abs(net))} {net >= 0 ? '↑' : '↓'}
                    </p>
                  )
                })()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar / Line Chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
              Spending Overview
            </h3>
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              {['monthly', 'daily'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setChartTab(tab)}
                  className="px-3 py-1.5 text-xs font-medium transition-colors capitalize"
                  style={{
                    background: chartTab === tab ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: chartTab === tab ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {tab === 'monthly' ? 'Last 6 Months' : 'Daily (This Month)'}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="skeleton h-52 rounded-lg" />
          ) : chartTab === 'monthly' ? (
            <MonthlyBarChart data={summary?.last6Months || []} />
          ) : (
            <DailyLineChart data={summary?.dailyThisMonth || []} />
          )}
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            By Category — {monthName.split(' ')[0]}
          </h3>
          {loading ? (
            <div className="skeleton h-52 rounded-lg" />
          ) : (
            <ExpensePieChart data={cm?.byCategory || []} />
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            Recent Transactions
          </h3>
          <Link to="/expenses" className="text-xs font-medium flex items-center gap-1"
            style={{ color: 'var(--accent)' }}>
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-2 h-2 rounded-full" />
                <div className="flex-1 skeleton h-4 rounded" />
                <div className="skeleton h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No transactions yet</p>
        ) : (
          <div className="space-y-1">
            {recent.map((txn) => {
              const cat = CATEGORIES.find(c => c.name === txn.category?.name)
              return (
                <div key={txn.id} className="flex items-center gap-3 py-2.5 border-b last:border-0"
                  style={{ borderColor: 'var(--border)' }}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: cat?.color || 'var(--text-muted)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)', maxWidth: '200px' }}>
                        {txn.title}
                      </p>
                      {txn.isShared && <Badge status="SHARED">Shared</Badge>}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {txn.category?.name} · {formatRelative(txn.createdAt)}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-medium flex-shrink-0"
                    style={{ color: txn.type === 'PAYMENT' ? 'var(--success)' : 'var(--danger)' }}>
                    {txn.type === 'PAYMENT' ? '+' : '-'}{format(txn.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}