"use client"

import * as React from "react"
import { ChartContainer, type ChartConfig } from "./chart"
import { cn } from "@/lib/utils"

interface MobileSafeChartProps {
  config: ChartConfig
  className?: string
  children: React.ReactNode
}

// Mobile-safe chart wrapper that prevents zoom issues
export const MobileSafeChart = React.forwardRef<
  HTMLDivElement,
  MobileSafeChartProps
>(({ config, className, children }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Prevent zoom on touch events
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    // Prevent double-tap zoom
    const preventDoubleTap = (e: TouchEvent) => {
      e.preventDefault()
    }

    // Add event listeners
    container.addEventListener('touchstart', preventZoom, { passive: false })
    container.addEventListener('touchmove', preventZoom, { passive: false })
    container.addEventListener('touchend', preventDoubleTap, { passive: false })

    // Cleanup
    return () => {
      container.removeEventListener('touchstart', preventZoom)
      container.removeEventListener('touchmove', preventZoom)
      container.removeEventListener('touchend', preventDoubleTap)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn("mobile-chart-wrapper", className)}
      style={{
        touchAction: 'pan-x pan-y',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <ChartContainer 
        config={config} 
        className="chart-container"
        ref={ref}
      >
        {children}
      </ChartContainer>
    </div>
  )
})

MobileSafeChart.displayName = "MobileSafeChart"

// Hook to detect mobile device
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Mobile-optimized chart component
export function ResponsiveMobileChart({ 
  config, 
  className, 
  children 
}: MobileSafeChartProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <MobileSafeChart config={config} className={className}>
        {children}
      </MobileSafeChart>
    )
  }

  return (
    <ChartContainer config={config} className={className}>
      {children}
    </ChartContainer>
  )
}
