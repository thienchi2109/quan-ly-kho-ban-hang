"use client"

import * as React from "react"
import { ChartContainer, type ChartConfig } from "./chart"
import { ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

interface MobileSafeChartProps {
  config: ChartConfig
  className?: string
  children: React.ReactNode
  enableTooltips?: boolean
}

// Mobile-safe chart wrapper with optimized touch interactions
export const MobileSafeChart = React.forwardRef<
  HTMLDivElement,
  MobileSafeChartProps
>(({ config, className, children, enableTooltips = true }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isTooltipActive, setIsTooltipActive] = React.useState(false)
  const touchStartTime = React.useRef<number>(0)
  const lastTouchEnd = React.useRef<number>(0)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Smart touch event handling that preserves tooltip functionality
    const handleTouchStart = (e: TouchEvent) => {
      touchStartTime.current = Date.now()

      // Only prevent multi-touch zoom, allow single touch for tooltips
      if (e.touches.length > 1) {
        e.preventDefault()
        return
      }

      // Allow single touch for tooltip interactions
      if (enableTooltips && e.touches.length === 1) {
        setIsTooltipActive(true)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent multi-touch zoom
      if (e.touches.length > 1) {
        e.preventDefault()
        return
      }

      // Allow single touch move for chart interactions
      if (enableTooltips && e.touches.length === 1) {
        // Don't prevent - allow chart tooltip tracking
        return
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now()
      const touchDuration = now - touchStartTime.current
      const timeSinceLastTouch = now - lastTouchEnd.current

      // Prevent double-tap zoom (but allow quick tooltip interactions)
      if (timeSinceLastTouch < 300 && touchDuration < 200) {
        e.preventDefault()
      }

      lastTouchEnd.current = now

      // Reset tooltip state after a delay to allow tooltip to show
      setTimeout(() => {
        setIsTooltipActive(false)
      }, 100)
    }

    // Add event listeners with proper passive settings
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })

    // Cleanup
    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enableTooltips])

  return (
    <div
      ref={containerRef}
      className={cn("mobile-chart-wrapper", className)}
      style={{
        touchAction: enableTooltips ? 'manipulation' : 'pan-x pan-y',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ChartContainer
          config={config}
          className={cn("chart-container", isTooltipActive && "tooltip-active")}
          ref={ref}
        >
          {children}
        </ChartContainer>
      </ResponsiveContainer>
    </div>
  )
})

MobileSafeChart.displayName = "MobileSafeChart"

// Hook to detect mobile device with better breakpoints
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  const [isTablet, setIsTablet] = React.useState(false)

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)

    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return { isMobile, isTablet, isMobileOrTablet: isMobile || isTablet }
}

// Enhanced mobile-optimized chart component
export function ResponsiveMobileChart({
  config,
  className,
  children,
  enableTooltips = true
}: MobileSafeChartProps) {
  const { isMobileOrTablet } = useIsMobile()

  // Always use mobile-safe wrapper for better touch handling
  return (
    <MobileSafeChart
      config={config}
      className={cn(
        className,
        isMobileOrTablet && "mobile-optimized"
      )}
      enableTooltips={enableTooltips}
    >
      {children}
    </MobileSafeChart>
  )
}

// Specialized chart components for different chart types
export function MobileLineChart({
  config,
  className,
  children
}: MobileSafeChartProps) {
  return (
    <ResponsiveMobileChart
      config={config}
      className={cn("line-chart-mobile", className)}
      enableTooltips={true}
    >
      {children}
    </ResponsiveMobileChart>
  )
}

export function MobilePieChart({
  config,
  className,
  children
}: MobileSafeChartProps) {
  return (
    <ResponsiveMobileChart
      config={config}
      className={cn("pie-chart-mobile", className)}
      enableTooltips={true}
    >
      {children}
    </ResponsiveMobileChart>
  )
}

export function MobileBarChart({
  config,
  className,
  children
}: MobileSafeChartProps) {
  return (
    <ResponsiveMobileChart
      config={config}
      className={cn("bar-chart-mobile", className)}
      enableTooltips={true}
    >
      {children}
    </ResponsiveMobileChart>
  )
}
