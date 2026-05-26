import { Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react'

function formatTime(hours) {
  if (!hours) return '0h'
  if (hours < 24) return `${Math.round(hours)}h`
  const days = Math.round(hours / 24)
  return `${days}d`
}

export default function MetricsDisplay({ metrics, groupByAssignee }) {
  return (
    <div>
      {/* Main Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card shadow="sm" radius="lg">
          <CardBody className="text-center py-6">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-default-500">Среднее время закрытия</p>
            <p className="text-3xl font-bold text-primary mt-1">
              {formatTime(metrics.average_close_time_hours)}
            </p>
          </CardBody>
        </Card>

        <Card shadow="sm" radius="lg">
          <CardBody className="text-center py-6">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-secondary/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-default-500">Медианное время закрытия</p>
            <p className="text-3xl font-bold text-secondary mt-1">
              {formatTime(metrics.median_close_time_hours)}
            </p>
          </CardBody>
        </Card>

        <Card shadow="sm" radius="lg">
          <CardBody className="text-center py-6">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-success/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-default-500">Всего задач</p>
            <p className="text-3xl font-bold text-success mt-1">
              {metrics.total_issues}
            </p>
          </CardBody>
        </Card>

        <Card shadow="sm" radius="lg">
          <CardBody className="text-center py-6">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-warning/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-default-500">Общее время закрытия</p>
            <p className="text-3xl font-bold text-warning mt-1">
              {(() => {
                const totalH = (metrics.average_close_time_hours || 0) * (metrics.total_issues || 0)
                return formatTime(totalH)
              })()}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Assignee Breakdown */}
      {groupByAssignee && metrics.by_assignee && (
        <Card shadow="sm" radius="lg" className="mt-4">
          <CardHeader className="pb-0 pt-4 px-5">
            <h3 className="text-lg font-semibold">Метрики по исполнителям</h3>
          </CardHeader>
          <CardBody className="px-5 pb-5">
            <Table
              aria-label="Метрики по исполнителям"
              shadow="none"
              radius="md"
              isStriped
              classNames={{ th: 'text-xs font-semibold uppercase text-default-500' }}
            >
              <TableHeader>
                <TableColumn>Исполнитель</TableColumn>
                <TableColumn>Всего задач</TableColumn>
                <TableColumn>Среднее время</TableColumn>
                <TableColumn>Медианное время</TableColumn>
              </TableHeader>
              <TableBody>
                {Object.entries(metrics.by_assignee).map(([name, data]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{data.total_issues}</TableCell>
                    <TableCell>{formatTime(data.average_close_time_hours)}</TableCell>
                    <TableCell>{formatTime(data.median_close_time_hours)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
