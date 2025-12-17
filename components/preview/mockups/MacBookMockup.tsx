'use client'

import { ReactNode } from 'react'

interface MacBookMockupProps {
  children: ReactNode
  className?: string
}

export function MacBookMockup({ children, className = '' }: MacBookMockupProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Screen */}
      <div className="bg-[#1a1a1a] rounded-t-2xl p-3 pb-0">
        {/* Browser chrome */}
        <div className="bg-[#f5f5f5] rounded-t-lg overflow-hidden">
          {/* Title bar */}
          <div className="h-9 bg-[#e8e8e8] flex items-center px-3 gap-2">
            {/* Traffic lights */}
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28ca41]" />
            </div>
            {/* URL bar */}
            <div className="flex-1 flex justify-center">
              <div className="bg-white rounded-md px-4 py-1 text-xs text-gray-500 min-w-[200px] text-center">
                unicornstudio.app
              </div>
            </div>
            <div className="w-[52px]" />
          </div>
          {/* Content */}
          <div className="bg-white aspect-[16/10] overflow-hidden">
            {children}
          </div>
        </div>
      </div>
      {/* Bottom bezel */}
      <div className="h-4 bg-[#1a1a1a] rounded-b-lg" />
      {/* Base */}
      <div className="mx-auto w-[115%] -ml-[7.5%] h-2 bg-gradient-to-b from-[#888] to-[#666] rounded-b-lg" />
    </div>
  )
}
