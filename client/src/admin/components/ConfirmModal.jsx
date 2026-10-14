import { useEffect, useRef, useState } from 'react'

export default function ConfirmModal({ open, title = 'Confirm action', description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', requiredText, busy = false, onConfirm, onClose }) {
  const [typedValue, setTypedValue] = useState('')
  const cancelRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    setTypedValue('')
    cancelRef.current?.focus()
    const close = (event) => event.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [open, busy, onClose])
  if (!open) return null
  const canConfirm = !requiredText || typedValue === requiredText
  return <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
    <section className="admin-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-description">
      <p className="admin-kicker">Please confirm</p>
      <h2 id="admin-confirm-title">{title}</h2>
      <p id="admin-confirm-description">{description}</p>
      {requiredText && <label className="admin-confirm-input-label">Type <strong>{requiredText}</strong> to continue<input value={typedValue} onChange={(event) => setTypedValue(event.target.value)} autoComplete="off" /></label>}
      <div className="admin-modal-actions"><button ref={cancelRef} type="button" onClick={onClose} disabled={busy}>{cancelLabel}</button><button type="button" className="danger" disabled={!canConfirm || busy} onClick={onConfirm}>{confirmLabel}</button></div>
    </section>
  </div>
}
