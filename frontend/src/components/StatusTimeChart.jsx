import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = [
  '#FF6384',
  '#36A2EB',
  '#FFCE56',
  '#4BC0C0',
  '#9966FF',
  '#FF9F40',
  '#7CB342',
  '#C9CBCF',
  '#AB47BC',
  '#26A69A',
]

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const { name, value } = payload[0]
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-medium text-gray-700">{name}</p>
        <p className="font-semibold" style={{ color: payload[0].payload.fill }}>
          {Math.round(value * 100) / 100} ч (суммарно)
        </p>
      </div>
    )
  }
  return null
}

function renderLegend({ payload }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
      {payload.map((entry, index) => (
        <li key={index} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

export default function StatusTimeChart({ data }) {
  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
        Нет данных для отображения
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={110}
          paddingAngle={2}
          dataKey="value"
          stroke="#fff"
          strokeWidth={2}
        >
          {chartData.map((_, index) => (
            <Cell
              key={index}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={renderLegend} />
      </PieChart>
    </ResponsiveContainer>
  )
}
