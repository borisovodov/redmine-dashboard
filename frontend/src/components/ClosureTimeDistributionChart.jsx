import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area
} from 'recharts'

const LINE_COLOR = '#1976D2'
const AREA_COLOR = '#E3F2FD'

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-medium text-gray-700">{d.label}</p>
        <p className="text-blue-600 font-semibold">{d.count} задач</p>
      </div>
    )
  }
  return null
}

export default function ClosureTimeDistributionChart({ data }) {
  const entries = Object.entries(data || {})
    .map(([dayStr, count]) => ({ day: parseInt(dayStr, 10), count }))
    .sort((a, b) => a.day - b.day)

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
        Нет данных для отображения
      </div>
    )
  }

  // Fill gaps: ensure every day from 1 to maxDay has an entry (count=0 for missing)
  const maxDay = entries[entries.length - 1].day
  const filled = []
  const countMap = {}
  for (const e of entries) countMap[e.day] = e.count
  for (let d = 1; d <= maxDay; d++) {
    filled.push({ day: d, count: countMap[d] || 0, label: `${d} д` })
  }

  const total = filled.length
  const labelInterval = total > 20 ? 5 : total > 10 ? 2 : 0

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={filled} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.15} />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11 }}
          interval={labelInterval}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          fill="url(#areaGradient)"
          stroke="none"
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke={LINE_COLOR}
          strokeWidth={2}
          dot={total <= 30}
          activeDot={{ r: 5, fill: LINE_COLOR }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
