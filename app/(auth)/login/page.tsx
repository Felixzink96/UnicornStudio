'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    router.push(redirectUrl)
    router.refresh()
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Willkommen zurück
        </h1>
        <p className="text-gray-300">
          Melde dich bei deinem Unicorn Studio Konto an
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-white">
            E-Mail
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-white">
            Passwort
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Dein Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
        >
          {isLoading ? 'Anmelden...' : 'Anmelden'}
        </Button>
      </form>

      <div className="mt-6 text-center text-gray-300">
        Noch kein Konto?{' '}
        <Link
          href="/signup"
          className="text-purple-400 hover:text-purple-300 font-medium"
        >
          Registrieren
        </Link>
      </div>
    </div>
  )
}

function LoginFormFallback() {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  )
}
