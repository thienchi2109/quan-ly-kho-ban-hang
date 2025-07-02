"use client"

import * as React from "react"
import { ChartContainer, type ChartConfig } from "./chart"

interface OptimizedChartProps {
  config: ChartConfig
  className?: string
  children: React.ReactNode
  data?: any[]
}

// Memoized chart component to prevent unnecessary re-renders
export const OptimizedChart = React.memo<OptimizedChartProps>(({ 
  config, 
  className, 
  children, 
  data 
}) => {
  return (
    <ChartContainer config={config} className={className}>
      {children}
    </ChartContainer>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  if (prevProps.className !== nextProps.className) return false
  if (prevProps.config !== nextProps.config) return false
  
  // Deep comparison for data array if provided
  if (prevProps.data && nextProps.data) {
    if (prevProps.data.length !== nextProps.data.length) return false
    
    // Compare data objects by reference first, then by JSON if needed
    for (let i = 0; i < prevProps.data.length; i++) {
      if (prevProps.data[i] !== nextProps.data[i]) {
        // If references differ, do a shallow comparison of key properties
        const prev = prevProps.data[i]
        const next = nextProps.data[i]
        
        if (typeof prev === 'object' && typeof next === 'object') {
          const prevKeys = Object.keys(prev)
          const nextKeys = Object.keys(next)
          
          if (prevKeys.length !== nextKeys.length) return false
          
          for (const key of prevKeys) {
            if (prev[key] !== next[key]) return false
          }
        } else if (prev !== next) {
          return false
        }
      }
    }
  } else if (prevProps.data !== nextProps.data) {
    return false
  }
  
  return true
})

OptimizedChart.displayName = "OptimizedChart"

// Hook for memoizing chart data transformations
export function useChartData<T, R>(
  data: T[],
  transformer: (data: T[]) => R[],
  deps: React.DependencyList = []
): R[] {
  return React.useMemo(() => transformer(data), [data, ...deps])
}

// Hook for memoizing chart configurations
export function useChartConfig(
  baseConfig: ChartConfig,
  dynamicProps?: Record<string, any>
): ChartConfig {
  return React.useMemo(() => {
    if (!dynamicProps) return baseConfig
    
    return {
      ...baseConfig,
      ...dynamicProps
    }
  }, [baseConfig, dynamicProps])
}
