import { useEffect, useRef } from 'react'

export default function useScrollReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const element = ref.current
    if (!element || !('IntersectionObserver' in window)) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.classList.add('is-revealed')
        observer.disconnect()
      }
    }, { threshold: 0.12 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return ref
}
