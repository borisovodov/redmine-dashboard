<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark>
            <v-toolbar-title>Redmine Analytics Login</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="handleLogin">
              <div class="py-2">
                <v-text-field
                  v-model="redmineUrl"
                  label="Redmine URL"
                  type="text"
                  placeholder="https://redmine.example.com"
                  prepend-icon="mdi-link"
                  :error-messages="errors.url"
                  @input="clearErrors"
                />
              </div>
              <div class="py-2">
                <v-text-field
                  v-model="apiKey"
                  label="API Key"
                  type="password"
                  prepend-icon="mdi-key"
                  :error-messages="errors.key"
                  @input="clearErrors"
                />
              </div>

              <v-alert
                v-if="errors.general"
                type="error"
                class="my-4"
              >
                {{ errors.general }}
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                block
                :loading="loading"
                class="mt-4"
              >
                Connect
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import api from '@/services/api'
import { useRouter } from 'vue-router'

export default {
  name: 'LoginPage',
  setup() {
    const router = useRouter()

    return {
      router
    }
  },
  data() {
    return {
      redmineUrl: '',
      apiKey: '',
      loading: false,
      errors: {
        url: [],
        key: [],
        general: ''
      }
    }
  },
  methods: {
    clearErrors() {
      this.errors = {
        url: [],
        key: [],
        general: ''
      }
    },
    async handleLogin() {
      this.clearErrors()

      // Validation
      if (!this.redmineUrl) {
        this.errors.url.push('Redmine URL is required')
      }
      if (!this.apiKey) {
        this.errors.key.push('API Key is required')
      }

      if (this.errors.url.length > 0 || this.errors.key.length > 0) {
        return
      }

      this.loading = true

      try {
        const response = await api.post('/auth/validate', {
          redmine_url: this.redmineUrl,
          api_key: this.apiKey
        })

        // Save session
        localStorage.setItem('sessionId', response.data.session_id)
        localStorage.setItem('redmineUrl', this.redmineUrl)

        // Redirect to dashboard
        this.$router.push('/dashboard')
      } catch (error) {
        this.errors.general = error.response?.data?.detail || 'Authentication failed. Check your credentials.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
</style>
