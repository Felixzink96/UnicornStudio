'use client'

import { ReactNode } from 'react'

interface iPhoneMockupProps {
  children: ReactNode
  className?: string
  color?: 'black' | 'white' | 'titanium'
}

export function IPhoneMockup({ children, className = '', color = 'black' }: iPhoneMockupProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      {/* iPhone Frame */}
      <div
        className="relative bg-[#1a1a1a] rounded-[3rem] p-2"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Screen */}
        <div className="relative bg-black rounded-[2.5rem] overflow-hidden aspect-[9/19.5]">
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="w-24 h-7 bg-black rounded-full" />
          </div>

          {/* Content */}
          <div className="h-full w-full bg-white overflow-hidden">
            {children}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
            <div className="w-28 h-1 bg-black rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
