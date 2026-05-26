<template>
  <div>
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default {
  name: 'ClosureTimeDistributionChart',
  components: {
    Bar
  },
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  computed: {
    chartData() {
      return {
        labels: ['1 день', '2-3 дня', '4-7 дней', '8-14 дней', '15-30 дней', '30+ дней'],
        datasets: [
          {
            label: 'Количество задач',
            data: [
              this.data['1-day'] || 0,
              this.data['2-3-days'] || 0,
              this.data['4-7-days'] || 0,
              this.data['8-14-days'] || 0,
              this.data['15-30-days'] || 0,
              this.data['30+-days'] || 0
            ],
            backgroundColor: '#1976D2',
            borderColor: '#1565C0',
            borderWidth: 1
          }
        ]
      }
    },
    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          title: {
            display: false
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
    }
  }
}
</script>

<style scoped>
</style>
