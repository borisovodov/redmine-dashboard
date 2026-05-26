<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-app-bar-title>Redmine Analytics Dashboard</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="handleLogout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-container fluid class="pa-4">
      <!-- Loading State -->
      <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>

      <!-- Error State -->
      <v-alert v-if="error" type="error" class="mb-4">
        {{ error }}
      </v-alert>

      <!-- Filters -->
      <v-card class="mb-4">
        <v-card-title>Filters</v-card-title>
        <v-card-text>
          <v-row>
            <!-- Project Selector -->
            <v-col cols="12" sm="6" md="3">
              <v-select
                v-model="selectedProject"
                :items="projects"
                item-title="name"
                item-value="id"
                label="Project"
                @update:modelValue="onProjectChange"
                :loading="loadingProjects"
              />
            </v-col>

            <!-- Date Range -->
            <v-col cols="12" sm="6" md="3">
              <v-text-field
                v-model="dateFrom"
                label="From Date"
                type="date"
                @update:modelValue="onFilterChange"
              />
            </v-col>

            <v-col cols="12" sm="6" md="3">
              <v-text-field
                v-model="dateTo"
                label="To Date"
                type="date"
                @update:modelValue="onFilterChange"
              />
            </v-col>

            <!-- Apply Button -->
            <v-col cols="12" sm="6" md="3" class="d-flex align-center">
              <v-btn
                color="primary"
                @click="applyFilters"
                :loading="loading"
                block
              >
                Apply Filters
              </v-btn>
            </v-col>
          </v-row>

          <!-- Additional Filters -->
          <v-row class="mt-2">
            <!-- Priority Filter -->
            <v-col cols="12" sm="6" md="3">
              <v-autocomplete
                v-model="selectedPriorities"
                :items="availablePriorities"
                item-title="name"
                item-value="id"
                label="Priorities"
                multiple
                chips
                @update:modelValue="onFilterChange"
              />
            </v-col>

            <!-- Assignee Filter -->
            <v-col cols="12" sm="6" md="3">
              <v-autocomplete
                v-model="selectedAssignees"
                :items="availableAssignees"
                item-title="name"
                item-value="id"
                label="Assignees"
                multiple
                chips
                @update:modelValue="onFilterChange"
              />
            </v-col>

            <!-- Issue Type Filter -->
            <v-col cols="12" sm="6" md="3">
              <v-autocomplete
                v-model="selectedIssueTypes"
                :items="availableIssueTypes"
                item-title="name"
                item-value="id"
                label="Issue Types"
                multiple
                chips
                @update:modelValue="onFilterChange"
              />
            </v-col>

            <!-- Group by Assignee -->
            <v-col cols="12" sm="6" md="3">
              <v-checkbox
                v-model="groupByAssignee"
                label="Group by Assignee"
                @update:modelValue="onFilterChange"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Metrics Display -->
      <MetricsDisplay
        v-if="metrics && !loading"
        :metrics="metrics"
        :groupByAssignee="groupByAssignee"
      />

      <!-- Charts -->
      <v-row v-if="metrics && !loading" class="mt-4">
        <!-- Distribution Chart -->
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Close Time Distribution</v-card-title>
            <v-card-text>
              <ClosureTimeDistributionChart :data="metrics.distribution_data" />
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Status Time Chart -->
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Time in Status (hours)</v-card-title>
            <v-card-text>
              <StatusTimeChart :data="metrics.status_time_data" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- No Data State -->
      <v-alert v-if="!loading && !metrics && selectedProject" type="info">
        Select filters and click "Apply Filters" to see analytics
      </v-alert>
    </v-container>
  </v-app>
</template>

<script>
import api from '@/services/api'
import MetricsDisplay from '@/components/MetricsDisplay.vue'
import ClosureTimeDistributionChart from '@/components/ClosureTimeDistributionChart.vue'
import StatusTimeChart from '@/components/StatusTimeChart.vue'

export default {
  name: 'DashboardPage',
  components: {
    MetricsDisplay,
    ClosureTimeDistributionChart,
    StatusTimeChart
  },
  data() {
    return {
      projects: [],
      selectedProject: null,
      dateFrom: '',
      dateTo: '',
      selectedPriorities: [],
      selectedAssignees: [],
      selectedIssueTypes: [],
      groupByAssignee: false,
      availablePriorities: [],
      availableAssignees: [],
      availableIssueTypes: [],
      metrics: null,
      loading: false,
      loadingProjects: false,
      error: null,
      filterTimeout: null
    }
  },
  mounted() {
    this.loadProjects()
  },
  methods: {
    async loadProjects() {
      this.loadingProjects = true
      try {
        const response = await api.get('/projects')
        this.projects = response.data.projects
      } catch (error) {
        this.error = 'Failed to load projects'
      } finally {
        this.loadingProjects = false
      }
    },
    async onProjectChange() {
      this.metrics = null
      this.availablePriorities = []
      this.availableAssignees = []
      this.availableIssueTypes = []
      this.selectedPriorities = []
      this.selectedAssignees = []
      this.selectedIssueTypes = []

      if (!this.selectedProject) return

      // Load available filters
      try {
        const [prioritiesRes, typesRes, assigneesRes] = await Promise.all([
          api.get('/analytics/filters/priorities'),
          api.get('/analytics/filters/issue_types'),
          api.get('/analytics/filters/assignees', {
            params: { project_id: this.selectedProject }
          })
        ])

        this.availablePriorities = prioritiesRes.data.priorities
        this.availableIssueTypes = typesRes.data.issue_types
        this.availableAssignees = assigneesRes.data.assignees
      } catch (error) {
        this.error = 'Failed to load filters'
      }
    },
    onFilterChange() {
      // Debounce filter changes
      clearTimeout(this.filterTimeout)
      this.filterTimeout = setTimeout(() => {
        this.applyFilters()
      }, 500)
    },
    async applyFilters() {
      if (!this.selectedProject) {
        this.error = 'Please select a project'
        return
      }

      this.loading = true
      this.error = null

      try {
        if (this.groupByAssignee) {
          const response = await api.get('/analytics/by_assignee', {
            params: {
              project_id: this.selectedProject,
              date_from: this.dateFrom || undefined,
              date_to: this.dateTo || undefined
            }
          })
          // Format for display
          this.metrics = {
            distribution_data: {},
            status_time_data: {},
            by_assignee: response.data.by_assignee,
            total_issues: Object.values(response.data.by_assignee).reduce(
              (sum, a) => sum + (a.total_issues || 0),
              0
            ),
            average_close_time_hours: Object.values(response.data.by_assignee).reduce(
              (sum, a) => sum + (a.average_close_time_hours || 0),
              0
            ) / Object.keys(response.data.by_assignee).length
          }
        } else {
          const params = new URLSearchParams({
            project_id: this.selectedProject,
            date_from: this.dateFrom || '',
            date_to: this.dateTo || '',
            priorities: this.selectedPriorities.join(',') || '',
            assignees: this.selectedAssignees.join(',') || '',
            issue_types: this.selectedIssueTypes.join(',') || ''
          })

          const response = await api.post(`/analytics?${params.toString()}`)
          this.metrics = response.data
        }
      } catch (error) {
        this.error = error.response?.data?.detail || 'Failed to load analytics'
      } finally {
        this.loading = false
      }
    },
    handleLogout() {
      localStorage.removeItem('sessionId')
      localStorage.removeItem('redmineUrl')
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
</style>
