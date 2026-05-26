<template>
  <div>
    <!-- Main Metrics -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="4">
        <v-card class="elevation-2">
          <v-card-text>
            <div class="text-center">
              <v-icon size="40" color="primary" class="mb-2">mdi-speedometer</v-icon>
              <div class="text-h6">Среднее время закрытия</div>
              <div class="text-h4 font-weight-bold text-primary">
                {{ formatTime(metrics.average_close_time_hours) }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="elevation-2">
          <v-card-text>
            <div class="text-center">
              <v-icon size="40" color="secondary" class="mb-2">mdi-chart-line</v-icon>
              <div class="text-h6">Медианное время закрытия</div>
              <div class="text-h4 font-weight-bold text-secondary">
                {{ formatTime(metrics.median_close_time_hours) }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="elevation-2">
          <v-card-text>
            <div class="text-center">
              <v-icon size="40" color="success" class="mb-2">mdi-counter</v-icon>
              <div class="text-h6">Всего задач</div>
              <div class="text-h4 font-weight-bold text-success">
                {{ metrics.total_issues }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Assignee Breakdown (if enabled) -->
    <v-card v-if="groupByAssignee && metrics.by_assignee" class="mt-4">
      <v-card-title>Метрики по исполнителям</v-card-title>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th>Исполнитель</th>
              <th>Всего задач</th>
              <th>Среднее время</th>
              <th>Медианное время</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(data, name) in metrics.by_assignee" :key="name">
              <td>{{ name }}</td>
              <td>{{ data.total_issues }}</td>
              <td>{{ formatTime(data.average_close_time_hours) }}</td>
              <td>{{ formatTime(data.median_close_time_hours) }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
export default {
  name: 'MetricsDisplay',
  props: {
    metrics: {
      type: Object,
      required: true
    },
    groupByAssignee: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    formatTime(hours) {
      if (!hours) return '0h'
      if (hours < 24) {
        return `${Math.round(hours)}h`
      }
      const days = Math.round(hours / 24)
      return `${days}d`
    }
  }
}
</script>

<style scoped>
</style>
