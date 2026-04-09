import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { CHART_COLORS } from '../../utils/constants'
import { useCurrency } from '../../hooks/useCurrency'

const CustomTooltip = ({ active, payload, format }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-lg border px-3 py-2 text-sm" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
      <p className="font-mono" style={{ color: d.payload.fill }}>{format(d.value)}</p>
    </div>
  )
}

export default function ExpensePieChart({ data = [] }) {
  const { format } = useCurrency()

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-muted)' }}>
        <p className="text-sm">No data for this month</p>
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.total, 0)
  const chartData = data.map((d, i) => ({
    name: d.categoryName,
    value: d.total,
    fill: CHART_COLORS[i % CHART_COLORS.length],
    pct: total ? ((d.total / total) * 100).toFixed(1) : 0,
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip format={format} />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 space-y-1.5">
        {chartData.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
              <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{format(d.value)}</span>
              <span className="w-10 text-right" style={{ color: 'var(--text-muted)' }}>{d.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}