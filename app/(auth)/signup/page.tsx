'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein')
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)

    // Auto-redirect after successful signup (if email confirmation is disabled)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 2000)
  }

  if (success) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Konto erstellt!</h1>
        <p className="text-gray-300">
          Du wirst zum Dashboard weitergeleitet...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Konto erstellen
        </h1>
        <p className="text-gray-300">
          Erstelle großartige Websites mit Unicorn Studio
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-white">
            Vollständiger Name
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Max Mustermann"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
        </div>

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
            placeholder="Min. 6 Zeichen"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
        >
          {isLoading ? 'Konto wird erstellt...' : 'Konto erstellen'}
        </Button>
      </form>

      <div className="mt-6 text-center text-gray-300">
        Bereits ein Konto?{' '}
        <Link
          href="/login"
          className="text-purple-400 hover:text-purple-300 font-medium"
        >
          Anmelden
        </Link>
      </div>
    </div>
  )
}
