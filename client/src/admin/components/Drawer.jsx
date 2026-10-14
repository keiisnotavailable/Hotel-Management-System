import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Drawer({ open, onClose, label = 'Navigation', panelClassName = '', children }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const panel = panelRef.current
    const focusable = () => [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    focusable()[0]?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function trapFocus(event) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) {
        event.preventDefault()
        panel.focus()
        return
      }
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault()
        items[items.length - 1].focus()
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault()
        items[0].focus()
      }
    }

    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return <div className="admin-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside ref={panelRef} className={`admin-drawer-panel ${panelClassName}`} role="dialog" aria-modal="true" aria-label={label} tabIndex="-1">
      <button type="button" className="admin-drawer-close" onClick={onClose} aria-label="Close navigation"><X size={20} /></button>
      {children}
    </aside>
  </div>
}
