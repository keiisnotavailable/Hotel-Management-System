export default function Skeleton({ rows = 4, cards = false }) {
  return <div className={cards ? 'admin-skeleton-cards' : 'admin-skeleton-list'} aria-label="Loading" aria-busy="true">
    {Array.from({ length: rows }, (_, index) => <div className="admin-skeleton-row" key={index}><span /><span /><span /></div>)}
  </div>
}
