import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Navbar, NavbarBrand, NavbarContent, NavbarItem,
  Button, Card, CardHeader, CardBody, Select, SelectItem,
  DatePicker, Checkbox, Alert, Chip
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
  const [groupByAssignee, setGroupByAssignee] = useState(false)
  const [availablePriorities, setAvailablePriorities] = useState([])
  const [availableAssignees, setAvailableAssignees] = useState([])
  const [availableIssueTypes, setAvailableIssueTypes] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [availableStatuses, setAvailableStatuses] = useState([])
  // Default closed status names — mapped to IDs after statuses load
  const DEFAULT_CLOSED_NAMES = ['Closed', 'Done', 'Rejected', 'Resolved']
  const [selectedClosedStatuses, setSelectedClosedStatuses] = useState(new Set([]))
  const [metrics, setMetrics] = useState(null)
  const [issues, setIssues] = useState([])
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

  const applyFilters = async () => {
    if (!selectedProject) {
      setError('Выберите проект')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (groupByAssignee) {
        const response = await api.get('/analytics/by_assignee', {
          params: {
            project_id: selectedProject,
            date_from: toDateString(dateFrom) || undefined,
            date_to: toDateString(dateTo) || undefined,
            closed_statuses: closedStatusNames().join(',') || undefined
          }
        })
        const byAssignee = response.data.by_assignee
        const entries = Object.entries(byAssignee || {})
        setMetrics({
          distribution_data: {},
          status_time_data: {},
          by_assignee: byAssignee,
          total_issues: entries.reduce((sum, [, a]) => sum + (a.total_issues || 0), 0),
          average_close_time_hours: entries.length > 0
            ? entries.reduce((sum, [, a]) => sum + (a.average_close_time_hours || 0), 0) / entries.length
            : 0
        })
        setIssues(response.data.issues || [])
      } else {
        const params = new URLSearchParams({
          project_id: selectedProject,
          date_from: toDateString(dateFrom) || '',
          date_to: toDateString(dateTo) || '',
          priorities: Array.from(selectedPriorities).join(',') || '',
          assignees: Array.from(selectedAssignees).join(',') || '',
          issue_types: Array.from(selectedIssueTypes).join(',') || '',
          categories: Array.from(selectedCategories).join(',') || '',
          closed_statuses: closedStatusNames().join(',') || ''
        })
        const response = await api.post(`/analytics?${params.toString()}`)
        setMetrics(response.data)
        setIssues(response.data.issues || [])
      }
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
                label="Дата с"
                variant="bordered"
                color="primary"
                labelPlacement="outside"
                value={dateFrom}
                onChange={(val) => { setDateFrom(val); onFilterChange() }}
                showMonthAndYearPickers
                classNames={{ inputWrapper: 'h-12' }}
              />

              <DatePicker
                label="Дата по"
                variant="bordered"
                color="primary"
                labelPlacement="outside"
                value={dateTo}
                onChange={(val) => { setDateTo(val); onFilterChange() }}
                showMonthAndYearPickers
                classNames={{ inputWrapper: 'h-12' }}
              />

              <div className="flex items-end">
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
                classNames={{ trigger: 'min-h-12' }}
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

              <div className="flex items-center h-full pt-6">
                <Checkbox
                  isSelected={groupByAssignee}
                  onValueChange={(val) => { setGroupByAssignee(val); onFilterChange() }}
                  color="primary"
                  radius="sm"
                  size="md"
                >
                  <span className="text-sm">Группировать по исполнителям</span>
                </Checkbox>
              </div>
            </div>
          </CardBody>
        </Card>

        {metrics && !loading && (
          <MetricsDisplay metrics={metrics} groupByAssignee={groupByAssignee} />
        )}

        {metrics && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card shadow="sm" radius="lg">
              <CardHeader className="pb-0 pt-4 px-5">
                <h3 className="text-lg font-semibold">Распределение времени закрытия</h3>
              </CardHeader>
              <CardBody className="px-5 pb-5">
                <ClosureTimeDistributionChart data={metrics.distribution_data} />
              </CardBody>
            </Card>

            <Card shadow="sm" radius="lg">
              <CardHeader className="pb-0 pt-4 px-5">
                <h3 className="text-lg font-semibold">Время в статусах — суммарно по всем задачам (часы)</h3>
              </CardHeader>
              <CardBody className="px-5 pb-5">
                <p className="text-xs text-gray-500 mb-2">Исторический срез по закрытым задачам: сколько суммарно часов каждая задача провела в статусах до закрытия</p>
                <StatusTimeChart data={metrics.status_time_data} />
              </CardBody>
            </Card>
          </div>
        )}

        {issues.length > 0 && !loading && (
          <IssuesTable issues={issues} />
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
