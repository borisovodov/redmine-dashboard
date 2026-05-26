import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const COLORS = [
  '#FF6384',
  '#36A2EB',
  '#FFCE56',
  '#4BC0C0',
  '#9966FF',
  '#FF9F40',
  '#FF6384',
  '#C9CBCF'
]

export default function StatusTimeChart({ data }) {
  const statuses = Object.keys(data)
  const values = Object.values(data)

  const chartData = {
    labels: statuses,
    datasets: [
      {
        data: values,
        backgroundColor: COLORS.slice(0, statuses.length),
        borderColor: '#FFF',
        borderWidth: 2
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right'
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || ''
            const value = Math.round(context.parsed * 100) / 100
            return `${label}: ${value} ч (суммарно)`
          }
        }
      }
    }
  }

  return <Pie data={chartData} options={chartOptions} />
}
