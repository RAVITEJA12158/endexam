import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useCurrency } from '../../hooks/useCurrency'

const CustomTooltip = ({ active, payload, label, format }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border px-3 py-2 text-sm" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
      <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="font-mono font-medium" style={{ color: 'var(--accent)' }}>{format(payload[0].value)}</p>
    </div>
  )
}

export default function MonthlyBarChart({ data = [] }) {
  const { format } = useCurrency()

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="monthName"
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          width={40}
        />
        <Tooltip content={<CustomTooltip format={format} />} cursor={{ fill: 'var(--accent-glow)' }} />
        <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}