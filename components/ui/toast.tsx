'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastData {
  id: string
  type: ToastType
  title: string
  description?: string
}

// Global state
let toasts: ToastData[] = []
let listeners: Array<(toasts: ToastData[]) => void> = []

function notify() {
  listeners.forEach((listener) => listener([...toasts]))
}

function addToast(type: ToastType, title: string, description?: string) {
  const id = Math.random().toString(36).substring(2, 9)
  toasts = [...toasts, { id, type, title, description }]
  notify()

  // Auto remove after 4 seconds
  setTimeout(() => {
    removeToast(id)
  }, 4000)

  return id
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

// Public API
export const toast = {
  success: (title: string, description?: string) => addToast('success', title, description),
  error: (title: string, description?: string) => addToast('error', title, description),
  warning: (title: string, description?: string) => addToast('warning', title, description),
  info: (title: string, description?: string) => addToast('info', title, description),
}

// Hook
export function useToast() {
  const [currentToasts, setCurrentToasts] = React.useState<ToastData[]>([])

  React.useEffect(() => {
    listeners.push(setCurrentToasts)
    return () => {
      listeners = listeners.filter((l) => l !== setCurrentToasts)
    }
  }, [])

  return { toasts: currentToasts, dismiss: removeToast }
}

// Icon component
function ToastIcon({ type }: { type: ToastType }) {
  const iconClass = 'h-5 w-5'

  switch (type) {
    case 'success':
      return <CheckCircle className={cn(iconClass, 'text-emerald-500')} />
    case 'error':
      return <XCircle className={cn(iconClass, 'text-red-500')} />
    case 'warning':
      return <AlertCircle className={cn(iconClass, 'text-amber-500')} />
    case 'info':
      return <Info className={cn(iconClass, 'text-blue-500')} />
  }
}

// Single Toast component
function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isLeaving, setIsLeaving] = React.useState(false)

  React.useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(onDismiss, 200)
  }

  return (
    <div
      className={cn(
        // Base styles - white in light mode, zinc-900 in dark mode
        'pointer-events-auto w-80 overflow-hidden rounded-xl',
        'bg-white dark:bg-zinc-900',
        'shadow-lg shadow-zinc-200/50 dark:shadow-zinc-950/50',
        'border border-zinc-200 dark:border-zinc-800',
        // Animation
        'transform transition-all duration-300 ease-out',
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-4 opacity-0'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 pt-0.5">
            <ToastIcon type={toast.type} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {toast.title}
            </p>
            {toast.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-lg p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={cn(
            'h-full',
            toast.type === 'success' && 'bg-emerald-500',
            toast.type === 'error' && 'bg-red-500',
            toast.type === 'warning' && 'bg-amber-500',
            toast.type === 'info' && 'bg-blue-500'
          )}
          style={{
            width: '100%',
            animation: 'toast-progress 4s linear forwards',
          }}
        />
      </div>
    </div>
  )
}

// Toaster container
export function Toaster() {
  const { toasts, dismiss } = useToast()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <>
      {/* Animation keyframes */}
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </>,
    document.body
  )
}
