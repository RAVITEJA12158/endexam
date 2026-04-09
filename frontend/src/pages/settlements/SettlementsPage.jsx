import React, { useState, useEffect, useCallback } from "react"
import { ArrowUpRight, ArrowDownLeft } from "lucide-react"
import toast from "react-hot-toast"
import { getOwed, getOwedToMe, paySettlement, markPaid } from "../../api/settlements"
import { formatCurrency } from "../../utils/formatCurrency"
import { formatRelative } from "../../utils/formatDate"
import Avatar from "../../components/ui/Avatar"
import Badge from "../../components/ui/Badge"
import Modal from "../../components/ui/Modal"
import Spinner from "../../components/ui/Spinner"
import EmptyState from "../../components/ui/EmptyState"
import { useSocket } from "../../hooks/useSockets"

const PAYMENT_MODES = ["CASH", "UPI", "CREDIT_CARD", "DEBIT_CARD", "NET_BANKING"]
const PAYMENT_MODE_LABELS = {
  CASH: "Cash",
  UPI: "UPI",
  CREDIT_CARD: "Credit Card",
  DEBIT_CARD: "Debit Card",
  NET_BANKING: "Net Banking",
}

function PayModal({ split, onClose, onSuccess }) {
  const [amount, setAmount] = useState(split?.remainingAmount || "")
  const [mode, setMode] = useState("UPI")
  const [loading, setLoading] = useState(false)

  const remaining = split?.remainingAmount || 0

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0 || numAmount > remaining) {
      toast.error("Invalid amount")
      return
    }
    try {
      setLoading(true)
      await paySettlement(split.splitId, { amount: numAmount, mode })
      toast.success("Payment recorded!")
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to record payment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={!!split}
      onClose={onClose}
      title={`Settle Payment to ${split?.owedTo?.name || split?.owedTo?.username}`}
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] text-sm hover:bg-[--bg-hover]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[--accent] text-white text-sm font-medium hover:bg-[--accent-hover] disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Spinner size="sm" />}
            Pay {formatCurrency(parseFloat(amount) || 0)}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-[--bg-elevated] rounded-lg p-3">
            <div className="text-xs text-[--text-muted] mb-1">Total Owed</div>
            <div className="font-mono text-sm text-[--text-primary]">
              {formatCurrency(split?.owedAmount || 0)}
            </div>
          </div>
          <div className="bg-[--bg-elevated] rounded-lg p-3">
            <div className="text-xs text-[--text-muted] mb-1">Already Paid</div>
            <div className="font-mono text-sm text-[--success]">
              {formatCurrency((split?.owedAmount || 0) - (split?.remainingAmount || 0))}
            </div>
          </div>
          <div className="bg-[--bg-elevated] rounded-lg p-3">
            <div className="text-xs text-[--text-muted] mb-1">Remaining</div>
            <div className="font-mono text-sm text-[--danger]">
              {formatCurrency(split?.remainingAmount || 0)}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-[--text-secondary] mb-1.5">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={remaining}
            step="0.01"
            className="w-full bg-[--bg-elevated] border border-[--border] rounded-lg px-3 py-2 text-[--text-primary] text-sm placeholder:text-[--text-muted] focus:outline-none focus:border-[--border-focus] focus:ring-1 focus:ring-[--accent]/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[--text-secondary] mb-1.5">Payment Mode</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-[--accent] text-white"
                    : "bg-[--bg-elevated] border border-[--border] text-[--text-primary] hover:bg-[--bg-hover]"
                }`}
              >
                {PAYMENT_MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function SettlementsPage() {
  const [tab, setTab] = useState("owe")
  const [owed, setOwed] = useState(null)
  const [owedToMe, setOwedToMe] = useState(null)
  const [loadingOwe, setLoadingOwe] = useState(true)
  const [loadingOwed, setLoadingOwed] = useState(true)
  const [payModal, setPayModal] = useState(null)
  const [confirmMarkPaid, setConfirmMarkPaid] = useState(null)

  const { onSettlementUpdate } = useSocket()

  const fetchOwed = useCallback(async () => {
    try {
      setLoadingOwe(true)
      const res = await getOwed()
      setOwed(res.data)
    } catch {
      toast.error("Failed to load settlements")
    } finally {
      setLoadingOwe(false)
    }
  }, [])

  const fetchOwedToMe = useCallback(async () => {
    try {
      setLoadingOwed(true)
      const res = await getOwedToMe()
      setOwedToMe(res.data)
    } catch {
      toast.error("Failed to load settlements")
    } finally {
      setLoadingOwed(false)
    }
  }, [])

  useEffect(() => {
    fetchOwed()
    fetchOwedToMe()
  }, [fetchOwed, fetchOwedToMe])

  useEffect(() => {
    if (onSettlementUpdate) {
      onSettlementUpdate(() => {
        fetchOwed()
        fetchOwedToMe()
      })
    }
  }, [onSettlementUpdate, fetchOwed, fetchOwedToMe])

  const handleMarkPaid = async (splitId) => {
    try {
      await markPaid(splitId)
      toast.success("Marked as paid")
      setConfirmMarkPaid(null)
      fetchOwedToMe()
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to mark as paid")
    }
  }

  const statusBadge = (status) => {
    const map = {
      PAID: "bg-[--success]/10 text-[--success] border-[--success]/20",
      PARTIALLY_PAID: "bg-[--warn]/10 text-[--warn] border-[--warn]/20",
      PENDING: "bg-[--danger]/10 text-[--danger] border-[--danger]/20",
    }
    const labels = { PAID: "Paid", PARTIALLY_PAID: "Partial", PENDING: "Pending" }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${map[status] || map.PENDING}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="px-6 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-[--text-primary] mb-6" style={{ fontFamily: "Syne" }}>
        Settlements
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[--bg-card] rounded-lg border border-[--border] mb-6 w-fit">
        <button
          onClick={() => setTab("owe")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "owe"
              ? "bg-[--accent] text-white"
              : "text-[--text-secondary] hover:text-[--text-primary]"
          }`}
        >
          You Owe
        </button>
        <button
          onClick={() => setTab("owed")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "owed"
              ? "bg-[--accent] text-white"
              : "text-[--text-secondary] hover:text-[--text-primary]"
          }`}
        >
          Owed to You
        </button>
      </div>

      {tab === "owe" && (
        <div className="space-y-4">
          {loadingOwe ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-[--bg-card] rounded-xl border border-[--border] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {owed?.settlements?.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <ArrowUpRight className="w-5 h-5 text-[--danger]" />
                  <span className="text-lg font-semibold text-[--text-primary]">
                    Total You Owe:{" "}
                    <span className="font-mono text-[--danger]">
                      {formatCurrency(owed.totalOwed || 0)}
                    </span>
                  </span>
                </div>
              )}

              {!owed?.settlements?.length ? (
                <EmptyState
                  icon="✓"
                  title="You're all settled up!"
                  description="No outstanding debts. Great job!"
                  className="text-[--success]"
                />
              ) : (
                owed.settlements.map((s) => (
                  <div
                    key={s.splitId}
                    className="bg-[--bg-card] rounded-xl border border-[--border] p-4 flex items-center gap-4"
                  >
                    <Avatar username={s.owedTo?.username || "?"} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[--text-primary] truncate">
                        {s.sharedExpense?.title}
                      </div>
                      <div className="text-xs text-[--text-muted] mt-0.5">
                        Owed to {s.owedTo?.name || s.owedTo?.username}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-[--danger] font-semibold">
                        {formatCurrency(s.remainingAmount)}
                      </div>
                      <div className="mt-1">{statusBadge(s.status)}</div>
                    </div>
                    <button
                      onClick={() => setPayModal(s)}
                      className="px-3 py-1.5 rounded-lg bg-[--accent] text-white text-xs font-medium hover:bg-[--accent-hover] flex-shrink-0"
                    >
                      Pay
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}

      {tab === "owed" && (
        <div className="space-y-4">
          {loadingOwed ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-[--bg-card] rounded-xl border border-[--border] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {owedToMe?.settlements?.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <ArrowDownLeft className="w-5 h-5 text-[--success]" />
                  <span className="text-lg font-semibold text-[--text-primary]">
                    Total Owed to You:{" "}
                    <span className="font-mono text-[--success]">
                      {formatCurrency(owedToMe.totalOwed || 0)}
                    </span>
                  </span>
                </div>
              )}

              {!owedToMe?.settlements?.length ? (
                <EmptyState
                  title="No one owes you anything right now"
                  description="When friends owe you money, it will appear here."
                />
              ) : (
                owedToMe.settlements.map((s) => (
                  <div
                    key={s.splitId}
                    className="bg-[--bg-card] rounded-xl border border-[--border] p-4 flex items-center gap-4"
                  >
                    <Avatar username={s.owedBy?.username || "?"} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[--text-primary] truncate">
                        {s.sharedExpense?.title}
                      </div>
                      <div className="text-xs text-[--text-muted] mt-0.5">
                        {s.owedBy?.name || s.owedBy?.username} owes you
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-[--success] font-semibold">
                        {formatCurrency(s.remainingAmount)}
                      </div>
                      <div className="mt-1">{statusBadge(s.status)}</div>
                    </div>
                    <button
                      onClick={() => setConfirmMarkPaid(s)}
                      className="px-3 py-1.5 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] text-xs hover:bg-[--bg-hover] flex-shrink-0"
                    >
                      Mark Paid
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <PayModal
          split={payModal}
          onClose={() => setPayModal(null)}
          onSuccess={() => {
            fetchOwed()
            fetchOwedToMe()
          }}
        />
      )}

      {/* Confirm Mark Paid Modal */}
      <Modal
        isOpen={!!confirmMarkPaid}
        onClose={() => setConfirmMarkPaid(null)}
        title="Confirm Payment Received"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfirmMarkPaid(null)}
              className="px-4 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] text-sm hover:bg-[--bg-hover]"
            >
              Cancel
            </button>
            <button
              onClick={() => handleMarkPaid(confirmMarkPaid.splitId)}
              className="px-4 py-2 rounded-lg bg-[--accent] text-white text-sm font-medium hover:bg-[--accent-hover]"
            >
              Confirm
            </button>
          </div>
        }
      >
        <p className="text-[--text-secondary] text-sm">
          Mark{" "}
          <span className="text-[--text-primary] font-medium">
            {confirmMarkPaid?.owedBy?.name || confirmMarkPaid?.owedBy?.username}
          </span>
          's{" "}
          <span className="font-mono text-[--success]">
            {formatCurrency(confirmMarkPaid?.remainingAmount || 0)}
          </span>{" "}
          payment as received?
        </p>
      </Modal>
    </div>
  )
}
