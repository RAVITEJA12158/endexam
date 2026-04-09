import React, { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react"
import toast from "react-hot-toast"
import { getCategories } from "../../api/categories"
import { getBudgets, createBudget, deleteBudget } from "../../api/budgets"
import { formatCurrency } from "../../utils/formatCurrency"
import { getCategoryMeta, sortCategories } from "../../utils/constants"
import Modal from "../../components/ui/Modal"
import Spinner from "../../components/ui/Spinner"

function BudgetModal({ category, budget, month, year, onClose, onSaved }) {
  const [limit, setLimit] = useState(budget?.limitAmount || "")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    const val = parseFloat(limit)
    if (!val || val <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    try {
      setLoading(true)
      await createBudget({ categoryId: category.id, limitAmount: val, month, year })
      toast.success("Budget saved!")
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save budget")
    } finally {
      setLoading(false)
    }
  }

  const monthName = new Date(year, month - 1).toLocaleString("default", { month: "long" })

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${budget ? "Edit" : "Set"} Budget — ${category.name}`}
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] text-sm hover:bg-[--bg-hover]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[--accent] text-white text-sm font-medium hover:bg-[--accent-hover] disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Spinner size="sm" />}
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-[--bg-elevated] rounded-lg px-3 py-2 text-sm text-[--text-muted]">
          Period: {monthName} {year}
        </div>
        <div>
          <label className="block text-xs text-[--text-secondary] mb-1.5">Monthly Limit</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[--text-muted]">₹</span>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="0.00"
              min="1"
              step="0.01"
              className="w-full bg-[--bg-elevated] border border-[--border] rounded-lg pl-7 pr-3 py-2 text-[--text-primary] text-sm placeholder:text-[--text-muted] focus:outline-none focus:border-[--border-focus] focus:ring-1 focus:ring-[--accent]/30 transition-colors"
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function BudgetPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [modal, setModal] = useState(null) // { category, budget }

  useEffect(() => {
    let ignore = false

    const loadCategories = async () => {
      try {
        const res = await getCategories()
        if (ignore) return

        setCategories(
          sortCategories(
            (res.data.categories || []).map((category) => ({
              ...category,
              ...getCategoryMeta(category.name),
            }))
          )
        )
      } catch {
        if (!ignore) setCategories([])
      } finally {
        if (!ignore) setLoadingCategories(false)
      }
    }

    loadCategories()

    return () => {
      ignore = true
    }
  }, [])

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getBudgets({ month, year })
      setBudgets(res.data.budgets || [])
    } catch {
      toast.error("Failed to load budgets")
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const monthName = new Date(year, month - 1).toLocaleString("default", { month: "long" })
  const currentMonthStr = `${monthName} ${year}`
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  const getBudgetForCategory = (cat) =>
    budgets.find((b) => b.category?.id === cat.id)

  const totalBudgeted = budgets.reduce((s, b) => s + (b.limitAmount || 0), 0)
  const totalSpent = budgets.reduce((s, b) => s + (b.spentAmount || 0), 0)
  const overallPercent = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0

  const barColor = (pct) => {
    if (pct >= 100) return "bg-[--danger]"
    if (pct >= 60) return "bg-[--warn]"
    return "bg-[--accent]"
  }

  const statusPill = (status) => {
    const map = {
      ok: "bg-[--success]/10 text-[--success] border-[--success]/20",
      warning: "bg-[--warn]/10 text-[--warn] border-[--warn]/20",
      exceeded: "bg-[--danger]/10 text-[--danger] border-[--danger]/20",
    }
    const labels = { ok: "On Track", warning: "Warning", exceeded: "Exceeded" }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${map[status] || map.ok}`}>
        {labels[status] || "On Track"}
      </span>
    )
  }

  return (
    <div className="px-6 py-6">
      <h1 className="text-2xl font-bold text-[--text-primary] mb-6" style={{ fontFamily: "Syne" }}>
        Budgets
      </h1>

      {/* Month Selector */}
      <div className="flex items-center gap-4 mb-6 bg-[--bg-card] rounded-xl border border-[--border] p-3 w-fit">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[--text-primary]">{currentMonthStr}</span>
          {isCurrentMonth && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[--accent]/15 text-[--accent]">
              Current
            </span>
          )}
        </div>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Budget Grid */}
      {loading || loadingCategories ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-36 bg-[--bg-card] rounded-xl border border-[--border] animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-[--bg-card] rounded-xl border border-[--border] p-5 text-sm text-[--text-muted]">
          No categories available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {categories.map((cat) => {
            const budget = getBudgetForCategory(cat)
            const pct = budget?.percentUsed || 0

            return (
              <div key={cat.name} className="bg-[--bg-card] rounded-xl border border-[--border] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-semibold text-[--text-primary]">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => setModal({ category: cat, budget })}
                    className="p-1.5 rounded-lg text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
                  >
                    {budget ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>

                {!budget ? (
                  <div className="text-center py-3">
                    <div className="text-xs text-[--text-muted] mb-2">No budget set</div>
                    <button
                      onClick={() => setModal({ category: cat, budget: null })}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[--accent]/10 text-[--accent] border border-[--accent]/20 hover:bg-[--accent]/20"
                    >
                      Set Budget
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end justify-between mb-2">
                      <span className="font-mono text-lg font-semibold text-[--text-primary]">
                        {formatCurrency(budget.limitAmount)}
                      </span>
                      <div className="flex items-center gap-2">
                        {statusPill(budget.status)}
                        <span className="font-mono text-xs text-[--text-muted]">{Math.round(pct)}%</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-[--bg-elevated] rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-[--text-muted]">
                      {formatCurrency(budget.spentAmount)} spent of {formatCurrency(budget.limitAmount)}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Row */}
      {budgets.length > 0 && (
        <div className="bg-[--bg-card] rounded-xl border border-[--border] p-5">
          <h3 className="text-sm font-semibold text-[--text-primary] mb-4">Overall Summary</h3>
          <div className="flex gap-6 mb-3">
            <div>
              <div className="text-xs text-[--text-muted] mb-1">Total Budgeted</div>
              <div className="font-mono text-[--text-primary] font-semibold">
                {formatCurrency(totalBudgeted)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[--text-muted] mb-1">Total Spent</div>
              <div className="font-mono text-[--danger] font-semibold">
                {formatCurrency(totalSpent)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[--text-muted] mb-1">Remaining</div>
              <div className="font-mono text-[--success] font-semibold">
                {formatCurrency(Math.max(totalBudgeted - totalSpent, 0))}
              </div>
            </div>
          </div>
          <div className="relative h-2 bg-[--bg-elevated] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(overallPercent)}`}
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {modal && (
        <BudgetModal
          category={modal.category}
          budget={modal.budget}
          month={month}
          year={year}
          onClose={() => setModal(null)}
          onSaved={fetchBudgets}
        />
      )}
    </div>
  )
}
