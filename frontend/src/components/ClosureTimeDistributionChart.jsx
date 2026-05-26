import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function ClosureTimeDistributionChart({ data }) {
  const chartData = {
    labels: ['1 день', '2-3 дня', '4-7 дней', '8-14 дней', '15-30 дней', '30+ дней'],
    datasets: [
      {
        label: 'Количество задач',
        data: [
          data['1-day'] || 0,
          data['2-3-days'] || 0,
          data['4-7-days'] || 0,
          data['8-14-days'] || 0,
          data['15-30-days'] || 0,
          data['30+-days'] || 0
        ],
        backgroundColor: '#1976D2',
        borderColor: '#1565C0',
        borderWidth: 1
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  }

  return <Bar data={chartData} options={chartOptions} />
}
