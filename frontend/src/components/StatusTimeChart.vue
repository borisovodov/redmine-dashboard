<template>
  <div>
    <Pie :data="chartData" :options="chartOptions" />
  </div>
</template>

<script>
import { Pie } from 'vue-chartjs'
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

export default {
  name: 'StatusTimeChart',
  components: {
    Pie
  },
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  computed: {
    chartData() {
      const statuses = Object.keys(this.data)
      const values = Object.values(this.data)

      return {
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
    },
    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || ''
                const value = Math.round(context.parsed * 100) / 100
                return `${label}: ${value}h`
              }
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
