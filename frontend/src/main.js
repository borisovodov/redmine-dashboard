import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ru } from 'vuetify/locale'

import App from './App.vue'
import LoginPage from './pages/LoginPage.vue'
import DashboardPage from './pages/DashboardPage.vue'

const vuetify = createVuetify({
  components,
  directives,
  locale: {
    locale: 'ru',
    messages: { ru },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#26A69A',
          accent: '#82B1FF',
          error: '#FF5252',
          warning: '#FFC107',
          info: '#2196F3',
          success: '#4CAF50',
        }
      }
    }
  }
})

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    component: LoginPage,
    name: 'login'
  },
  {
    path: '/dashboard',
    component: DashboardPage,
    name: 'dashboard',
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Auth guard
router.beforeEach((to, from, next) => {
  const sessionId = localStorage.getItem('sessionId')
  
  if (to.meta.requiresAuth && !sessionId) {
    next('/login')
  } else if (to.path === '/login' && sessionId) {
    next('/dashboard')
  } else {
    next()
  }
})

const app = createApp(App)
app.use(vuetify)
app.use(router)
app.mount('#app')
