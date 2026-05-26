import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const LABELS = [
  { key: '1-day', label: '1 день' },
  { key: '2-3-days', label: '2-3 дня' },
  { key: '4-7-days', label: '4-7 дней' },
  { key: '8-14-days', label: '8-14 дней' },
  { key: '15-30-days', label: '15-30 дней' },
  { key: '30+-days', label: '30+ дней' },
]

const BAR_COLOR = '#1976D2'

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-medium text-gray-700">{payload[0].payload.label}</p>
        <p className="text-blue-600 font-semibold">{payload[0].value} задач</p>
      </div>
    )
  }
  return null
}

export default function ClosureTimeDistributionChart({ data }) {
  const chartData = LABELS.map(({ key, label }) => ({
    label,
    count: data[key] || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={BAR_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
