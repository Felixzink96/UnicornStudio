'use client'

import { ReactNode } from 'react'

interface iPadMockupProps {
  children: ReactNode
  className?: string
  orientation?: 'portrait' | 'landscape'
}

export function IPadMockup({ children, className = '', orientation = 'landscape' }: iPadMockupProps) {
  const isLandscape = orientation === 'landscape'

  return (
    <div className={`relative inline-block ${className}`}>
      {/* iPad Frame */}
      <div
        className="relative bg-[#1a1a1a] rounded-[2rem] p-3"
        style={{
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)',
        }}
      >
        {/* Screen */}
        <div
          className={`bg-white rounded-2xl overflow-hidden ${
            isLandscape ? 'aspect-[4/3]' : 'aspect-[3/4]'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
