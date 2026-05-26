import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Navbar, NavbarBrand, NavbarContent, NavbarItem,
  Button, Card, CardHeader, CardBody, Select, SelectItem,
  DatePicker, Alert, Chip, Input
} from '@heroui/react'
import { parseDate, getLocalTimeZone, today } from '@internationalized/date'
import api from '@/services/api'
import MetricsDisplay from '@/components/MetricsDisplay'
import ClosureTimeDistributionChart from '@/components/ClosureTimeDistributionChart'
import StatusTimeChart from '@/components/StatusTimeChart'
import IssuesTable from '@/components/IssuesTable'

export default function DashboardPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('sessionId')) {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  const [selectedPriorities, setSelectedPriorities] = useState(new Set([]))
  const [selectedAssignees, setSelectedAssignees] = useState(new Set([]))
  const [selectedIssueTypes, setSelectedIssueTypes] = useState(new Set([]))
  const [selectedCategories, setSelectedCategories] = useState(new Set([]))
  const [availablePriorities, setAvailablePriorities] = useState([])
  const [availableAssignees, setAvailableAssignees] = useState([])
  const [availableIssueTypes, setAvailableIssueTypes] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [availableStatuses, setAvailableStatuses] = useState([])
  // Default closed status names — mapped to IDs after statuses load
  const DEFAULT_CLOSED_NAMES = ['Closed', 'Done', 'Rejected', 'Resolved']
  const [selectedClosedStatuses, setSelectedClosedStatuses] = useState(new Set([]))
  const [selectedTrackedStatuses, setSelectedTrackedStatuses] = useState(new Set([]))
  const [subjectFilter, setSubjectFilter] = useState('')
  const [metrics, setMetrics] = useState(null)
  const [issues, setIssues] = useState([])
  const [selectedIssueIds, setSelectedIssueIds] = useState(new Set([]))
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [error, setError] = useState(null)
  const filterTimeoutRef = useRef(null)

  useEffect(() => { loadProjects() }, [])

  const loadProjects = async () => {
    setLoadingProjects(true)
    try {
      const response = await api.get('/projects')
      setProjects(response.data.projects)
    } catch {
      setError('Не удалось загрузить проекты')
    } finally {
      setLoadingProjects(false)
    }
  }

  const onProjectChange = async (keys) => {
    const projectId = Array.from(keys)[0]
    setSelectedProject(projectId)
    setMetrics(null)
    setIssues([])
    setAvailablePriorities([])
    setAvailableAssignees([])
    setAvailableIssueTypes([])
    setAvailableCategories([])
    setSelectedPriorities(new Set([]))
    setSelectedAssignees(new Set([]))
    setSelectedIssueTypes(new Set([]))
    setSelectedCategories(new Set([]))
    setSelectedClosedStatuses(new Set([]))
    setSelectedTrackedStatuses(new Set([]))

    if (!projectId) return

    try {
      const [prioritiesRes, typesRes, assigneesRes, categoriesRes, statusesRes] = await Promise.all([
        api.get('/analytics/filters/priorities'),
        api.get('/analytics/filters/issue_types'),
        api.get('/analytics/filters/assignees', { params: { project_id: projectId } }),
        api.get('/analytics/filters/categories', { params: { project_id: projectId } }),
        api.get('/analytics/filters/statuses')
      ])
      setAvailablePriorities(prioritiesRes.data.priorities || [])
      setAvailableIssueTypes(typesRes.data.issue_types || [])
      setAvailableAssignees(assigneesRes.data.assignees || [])
      setAvailableCategories(categoriesRes.data.categories || [])
      
      const statuses = statusesRes.data.statuses || []
      setAvailableStatuses(statuses)
      // Pre-select default closed statuses by matching names
      const defaultIds = new Set(
        statuses
          .filter(s => DEFAULT_CLOSED_NAMES.includes(s.name))
          .map(s => String(s.id))
      )
      setSelectedClosedStatuses(defaultIds)
      // Tracked statuses default: all EXCEPT default closed names
      const trackedIds = new Set(
        statuses
          .filter(s => !DEFAULT_CLOSED_NAMES.includes(s.name))
          .map(s => String(s.id))
      )
      setSelectedTrackedStatuses(trackedIds)
    } catch {
      setError('Не удалось загрузить фильтры')
    }
  }

  // Keep a ref to the latest applyFilters to avoid stale closure
  const applyFiltersRef = useRef()
  
  const onFilterChange = useCallback(() => {
    clearTimeout(filterTimeoutRef.current)
    filterTimeoutRef.current = setTimeout(() => applyFiltersRef.current(), 500)
  }, [])

  // Convert CalendarDate to YYYY-MM-DD string
  const toDateString = (calDate) => {
    if (!calDate) return ''
    return calDate.toString()
  }

  // Convert status IDs to names for API
  const closedStatusNames = () => {
    const idToName = {}
    availableStatuses.forEach(s => { idToName[String(s.id)] = s.name })
    return Array.from(selectedClosedStatuses).map(id => idToName[id] || id)
  }

  const trackedStatusNames = () => {
    const idToName = {}
    availableStatuses.forEach(s => { idToName[String(s.id)] = s.name })
    return Array.from(selectedTrackedStatuses).map(id => idToName[id] || id)
  }

  const applyFilters = async () => {
    if (!selectedProject) {
      setError('Выберите проект')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        project_id: selectedProject,
        date_from: toDateString(dateFrom) || '',
        date_to: toDateString(dateTo) || '',
        priorities: Array.from(selectedPriorities).join(',') || '',
        assignees: Array.from(selectedAssignees).join(',') || '',
        issue_types: Array.from(selectedIssueTypes).join(',') || '',
        categories: Array.from(selectedCategories).join(',') || '',
        closed_statuses: closedStatusNames().join(',') || '',
        tracked_statuses: trackedStatusNames().join(',') || '',
        subject: subjectFilter.trim() || ''
      })
      const response = await api.post(`/analytics?${params.toString()}`)
      setMetrics(response.data)
      setIssues(response.data.issues || [])
      setSelectedIssueIds(new Set([]))
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось загрузить аналитику')
    } finally {
      setLoading(false)
    }
  }

  // Always keep ref pointing to latest applyFilters
  applyFiltersRef.current = applyFilters

  const handleLogout = () => {
    localStorage.removeItem('sessionId')
    navigate('/login')
  }

  const toSelectItems = (items) =>
    (items || []).map((item) => ({ key: String(item.id), label: item.name }))

  // Derive tracked status names from selected IDs + available statuses
  const trackedStatusNamesMemo = useMemo(() => {
    const idToName = {}
    availableStatuses.forEach(s => { idToName[String(s.id)] = s.name })
    return Array.from(selectedTrackedStatuses).map(id => idToName[id]).filter(Boolean)
  }, [selectedTrackedStatuses, availableStatuses])

  // Flatten status_times into top-level _st_ keys for table sorting
  const issuesForTable = useMemo(() => {
    return issues.map(issue => {
      const flat = { ...issue }
      if (issue.status_times) {
        for (const [status, days] of Object.entries(issue.status_times)) {
          flat[`_st_${status}`] = days
        }
      }
      return flat
    })
  }, [issues])

  // Compute status time chart data: if issues are selected, show only their aggregate
  // HeroUI Table returns "all" string when «select all» is clicked — normalize to a Set
  const normalizedSelection = useMemo(() => {
    if (selectedIssueIds === 'all') {
      return new Set(issues.map(i => String(i.id)))
    }
    if (selectedIssueIds instanceof Set) {
      return selectedIssueIds
    }
    return new Set([])
  }, [selectedIssueIds, issues])

  const statusTimeChartData = useMemo(() => {
    if (!metrics?.status_time_data) return {}
    if (normalizedSelection.size === 0) {
      return metrics.status_time_data
    }
    // Sum status_times for selected issues only
    const filtered = {}
    for (const issue of issues) {
      if (normalizedSelection.has(String(issue.id)) && issue.status_times) {
        for (const [status, hours] of Object.entries(issue.status_times)) {
          filtered[status] = (filtered[status] || 0) + hours
        }
      }
    }
    // Round
    for (const k of Object.keys(filtered)) {
      filtered[k] = Math.round(filtered[k] * 100) / 100
    }
    return filtered
  }, [metrics, issues, normalizedSelection])

  // Compute filtered metrics for selected issues (all stats except status_time_data)
  const filteredMetrics = useMemo(() => {
    if (!metrics) return null
    if (normalizedSelection.size === 0) return metrics

    const selectedIssues = issues.filter(i => normalizedSelection.has(String(i.id)))
    const closeTimes = selectedIssues
      .map(i => i.close_time_hours)
      .filter(h => h !== null && h !== undefined)

    if (closeTimes.length === 0) {
      return { ...metrics, total_issues: 0, average_close_time_hours: 0, median_close_time_hours: 0, distribution_data: {} }
    }

    // Average and median
    const sum = closeTimes.reduce((a, b) => a + b, 0)
    const avg = sum / closeTimes.length
    const sorted = [...closeTimes].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]

    // Per-day distribution (same logic as backend)
    const dist = {}
    for (const h of closeTimes) {
      const day = Math.max(1, Math.ceil(h / 24))
      const key = String(day)
      dist[key] = (dist[key] || 0) + 1
    }

    return {
      ...metrics,
      total_issues: closeTimes.length,
      average_close_time_hours: Math.round(avg * 100) / 100,
      median_close_time_hours: Math.round(median * 100) / 100,
      distribution_data: dist,
    }
  }, [metrics, issues, normalizedSelection])

  const displayMetrics = filteredMetrics || metrics

  // Shared selected-issues helper for per-status computations
  const selectedForStatus = useMemo(() => {
    if (normalizedSelection.size === 0) return issues
    return issues.filter(i => normalizedSelection.has(String(i.id)))
  }, [issues, normalizedSelection])

  // Per-status metrics: avg, median, total days for each tracked status
  const perStatusMetrics = useMemo(() => {
    const result = {}
    for (const statusName of trackedStatusNamesMemo) {
      const times = selectedForStatus
        .map(i => i.status_times?.[statusName])
        .filter(d => d !== undefined && d !== null && d > 0)

      if (times.length === 0) {
        result[statusName] = { avg: 0, median: 0, total: 0, count: 0 }
        continue
      }

      const sum = times.reduce((a, b) => a + b, 0)
      const avg = sum / times.length
      const sorted = [...times].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]

      result[statusName] = {
        avg: Math.round(avg * 100) / 100,
        median: Math.round(median * 100) / 100,
        total: Math.round(sum * 100) / 100,
        count: times.length
      }
    }
    return result
  }, [selectedForStatus, trackedStatusNamesMemo])

  // Per-status distribution: {day: count} for each tracked status
  const perStatusDistribution = useMemo(() => {
    const result = {}
    for (const statusName of trackedStatusNamesMemo) {
      const dist = {}
      for (const issue of selectedForStatus) {
        const days = issue.status_times?.[statusName]
        if (days !== undefined && days !== null && days > 0) {
          const day = Math.max(1, Math.ceil(days))
          const key = String(day)
          dist[key] = (dist[key] || 0) + 1
        }
      }
      result[statusName] = dist
    }
    return result
  }, [selectedForStatus, trackedStatusNamesMemo])

  // Helper to format days for per-status metric cards
  const formatStatusMetricDays = (days) => {
    if (!days || days === 0) return '0ч'
    if (days < 1) return `${Math.round(days * 24)}ч`
    return `${Math.round(days)}д`
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar maxWidth="full" isBordered classNames={{ wrapper: 'px-4' }}>
        <NavbarBrand>
          <p className="font-bold text-inherit text-lg">Redmine Analytics</p>
        </NavbarBrand>
        <NavbarContent justify="end">
          <NavbarItem>
            <Button
              isIconOnly
              variant="light"
              color="danger"
              onPress={handleLogout}
              aria-label="Выйти"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {error && (
          <Alert color="danger" variant="flat" title={error} className="mb-4" />
        )}

        <Card shadow="sm" radius="lg" className="mb-6">
          <CardHeader className="pb-0 pt-4 px-5">
            <h2 className="text-xl font-semibold">Фильтры</h2>
          </CardHeader>
          <CardBody className="gap-5 px-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Проект"
                placeholder="Выберите проект"
                variant="bordered"
                color="primary"
                labelPlacement="outside"
                items={toSelectItems(projects)}
                selectedKeys={selectedProject ? new Set([selectedProject]) : new Set([])}
                onSelectionChange={onProjectChange}
                isLoading={loadingProjects}
                classNames={{ trigger: 'h-12' }}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>

              <DatePicker
                label="Дата закрытия с"
                variant="bordered"
                color="primary"
                labelPlacement="outside"
                value={dateFrom}
                onChange={(val) => { setDateFrom(val); onFilterChange() }}
                showMonthAndYearPickers
                classNames={{ inputWrapper: 'h-12' }}
              />

              <DatePicker
                label="Дата закрытия по"
                variant="bordered"
                color="primary"
                labelPlacement="outside"
                value={dateTo}
                onChange={(val) => { setDateTo(val); onFilterChange() }}
                showMonthAndYearPickers
                classNames={{ inputWrapper: 'h-12' }}
              />

              <Input
                label="Поиск по названию"
                placeholder="Часть названия..."
                variant="bordered"
                color="primary"
                labelPlacement="outside"
                value={subjectFilter}
                onValueChange={(val) => { setSubjectFilter(val); onFilterChange() }}
                classNames={{ inputWrapper: 'h-12' }}
              />

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-1">
              <Select
                label="Приоритеты"
                placeholder="Все"
                variant="bordered"
                color="primary"
                labelPlacement="outside"
                selectionMode="multiple"
                items={toSelectItems(availablePriorities)}
                selectedKeys={selectedPriorities}
                onSelectionChange={(keys) => { setSelectedPriorities(keys); onFilterChange() }}
                classNames={{ trigger: 'min-h-12' }}
                renderValue={(items) => (
                  <div className="flex flex-wrap gap-1">
                    {items.map((item) => (
                      <Chip key={item.key} size="sm" variant="flat" color="primary">{item.data?.label || item.key}</Chip>
                    ))}
                  </div>
                )}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>

              <Select
                label="Исполнители"
                placeholder="Все"
                variant="bordered"
                color="primary"
                labelPlacement="outside"
                selectionMode="multiple"
                items={toSelectItems(availableAssignees)}
                selectedKeys={selectedAssignees}
                onSelectionChange={(keys) => { setSelectedAssignees(keys); onFilterChange() }}
                classNames={{ trigger: 'min-h-12' }}
                renderValue={(items) => (
                  <div className="flex flex-wrap gap-1">
                    {items.map((item) => (
                      <Chip key={item.key} size="sm" variant="flat" color="primary">{item.data?.label || item.key}</Chip>
                    ))}
                  </div>
                )}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>

              <Select
                label="Типы задач"
                placeholder="Все"
                variant="bordered"
                color="primary"
                labelPlacement="outside"
                selectionMode="multiple"
                items={toSelectItems(availableIssueTypes)}
                selectedKeys={selectedIssueTypes}
                onSelectionChange={(keys) => { setSelectedIssueTypes(keys); onFilterChange() }}
                classNames={{ trigger: 'min-h-12' }}
                renderValue={(items) => (
                  <div className="flex flex-wrap gap-1">
                    {items.map((item) => (
                      <Chip key={item.key} size="sm" variant="flat" color="primary">{item.data?.label || item.key}</Chip>
                    ))}
                  </div>
                )}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>

              <Select
                label="Категории"
                placeholder="Все"
                variant="bordered"
                color="primary"
                labelPlacement="outside"
                selectionMode="multiple"
                items={toSelectItems(availableCategories)}
                selectedKeys={selectedCategories}
                onSelectionChange={(keys) => { setSelectedCategories(keys); onFilterChange() }}
                classNames={{ trigger: 'min-h-12' }}
                renderValue={(items) => (
                  <div className="flex flex-wrap gap-1">
                    {items.map((item) => (
                      <Chip key={item.key} size="sm" variant="flat" color="primary">{item.data?.label || item.key}</Chip>
                    ))}
                  </div>
                )}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>

              <Select
                label="Закрытые статусы"
                placeholder="Выберите статусы"
                variant="bordered"
                color="success"
                labelPlacement="outside"
                selectionMode="multiple"
                items={toSelectItems(availableStatuses)}
                selectedKeys={selectedClosedStatuses}
                onSelectionChange={(keys) => { setSelectedClosedStatuses(keys); onFilterChange() }}
                classNames={{ trigger: 'min-h-12 h-auto py-2' }}
                renderValue={(items) => (
                  <div className="flex flex-wrap gap-1">
                    {items.map((item) => (
                      <Chip key={item.key} size="sm" variant="flat" color="success">{item.data?.label || item.key}</Chip>
                    ))}
                  </div>
                )}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>

              <Select
                label="Отслеживаемые статусы"
                placeholder="Выберите статусы"
                variant="bordered"
                color="warning"
                labelPlacement="outside"
                selectionMode="multiple"
                items={toSelectItems(availableStatuses)}
                selectedKeys={selectedTrackedStatuses}
                onSelectionChange={(keys) => { setSelectedTrackedStatuses(keys); onFilterChange() }}
                classNames={{ trigger: 'min-h-12 h-auto py-2' }}
                renderValue={(items) => (
                  <div className="flex flex-wrap gap-1">
                    {items.map((item) => (
                      <Chip key={item.key} size="sm" variant="flat" color="warning">{item.data?.label || item.key}</Chip>
                    ))}
                  </div>
                )}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>

            </div>

            <div className="mt-4">
              <Button
                color="primary"
                variant="solid"
                radius="md"
                size="lg"
                onPress={applyFilters}
                isLoading={loading}
                className="w-full h-12 font-semibold"
              >
                Применить фильтры
              </Button>
            </div>
          </CardBody>
        </Card>

        {issues.length > 0 && !loading && (
          <IssuesTable
            issues={issuesForTable}
            selectedKeys={selectedIssueIds}
            onSelectionChange={setSelectedIssueIds}
            trackedStatusNames={trackedStatusNamesMemo}
          />
        )}

        {metrics && !loading && (
          <MetricsDisplay metrics={displayMetrics} />
        )}

        {metrics && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card shadow="sm" radius="lg">
              <CardHeader className="pb-0 pt-4 px-5">
                <h3 className="text-lg font-semibold">Распределение времени закрытия</h3>
              </CardHeader>
              <CardBody className="px-5 pb-5">
                <ClosureTimeDistributionChart data={displayMetrics.distribution_data} />
              </CardBody>
            </Card>

            <Card shadow="sm" radius="lg">
              <CardHeader className="pb-0 pt-4 px-5">
                <h3 className="text-lg font-semibold">
                  Время в статусах — суммарно
                  {normalizedSelection.size > 0
                    ? ` по ${normalizedSelection.size} выбранным задачам`
                    : ' по всем задачам'}
                  {' '}(дни)
                </h3>
              </CardHeader>
              <CardBody className="px-5 pb-5">
                <p className="text-xs text-gray-500 mb-2">
                  {normalizedSelection.size > 0
                    ? `Данные только для ${normalizedSelection.size} выделенных задач`
                    : 'Исторический срез по закрытым задачам: сколько дней каждая задача провела в статусах до закрытия'}
                </p>
                <StatusTimeChart data={statusTimeChartData} />
              </CardBody>
            </Card>
          </div>
        )}

        {/* Per-status analytics blocks */}
        {metrics && !loading && trackedStatusNamesMemo.length > 0 && (
          <div className="mt-6 space-y-6">
            {trackedStatusNamesMemo.map((statusName) => {
              const m = perStatusMetrics[statusName]
              const dist = perStatusDistribution[statusName]
              const hasData = m && m.count > 0

              return (
                <Card key={statusName} shadow="sm" radius="lg">
                  <CardHeader className="pb-0 pt-4 px-5">
                    <h3 className="text-lg font-semibold">
                      Статус «{statusName}»
                      {normalizedSelection.size > 0
                        ? ` — по ${normalizedSelection.size} выбранным задачам`
                        : ' — по всем задачам'}
                    </h3>
                  </CardHeader>
                  <CardBody className="px-5 pb-5">
                    {/* Metric cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-default-500">Среднее время</p>
                        <p className="text-xl font-bold text-blue-600">
                          {hasData ? formatStatusMetricDays(m.avg) : '—'}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-default-500">Медианное время</p>
                        <p className="text-xl font-bold text-purple-600">
                          {hasData ? formatStatusMetricDays(m.median) : '—'}
                        </p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-default-500">Суммарно дней</p>
                        <p className="text-xl font-bold text-amber-600">
                          {hasData ? formatStatusMetricDays(m.total) : '—'}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-default-500">Задач в статусе</p>
                        <p className="text-xl font-bold text-green-600">
                          {hasData ? m.count : '0'}
                        </p>
                      </div>
                    </div>

                    {/* Distribution chart */}
                    {hasData && Object.keys(dist).length > 0 ? (
                      <>
                        <p className="text-xs text-gray-500 mb-2">
                          Распределение количества задач по времени нахождения в статусе «{statusName}»
                        </p>
                        <ClosureTimeDistributionChart data={dist} />
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                        Нет данных для отображения
                      </div>
                    )}
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}

        {!loading && !metrics && selectedProject && (
          <Alert
            color="primary"
            variant="flat"
            title="Выберите фильтры и нажмите «Применить фильтры», чтобы увидеть аналитику"
          />
        )}
      </div>
    </div>
  )
}
