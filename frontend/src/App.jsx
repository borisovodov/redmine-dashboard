import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { HeroUIProvider } from '@heroui/react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  )
}

function App() {
  const navigate = useNavigate()

  return (
    <HeroUIProvider navigate={navigate}>
      <AppRoutes />
    </HeroUIProvider>
  )
}

export default App
