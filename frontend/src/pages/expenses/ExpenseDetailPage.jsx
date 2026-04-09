import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Pencil, Trash2, ArrowLeft, ExternalLink, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { getExpense, deleteExpense } from '../../api/expenses'
import { getMessages, sendMessage } from '../../api/groups'
import { paySettlement } from '../../api/settlements'
import { useAuth } from '../../hooks/useAuth'
import { useCurrency } from '../../hooks/useCurrency'
import { formatDate, formatRelative } from '../../utils/formatDate'
import { CATEGORIES, PAYMENT_MODE_LABELS, PAYMENT_MODES } from '../../utils/constants'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

export default function ExpenseDetailPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const { format, symbol } = useCurrency()

  const [expense, setExpense]     = useState(null)
  const [messages, setMessages]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [msgText, setMsgText]     = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount]  = useState('')
  const [payMode, setPayMode]      = useState('CASH')
  const [paying, setPaying]        = useState(false)
  const [deleting, setDeleting]    = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getExpense(id)
        setExpense(res.data)
        const se = res.data.sharedExpense
        if (se?.groupId) {
          const msgRes = await getMessages(se.groupId, { limit: 10 })
          setMessages(msgRes.data.messages || [])
        }
      } catch {
        toast.error('Expense not found')
        navigate('/expenses')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
  if (!expense) return null

  const cat        = CATEGORIES.find(c => c.name === expense.category?.name)
  const isShared   = expense.type === 'SHARED' || !!expense.sharedExpense
  const se         = expense.sharedExpense
  const mySplit    = se?.splits?.find(s => s.user?.id === user?.id || s.userId === user?.id)
  const isOwner    = expense.userId === user?.id
  const hasPayments = se?.splits?.some(s => s.paidAmount > 0)
  const canEdit    = isOwner && !isShared && !hasPayments
  const remaining  = mySplit ? mySplit.owedAmount - mySplit.paidAmount : 0

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteExpense(id)
      toast.success('Expense deleted')
      navigate('/expenses')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot delete this expense')
    } finally {
      setDeleting(false)
    }
  }

  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0) return
    setPaying(true)
    try {
      await paySettlement(mySplit.id, { amount: Number(payAmount), mode: payMode })
      toast.success('Payment recorded!')
      setShowPayModal(false)
      // Refetch
      const res = await getExpense(id)
      setExpense(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  const handleSendMsg = async () => {
    if (!msgText.trim() || !se?.groupId) return
    setSendingMsg(true)
    try {
      const res = await sendMessage(se.groupId, { message: msgText.trim(), expenseId: id })
      setMessages(prev => [...prev, res.data])
      setMsgText('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSendingMsg(false)
    }
  }

  return (
    <div>
      <Link to="/expenses" className="inline-flex items-center gap-2 text-sm mb-5"
        style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={14} /> Back to Expenses
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Expense Details */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                {isShared && <Badge status="SHARED" className="mb-2">Shared Expense</Badge>}
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                  {expense.title}
                </h2>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Link to={`/expenses/${id}/edit`}>
                    <button className="p-2 rounded-lg transition-colors"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>
                      <Pencil size={14} />
                    </button>
                  </Link>
                  <button onClick={() => setShowDelete(true)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <p className="text-4xl font-mono font-medium mb-4" style={{ color: 'var(--accent)' }}>
              {format(expense.amount)}
            </p>

            <div className="flex flex-wrap gap-2 text-sm mb-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--bg-elevated)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: cat?.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{expense.category?.name}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                📅 {formatDate(expense.date || expense.createdAt)}
              </div>
              <div className="px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                {PAYMENT_MODE_LABELS[expense.paymentMode]}
              </div>
            </div>

            {isShared && se?.paidBy && (
              <div className="flex items-center gap-2 p-3 rounded-lg mb-3"
                style={{ background: 'var(--bg-elevated)' }}>
                <Avatar username={se.paidBy.username} name={se.paidBy.name} size="sm" />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Paid by</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {se.paidBy.id === user?.id ? 'You' : se.paidBy.name}
                  </p>
                </div>
              </div>
            )}

            {expense.notes && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Notes</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{expense.notes}</p>
              </div>
            )}
          </div>

          {/* Pay your share */}
          {isShared && mySplit && mySplit.status !== 'PAID' && se?.paidBy?.id !== user?.id && (
            <Button variant="primary" className="w-full" onClick={() => { setPayAmount(remaining.toFixed(2)); setShowPayModal(true) }}>
              Pay Your Share — {format(remaining)} remaining
            </Button>
          )}
        </div>

        {/* Right: Splits + Chat */}
        {isShared && (
          <div className="space-y-4">
            {/* Split Breakdown */}
            <div className="card">
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                Split Breakdown
              </h3>
              <div className="space-y-2">
                {(se?.splits || []).map(split => {
                  const isMe = split.user?.id === user?.id || split.userId === user?.id
                  const rem  = split.owedAmount - split.paidAmount
                  return (
                    <div key={split.id} className="flex items-center gap-3 p-3 rounded-lg"
                      style={{
                        background: isMe ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                        border: isMe ? '1px solid rgba(var(--accent-rgb), 0.3)' : 'none',
                      }}>
                      <Avatar username={split.user?.username} name={split.user?.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {isMe ? 'You' : split.user?.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Paid: {format(split.paidAmount)} / {format(split.owedAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono" style={{ color: rem > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {rem > 0 ? `-${format(rem)}` : '✓'}
                        </p>
                        <Badge status={split.status} className="mt-0.5 text-[10px]">
                          {split.status === 'PARTIALLY_PAID' ? 'Partial' : split.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Group Chat mini */}
            {se?.groupId && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                    Group Chat
                  </h3>
                  <Link to={`/groups/${se.groupId}`}
                    className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                    Open Full Chat <ExternalLink size={10} />
                  </Link>
                </div>

                {/* Messages */}
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {messages.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No messages yet</p>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.user?.id === user?.id
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          {!isMe && <Avatar username={msg.user?.username} name={msg.user?.name} size="sm" />}
                          <div className={`max-w-xs px-3 py-2 rounded-xl text-xs ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                            style={{
                              background: isMe ? 'rgba(var(--accent-rgb), 0.2)' : 'var(--bg-elevated)',
                              color: 'var(--text-primary)',
                            }}>
                            {!isMe && <p className="font-medium mb-0.5" style={{ color: 'var(--accent)' }}>{msg.user?.username}</p>}
                            <p>{msg.message}</p>
                            <p className="text-[10px] mt-1 opacity-60">{formatRelative(msg.createdAt)}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input value={msgText} onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMsg() } }}
                    placeholder="Type a message..." className="input-base flex-1 text-xs" />
                  <Button variant="primary" size="sm" loading={sendingMsg} onClick={handleSendMsg}>
                    <Send size={12} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pay Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title={`Settle Payment — ${expense.title}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button variant="primary" loading={paying} onClick={handlePay}>
              Pay {symbol}{payAmount || '0.00'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Total Owed', value: format(mySplit?.owedAmount || 0), color: 'var(--text-primary)' },
              { label: 'Already Paid', value: format(mySplit?.paidAmount || 0), color: 'var(--success)' },
              { label: 'Remaining', value: format(remaining), color: 'var(--danger)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="font-mono font-medium" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Amount to Pay</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{symbol}</span>
              <input type="number" step="0.01" min="0.01" max={remaining}
                value={payAmount} onChange={e => setPayAmount(e.target.value)}
                className="input-base pl-8" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Payment Mode</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_MODES.map(pm => (
                <button key={pm} type="button" onClick={() => setPayMode(pm)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  style={{
                    background:  payMode === pm ? 'var(--accent)' : 'var(--bg-elevated)',
                    color:       payMode === pm ? '#fff' : 'var(--text-secondary)',
                    borderColor: payMode === pm ? 'var(--accent)' : 'var(--border)',
                  }}>
                  {PAYMENT_MODE_LABELS[pm]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Expense"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
          </>
        }>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Delete <strong style={{ color: 'var(--text-primary)' }}>"{expense.title}"</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
