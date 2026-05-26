import { useState, useMemo } from 'react'
import {
  Card, CardHeader, CardBody,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Chip, Pagination
} from '@heroui/react'

function formatCloseTime(hours) {
  if (hours === null || hours === undefined) return '—'
  if (hours < 24) return `${Math.round(hours)}ч`
  const days = Math.round(hours / 24)
  return `${days}д`
}

function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const ROWS_PER_PAGE = 15

function formatStatusDays(days) {
  if (days === null || days === undefined) return '—'
  if (days < 1) return `${Math.round(days * 24)}ч`
  return `${Math.round(days)}д`
}

export default function IssuesTable({ issues, selectedKeys, onSelectionChange, trackedStatusNames = [] }) {
  const [page, setPage] = useState(1)
  const [sortDescriptor, setSortDescriptor] = useState({ column: 'close_time_hours', direction: 'descending' })

  const pages = Math.max(1, Math.ceil((issues?.length || 0) / ROWS_PER_PAGE))

  const sortedItems = useMemo(() => {
    if (!issues?.length) return []
    const items = [...issues]
    const { column, direction } = sortDescriptor

    items.sort((a, b) => {
      let aVal = a[column]
      let bVal = b[column]

      if (column === 'close_time_hours' || column.startsWith('_st_')) {
        aVal = aVal ?? -1
        bVal = bVal ?? -1
      }

      if (aVal < bVal) return direction === 'ascending' ? -1 : 1
      if (aVal > bVal) return direction === 'ascending' ? 1 : -1
      return 0
    })

    return items
  }, [issues, sortDescriptor])

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE
    return sortedItems.slice(start, start + ROWS_PER_PAGE)
  }, [sortedItems, page])

  if (!issues?.length) return null

  return (
    <Card shadow="sm" radius="lg" className="mt-6 mb-6">
      <CardHeader className="pb-0 pt-4 px-5 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Задачи ({issues.length})</h3>
      </CardHeader>
      <CardBody className="px-5 pb-5">
        <Table
          aria-label="Список задач"
          shadow="none"
          radius="md"
          isStriped
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          classNames={{ th: 'text-xs font-semibold uppercase text-default-500' }}
          bottomContent={
            pages > 1 ? (
              <div className="flex w-full justify-center">
                <Pagination
                  isCompact
                  showControls
                  color="primary"
                  page={page}
                  total={pages}
                  onChange={setPage}
                />
              </div>
            ) : null
          }
        >
          <TableHeader>
            <TableColumn key="id" allowsSorting>#</TableColumn>
            <TableColumn key="subject" allowsSorting>Тема</TableColumn>
            <TableColumn key="tracker" allowsSorting>Трекер</TableColumn>
            <TableColumn key="status" allowsSorting>Статус</TableColumn>
            <TableColumn key="priority" allowsSorting>Приоритет</TableColumn>
            <TableColumn key="assigned_to" allowsSorting>Исполнитель</TableColumn>
            <TableColumn key="closed_on" allowsSorting>Дата закрытия</TableColumn>
            <TableColumn key="close_time_hours" allowsSorting>Время закрытия</TableColumn>
            {trackedStatusNames.map((name) => (
              <TableColumn key={`_st_${name}`} allowsSorting>{name}</TableColumn>
            ))}
          </TableHeader>
          <TableBody emptyContent="Нет задач">
            {paginatedItems.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell>
                  <Button
                    as="a"
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="light"
                    color="primary"
                    size="sm"
                    className="font-mono text-xs px-1 min-w-0"
                  >
                    #{issue.id}
                  </Button>
                </TableCell>
                <TableCell>
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium text-sm"
                  >
                    {issue.subject}
                  </a>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-default-500">{issue.tracker || '—'}</span>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={issue.status === 'Closed' || issue.status === 'Rejected' || issue.status === 'Done' ? 'success' : 'warning'}
                  >
                    {issue.status || '—'}
                  </Chip>
                </TableCell>
                <TableCell>
                  <span className="text-xs">{issue.priority || '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-default-600">{issue.assigned_to || '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-default-500">{formatDate(issue.closed_on)}</span>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={issue.close_time_hours ? (issue.close_time_hours <= 24 ? 'success' : issue.close_time_hours <= 72 ? 'warning' : 'danger') : 'default'}
                  >
                    {formatCloseTime(issue.close_time_hours)}
                  </Chip>
                </TableCell>
                {trackedStatusNames.map((name) => (
                  <TableCell key={`_st_${name}`}>
                    <span className="text-xs text-default-500">
                      {formatStatusDays(issue[`_st_${name}`])}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  )
}
