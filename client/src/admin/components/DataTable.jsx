import EmptyState from './EmptyState'

export default function DataTable({ columns, items = [], rowKey = '_id', emptyTitle = 'Nothing to show yet', emptyDescription = 'There are no records to display.' }) {
  if (!items.length) return <EmptyState title={emptyTitle} description={emptyDescription} />
  return <div className="admin-data-table-wrap">
    <table className="admin-data-table">
      <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
      <tbody>{items.map((item, index) => <tr key={item[rowKey] || item.id || index}>
        {columns.map((column) => <td key={column.key} data-label={column.label}>{column.render ? column.render(item) : item[column.key]}</td>)}
      </tr>)}</tbody>
    </table>
  </div>
}
