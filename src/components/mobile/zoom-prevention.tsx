"use client"

import { useEffect } from 'react'

export function ZoomPrevention() {
  useEffect(() => {
    // Prevent zoom on mobile devices
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    // Prevent double-tap zoom
    let lastTouchEnd = 0
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = new Date().getTime()
      if (now - lastTouchEnd <= 300) {
        e.preventDefault()
      }
      lastTouchEnd = now
    }

    // Prevent pinch zoom
    const preventPinchZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
      }
    }

    // Add event listeners
    document.addEventListener('touchstart', preventZoom, { passive: false })
    document.addEventListener('touchmove', preventZoom, { passive: false })
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })
    document.addEventListener('wheel', preventPinchZoom, { passive: false })

    // Prevent zoom via keyboard
    const preventKeyboardZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', preventKeyboardZoom)

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', preventZoom)
      document.removeEventListener('touchmove', preventZoom)
      document.removeEventListener('touchend', preventDoubleTapZoom)
      document.removeEventListener('wheel', preventPinchZoom)
      document.removeEventListener('keydown', preventKeyboardZoom)
    }
  }, [])

  return null
}

// Hook for mobile detection
export function useIsMobile() {
  useEffect(() => {
    // Add mobile-specific styles
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      document.body.style.touchAction = 'pan-x pan-y'
      document.body.style.webkitTouchCallout = 'none'
      document.body.style.webkitUserSelect = 'none'
      document.body.style.userSelect = 'none'
    }
  }, [])
}
