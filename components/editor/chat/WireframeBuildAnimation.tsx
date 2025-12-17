'use client'

import { useEffect, useState } from 'react'

interface WireframeBuildAnimationProps {
  isActive: boolean
  operationType?: 'create_full_page' | 'replace_section' | 'add_section' | 'modify_section' | 'delete_section' | string
  sectionId?: string
}

// Wireframe-Block Komponente
function WireframeBlock({
  type,
  delay,
  isBuilding
}: {
  type: 'header' | 'hero' | 'content' | 'features' | 'cta' | 'footer'
  delay: number
  isBuilding: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [built, setBuilt] = useState(false)

  useEffect(() => {
    if (isBuilding) {
      const showTimer = setTimeout(() => setVisible(true), delay)
      const builtTimer = setTimeout(() => setBuilt(true), delay + 600)
      return () => {
        clearTimeout(showTimer)
        clearTimeout(builtTimer)
      }
    } else {
      setVisible(false)
      setBuilt(false)
    }
  }, [isBuilding, delay])

  const configs = {
    header: { height: 'h-8', label: 'Header', icon: '▭' },
    hero: { height: 'h-24', label: 'Hero', icon: '◇' },
    content: { height: 'h-16', label: 'Content', icon: '≡' },
    features: { height: 'h-20', label: 'Features', icon: '⊞' },
    cta: { height: 'h-12', label: 'CTA', icon: '◉' },
    footer: { height: 'h-10', label: 'Footer', icon: '▭' },
  }

  const config = configs[type]

  return (
    <div
      className={`
        relative overflow-hidden rounded-md border-2 transition-all duration-500
        ${config.height}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${built
          ? 'border-[var(--color-brand-primary)]/40 bg-[var(--color-brand-primary)]/5'
          : 'border-dashed border-neutral-600 bg-neutral-900/50'
        }
      `}
    >
      {/* Scan-Linie Animation */}
      {visible && !built && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-brand-primary)] to-transparent animate-scan"
          />
        </div>
      )}

      {/* Wireframe-Inhalt */}
      <div className={`
        flex items-center justify-center gap-2 h-full
        transition-all duration-300
        ${built ? 'text-[var(--color-brand-primary)]' : 'text-neutral-500'}
      `}>
        <span className="text-lg">{config.icon}</span>
        <span className="text-xs font-mono uppercase tracking-wider">{config.label}</span>
      </div>

      {/* Pulsierender Rand wenn aktiv */}
      {visible && !built && (
        <div className="absolute inset-0 rounded-md border-2 border-[var(--color-brand-primary)]/50 animate-pulse" />
      )}

      {/* Checkmark wenn fertig */}
      {built && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--color-brand-primary)]/20 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-[var(--color-brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  )
}

// Einzelne Section Animation (für replace/modify)
function SingleSectionAnimation({ isActive, sectionType }: { isActive: boolean, sectionType?: string }) {
  const [phase, setPhase] = useState<'idle' | 'disassemble' | 'build' | 'complete'>('idle')

  useEffect(() => {
    if (isActive) {
      setPhase('disassemble')
      const buildTimer = setTimeout(() => setPhase('build'), 800)
      const completeTimer = setTimeout(() => setPhase('complete'), 2000)
      return () => {
        clearTimeout(buildTimer)
        clearTimeout(completeTimer)
      }
    } else {
      setPhase('idle')
    }
  }, [isActive])

  return (
    <div className="relative p-4">
      {/* Alte Section "zerfällt" */}
      <div className={`
        relative h-24 rounded-lg border-2 border-dashed transition-all duration-500
        ${phase === 'disassemble'
          ? 'border-red-500/50 bg-red-500/10 scale-95 opacity-50'
          : phase === 'build' || phase === 'complete'
          ? 'border-[var(--color-brand-primary)]/50 bg-[var(--color-brand-primary)]/5'
          : 'border-neutral-600 bg-neutral-900/50'
        }
      `}>
        {/* Partikel-Effekt beim Disassemble */}
        {phase === 'disassemble' && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-red-500/60 rounded-sm animate-particle"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Build-Linien */}
        {phase === 'build' && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-brand-primary)] to-transparent animate-scan" />
            <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-transparent via-[var(--color-brand-primary)] to-transparent animate-scan-vertical" />
          </div>
        )}

        {/* Content */}
        <div className="flex items-center justify-center h-full gap-2">
          {phase === 'complete' ? (
            <div className="flex items-center gap-2 text-[var(--color-brand-primary)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">{sectionType || 'Section'} aktualisiert</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-neutral-400">
              <div className={`w-4 h-4 rounded-full border-2 border-current ${phase !== 'idle' ? 'animate-spin' : ''}`}>
                <div className="w-1 h-1 bg-current rounded-full mt-0.5 ml-0.5" />
              </div>
              <span className="text-xs font-mono uppercase">
                {phase === 'disassemble' ? 'Entferne alte Version...' : 'Baue neu auf...'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WireframeBuildAnimation({
  isActive,
  operationType = 'create_full_page',
  sectionId
}: WireframeBuildAnimationProps) {
  const [buildPhase, setBuildPhase] = useState(0)

  useEffect(() => {
    if (isActive && operationType === 'create_full_page') {
      // Starte Build-Animation
      setBuildPhase(1)

      // Wiederhole Animation wenn noch aktiv
      const interval = setInterval(() => {
        setBuildPhase(prev => prev + 1)
      }, 4000)

      return () => clearInterval(interval)
    } else {
      setBuildPhase(0)
    }
  }, [isActive, operationType])

  if (!isActive) return null

  // Für Section-Updates zeige einzelne Section Animation
  if (operationType === 'replace_section' || operationType === 'modify_section') {
    return (
      <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="w-full max-w-sm">
          <SingleSectionAnimation isActive={isActive} sectionType={sectionId} />
          <p className="text-center text-neutral-500 text-xs mt-2">
            KI generiert neuen Inhalt...
          </p>
        </div>
      </div>
    )
  }

  // Für neue Seiten zeige Full-Page Build Animation
  return (
    <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="w-full max-w-xs p-4">
        {/* Titel */}
        <div className="text-center mb-4">
          <h3 className="text-sm font-medium text-neutral-300">Baue Seite auf...</h3>
          <div className="flex items-center justify-center gap-1 mt-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-primary)] animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Wireframe Blocks */}
        <div className="space-y-2" key={buildPhase}>
          <WireframeBlock type="header" delay={0} isBuilding={isActive} />
          <WireframeBlock type="hero" delay={400} isBuilding={isActive} />
          <WireframeBlock type="content" delay={800} isBuilding={isActive} />
          <WireframeBlock type="features" delay={1200} isBuilding={isActive} />
          <WireframeBlock type="cta" delay={1600} isBuilding={isActive} />
          <WireframeBlock type="footer" delay={2000} isBuilding={isActive} />
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-accent,var(--color-brand-primary))] animate-progress"
          />
        </div>
      </div>
    </div>
  )
}
