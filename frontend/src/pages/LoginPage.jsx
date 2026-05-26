import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardBody, Input, Button, Alert } from '@heroui/react'
import api from '@/services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [redmineUrl, setRedmineUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({ url: '', key: '', general: '' })

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId')
    if (sessionId) {
      navigate('/dashboard', { replace: true })
    }
    setRedmineUrl(localStorage.getItem('redmineUrl') || '')
    setApiKey(localStorage.getItem('apiKey') || '')
  }, [navigate])

  const clearErrors = () => setErrors({ url: '', key: '', general: '' })

  const handleLogin = async (e) => {
    e.preventDefault()
    clearErrors()

    const newErrors = {}
    if (!redmineUrl.trim()) newErrors.url = 'Укажите URL Redmine'
    if (!apiKey.trim()) newErrors.key = 'Укажите API-ключ'

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }))
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/validate', {
        redmine_url: redmineUrl.trim(),
        api_key: apiKey.trim()
      })

      localStorage.setItem('sessionId', response.data.session_id)
      localStorage.setItem('redmineUrl', redmineUrl.trim())
      localStorage.setItem('apiKey', apiKey.trim())

      navigate('/dashboard')
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        general: error.response?.data?.detail || 'Ошибка аутентификации. Проверьте учётные данные.'
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary-50 to-background p-4">
      <Card shadow="lg" radius="lg" className="w-full max-w-md">
        <CardHeader className="flex gap-3 bg-primary px-6 py-5">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            <div>
              <p className="text-xl font-bold text-white">Redmine Analytics</p>
              <p className="text-sm text-white/70">Вход в систему</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="gap-5 px-6 py-6">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <Input
              type="url"
              label="URL Redmine"
              placeholder="https://redmine.example.com"
              variant="bordered"
              color="primary"
              labelPlacement="outside"
              size="lg"
              value={redmineUrl}
              onValueChange={(val) => { setRedmineUrl(val); clearErrors() }}
              isInvalid={!!errors.url}
              errorMessage={errors.url}
              classNames={{ inputWrapper: 'h-12' }}
              startContent={
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-default-400">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              }
            />

            <Input
              type="password"
              label="API-ключ"
              placeholder="Введите API-ключ Redmine"
              variant="bordered"
              color="primary"
              labelPlacement="outside"
              size="lg"
              value={apiKey}
              onValueChange={(val) => { setApiKey(val); clearErrors() }}
              isInvalid={!!errors.key}
              errorMessage={errors.key}
              classNames={{ inputWrapper: 'h-12' }}
              startContent={
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-default-400">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              }
            />

            {errors.general && (
              <Alert
                color="danger"
                variant="flat"
                title={errors.general}
              />
            )}

            <Button
              type="submit"
              color="primary"
              variant="solid"
              radius="md"
              size="lg"
              isLoading={loading}
              className="w-full h-12 font-semibold text-base mt-1"
            >
              Подключиться
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

