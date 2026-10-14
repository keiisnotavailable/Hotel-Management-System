import { useEffect, useState } from 'react'
import EmptyState from './EmptyState'
import Pagination from './Pagination'

export default function DataTable({ columns, items = [], rowKey = '_id', pageSize = 5, emptyTitle = 'Nothing to show yet', emptyDescription = 'There are no records to display.' }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(items.length / pageSize)

  useEffect(() => {
    if (page > Math.max(1, totalPages)) setPage(Math.max(1, totalPages))
  }, [page, totalPages])

  if (!items.length) return <EmptyState title={emptyTitle} description={emptyDescription} />
  const visibleItems = items.slice((page - 1) * pageSize, page * pageSize)
  return <>
    <div className="admin-data-table-wrap">
      <table className="admin-data-table">
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{visibleItems.map((item, index) => <tr key={item[rowKey] || item.id || index}>
          {columns.map((column) => <td key={column.key} data-label={column.label}>{column.render ? column.render(item) : item[column.key]}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
  </>
}
