'use client'

import { useEffect, useState } from 'react'

interface FullPageWireframeProps {
  isActive: boolean
}

// Section Container - animiert rein, KEIN Hintergrund
function Section({
  height,
  delay,
  isBuilding,
  children
}: {
  height: string
  delay: number
  isBuilding: boolean
  children?: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isBuilding) {
      const timer = setTimeout(() => setVisible(true), delay)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [isBuilding, delay])

  return (
    <div
      className={`
        ${height} w-full transition-all duration-500
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      {children}
    </div>
  )
}

// Skeleton Element - das einzige mit Farbe
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-zinc-300/40 dark:bg-zinc-600/40 ${className}`} />
  )
}

export function FullPageWireframe({ isActive }: FullPageWireframeProps) {
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (!isActive) {
      setCycle(0)
      return
    }
    const interval = setInterval(() => setCycle(c => c + 1), 6000)
    return () => clearInterval(interval)
  }, [isActive])

  if (!isActive) return null

  return (
    <div className="absolute inset-0 z-20 overflow-hidden" key={cycle}>
      <div className="h-full w-full flex flex-col">

        {/* Header */}
        <Section height="h-16" delay={0} isBuilding={isActive}>
          <div className="h-full px-8 flex items-center justify-between">
            <Skeleton className="w-24 h-6 rounded" />
            <div className="flex gap-6">
              <Skeleton className="w-16 h-3 rounded" />
              <Skeleton className="w-16 h-3 rounded" />
              <Skeleton className="w-16 h-3 rounded" />
            </div>
            <Skeleton className="w-20 h-8 rounded" />
          </div>
        </Section>

        {/* Hero */}
        <Section height="h-80" delay={300} isBuilding={isActive}>
          <div className="h-full flex items-center px-16">
            <div className="flex-1 space-y-4">
              <Skeleton className="w-3/4 h-8 rounded" />
              <Skeleton className="w-1/2 h-8 rounded" />
              <Skeleton className="w-2/3 h-4 rounded mt-6" />
              <Skeleton className="w-1/2 h-4 rounded" />
              <div className="flex gap-4 mt-8">
                <Skeleton className="w-32 h-10 rounded" />
                <Skeleton className="w-28 h-10 rounded" />
              </div>
            </div>
            <Skeleton className="w-1/3 h-48 rounded" />
          </div>
        </Section>

        {/* Features Grid */}
        <Section height="h-64" delay={700} isBuilding={isActive}>
          <div className="h-full p-8">
            <Skeleton className="w-48 h-5 rounded mx-auto mb-8" />
            <div className="grid grid-cols-3 gap-6 h-40">
              {[0, 1, 2].map(i => (
                <div key={i} className="p-4 space-y-3">
                  <Skeleton className="w-10 h-10 rounded" />
                  <Skeleton className="w-3/4 h-4 rounded" />
                  <Skeleton className="w-full h-3 rounded" />
                  <Skeleton className="w-2/3 h-3 rounded" />
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Content Section */}
        <Section height="h-48" delay={1100} isBuilding={isActive}>
          <div className="h-full p-8 flex gap-8">
            <Skeleton className="w-1/2 h-full rounded" />
            <div className="w-1/2 space-y-3 py-4">
              <Skeleton className="w-2/3 h-5 rounded" />
              <Skeleton className="w-full h-3 rounded" />
              <Skeleton className="w-full h-3 rounded" />
              <Skeleton className="w-3/4 h-3 rounded" />
              <Skeleton className="w-24 h-8 rounded mt-4" />
            </div>
          </div>
        </Section>

        {/* CTA */}
        <Section height="h-32" delay={1500} isBuilding={isActive}>
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Skeleton className="w-64 h-6 rounded" />
            <Skeleton className="w-36 h-10 rounded" />
          </div>
        </Section>

        {/* Footer */}
        <Section height="h-24" delay={1800} isBuilding={isActive}>
          <div className="h-full px-8 flex items-center justify-between">
            <Skeleton className="w-20 h-5 rounded" />
            <div className="flex gap-8">
              <Skeleton className="w-12 h-3 rounded" />
              <Skeleton className="w-12 h-3 rounded" />
              <Skeleton className="w-12 h-3 rounded" />
              <Skeleton className="w-12 h-3 rounded" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
          </div>
        </Section>

        {/* Spacer */}
        <div className="flex-1" />
      </div>
    </div>
  )
}
