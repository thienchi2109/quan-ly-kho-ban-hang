"use client"

import { useEffect } from 'react'

interface WebVitalsMetric {
  id: string
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

// Web Vitals thresholds
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS]
  if (!threshold) return 'good'
  
  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

function reportWebVitals(metric: WebVitalsMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value}ms (${metric.rating})`)
  }
  
  // You can send to analytics service here
  // Example: analytics.track('web-vital', metric)
}

export function WebVitalsReporter() {
  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS((metric) => {
        reportWebVitals({
          id: metric.id,
          name: metric.name,
          value: metric.value,
          rating: getRating(metric.name, metric.value)
        })
      })
      
      onFID((metric) => {
        reportWebVitals({
          id: metric.id,
          name: metric.name,
          value: metric.value,
          rating: getRating(metric.name, metric.value)
        })
      })
      
      onFCP((metric) => {
        reportWebVitals({
          id: metric.id,
          name: metric.name,
          value: metric.value,
          rating: getRating(metric.name, metric.value)
        })
      })
      
      onLCP((metric) => {
        reportWebVitals({
          id: metric.id,
          name: metric.name,
          value: metric.value,
          rating: getRating(metric.name, metric.value)
        })
      })
      
      onTTFB((metric) => {
        reportWebVitals({
          id: metric.id,
          name: metric.name,
          value: metric.value,
          rating: getRating(metric.name, metric.value)
        })
      })
    }).catch((error) => {
      console.warn('Failed to load web-vitals:', error)
    })
  }, [])

  return null
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  useEffect(() => {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`[Performance] Long task detected: ${entry.duration}ms`)
          }
        }
      })
      
      try {
        observer.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        // Longtask API not supported
      }
      
      return () => observer.disconnect()
    }
  }, [])
}

// Component to display performance metrics in development
export function PerformanceDebugger() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 9999,
        fontFamily: 'monospace'
      }}
    >
      <div>Performance Monitor Active</div>
      <div>Check console for Web Vitals</div>
    </div>
  )
}
