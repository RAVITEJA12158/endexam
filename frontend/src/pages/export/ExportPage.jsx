import React, { useState, useEffect } from "react"
import { Download, CheckCircle, Clock } from "lucide-react"
import toast from "react-hot-toast"
import { exportCSV } from "../../api/export"
import { getExpenses } from "../../api/expenses"
import Spinner from "../../components/ui/Spinner"

const MONTHS = [
  { value: "", label: "All months" },
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 2021 }, (_, i) => currentYear - i)

export default function ExportPage() {
  const [month, setMonth] = useState("")
  const [year, setYear] = useState(currentYear)
  const [loading, setLoading] = useState(false)
  const [totalRecords, setTotalRecords] = useState(null)
  const [recentExports, setRecentExports] = useState([])

  useEffect(() => {
    // Load recent exports from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem("recentExports") || "[]")
      setRecentExports(stored.slice(0, 3))
    } catch {}
  }, [])

  useEffect(() => {
    // Fetch total record count for the selected period
    const fetchCount = async () => {
      try {
        const params = {}
        if (month) params.month = month
        if (year) params.year = year
        const res = await getExpenses({ ...params, limit: 1 })
        setTotalRecords(res.data.total || 0)
      } catch {
        setTotalRecords(null)
      }
    }
    fetchCount()
  }, [month, year])

  const dateRangeDisplay = () => {
    if (month) {
      const mName = MONTHS.find((m) => m.value === month)?.label
      return `${mName} ${year}`
    }
    return `Jan ${year} – Dec ${year}`
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      const params = {}
      if (month) params.month = month
      if (year) params.year = year

      const res = await exportCSV(params)
      const blob = new Blob([res.data], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const dateStr = new Date().toISOString().split("T")[0]
      const filename = `expenses_export_${dateStr}.csv`

      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("Export downloaded!")

      // Save to recent exports
      const newEntry = { timestamp: new Date().toISOString(), filename }
      const updated = [newEntry, ...recentExports].slice(0, 3)
      setRecentExports(updated)
      localStorage.setItem("recentExports", JSON.stringify(updated))
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to export")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-6 py-6 flex justify-center">
      <div className="w-full max-w-md space-y-5">
        <h1 className="text-2xl font-bold text-[--text-primary]" style={{ fontFamily: "Syne" }}>
          Export Data
        </h1>

        {/* Main Card */}
        <div className="bg-[--bg-card] rounded-xl border border-[--border] p-6 space-y-5">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[--text-secondary] mb-1.5">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value === "" ? "" : parseInt(e.target.value))}
                className="w-full bg-[--bg-elevated] border border-[--border] rounded-lg px-3 py-2 text-[--text-primary] text-sm focus:outline-none focus:border-[--border-focus] focus:ring-1 focus:ring-[--accent]/30 transition-colors"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[--text-secondary] mb-1.5">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full bg-[--bg-elevated] border border-[--border] rounded-lg px-3 py-2 text-[--text-primary] text-sm focus:outline-none focus:border-[--border-focus] focus:ring-1 focus:ring-[--accent]/30 transition-colors"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range Display */}
          <div className="bg-[--bg-elevated] rounded-lg px-4 py-3 text-sm text-center">
            <span className="text-[--text-muted]">Exporting: </span>
            <span className="text-[--text-primary] font-medium">{dateRangeDisplay()}</span>
          </div>

          {/* What's Included */}
          <div>
            <div className="text-xs font-semibold text-[--text-secondary] mb-2">What's included</div>
            <div className="space-y-1.5">
              {[
                "All personal expenses",
                "All shared expenses you're part of",
                "Settlement records",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-[--text-primary]">
                  <CheckCircle className="w-4 h-4 text-[--success] flex-shrink-0" />
                  {item}
                </div>
              ))}
              {totalRecords !== null && (
                <div className="flex items-center gap-2 text-sm text-[--text-muted] mt-1 pl-6">
                  ~{totalRecords} records found
                </div>
              )}
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[--accent] text-white font-medium hover:bg-[--accent-hover] disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download CSV
              </>
            )}
          </button>
        </div>

        {/* Recent Exports */}
        {recentExports.length > 0 && (
          <div className="bg-[--bg-card] rounded-xl border border-[--border] p-5">
            <h3 className="text-xs font-semibold text-[--text-secondary] mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Recent Exports
            </h3>
            <div className="space-y-2">
              {recentExports.map((exp, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-[--text-primary]">{exp.filename}</div>
                    <div className="text-xs text-[--text-muted]">
                      {new Date(exp.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[--text-muted] mt-3 leading-relaxed">
              Previously exported files are not stored on server — re-export if needed.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
