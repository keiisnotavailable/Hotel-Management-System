import { cloneElement, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function DropdownMenu({
  trigger,
  children,
  open,
  onOpenChange,
  id,
  label,
  align = 'end',
  minWidth = 0,
  matchTriggerWidth = false,
  menuClassName = '',
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const controlled = open !== undefined
  const isOpen = controlled ? open : internalOpen

  function changeOpen(nextOpen) {
    if (!controlled) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (!nextOpen) setPosition(null)
  }

  function assignTriggerRef(element) {
    triggerRef.current = element
    if (typeof trigger.ref === 'function') trigger.ref(element)
    else if (trigger.ref) trigger.ref.current = element
  }

  const enhancedTrigger = cloneElement(trigger, {
    ref: assignTriggerRef,
    'aria-haspopup': 'menu',
    'aria-expanded': isOpen,
    ...(id ? { 'aria-controls': id } : {}),
    onClick: (event) => {
      trigger.props.onClick?.(event)
      if (!event.defaultPrevented) changeOpen(!isOpen)
    },
  })

  useLayoutEffect(() => {
    if (!isOpen) return undefined
    let frame = 0
    const updatePosition = () => {
      const anchor = triggerRef.current
      const menu = menuRef.current
      if (!anchor || !menu) return
      const rect = anchor.getBoundingClientRect()
      const viewportPadding = 8
      const width = Math.min(matchTriggerWidth ? rect.width : Math.max(rect.width, minWidth), window.innerWidth - viewportPadding * 2)
      const menuHeight = menu.getBoundingClientRect().height
      const below = window.innerHeight - rect.bottom - viewportPadding
      const above = rect.top - viewportPadding
      const openBelow = menuHeight <= below || below >= above
      const maxHeight = Math.max(80, openBelow ? below : above)
      const left = align === 'start' ? rect.left : rect.right - width
      const top = openBelow ? rect.bottom : Math.max(viewportPadding, rect.top - Math.min(menuHeight, maxHeight))
      setPosition({
        left: Math.max(viewportPadding, Math.min(left, window.innerWidth - width - viewportPadding)),
        top,
        width,
        maxHeight,
      })
    }
    const schedulePosition = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updatePosition)
    }
    updatePosition()
    window.addEventListener('resize', schedulePosition)
    window.addEventListener('scroll', schedulePosition, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedulePosition)
      window.removeEventListener('scroll', schedulePosition, true)
    }
  }, [align, children, isOpen, matchTriggerWidth, minWidth])

  useEffect(() => {
    if (!isOpen) return undefined
    function handlePointerDown(event) {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      changeOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      changeOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function handleMenuClick(event) {
    if (event.target.closest?.('a,button,[role="menuitem"]')) changeOpen(false)
  }

  return <>
    {enhancedTrigger}
    {isOpen && createPortal(
      <div
        ref={menuRef}
        id={id}
        className={`shared-dropdown-menu ${menuClassName}`}
        role="menu"
        aria-label={label}
        style={{
          left: position?.left ?? -10000,
          top: position?.top ?? -10000,
          width: position?.width,
          maxHeight: position?.maxHeight,
          visibility: position ? 'visible' : 'hidden',
        }}
        onClick={handleMenuClick}
      >
        {children}
      </div>,
      document.body,
    )}
  </>
}
