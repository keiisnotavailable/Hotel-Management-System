export default function Toast({ message, error }) {
  if (!message && !error) return null
  return <div className={`fixed bottom-5 right-5 z-[70] max-w-sm rounded border px-4 py-3 text-sm shadow-xl ${error ? 'border-red-300/50 bg-red-950 text-red-100' : 'border-emerald-300/50 bg-emerald-950 text-emerald-100'}`} role={error ? 'alert' : 'status'}>{message || error}</div>
}
