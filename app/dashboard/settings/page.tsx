import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Settings,
  Key,
  Puzzle,
  User,
  Building,
  CreditCard,
  Bell,
  Shield,
  ChevronRight,
} from 'lucide-react'

const settingsItems = [
  {
    name: 'API Keys',
    description: 'Verwalte API Keys für externe Integrationen wie WordPress',
    href: '/dashboard/settings/api-keys',
    icon: Key,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    name: 'Integrationen',
    description: 'Plugins für WordPress, Shopify und andere Plattformen',
    href: '/dashboard/settings/integrations',
    icon: Puzzle,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    name: 'Profil',
    description: 'Dein Name, E-Mail und Profilbild',
    href: '/dashboard/settings/profile',
    icon: User,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/10',
    comingSoon: true,
  },
  {
    name: 'Organisation',
    description: 'Team-Mitglieder und Berechtigungen verwalten',
    href: '/dashboard/settings/organization',
    icon: Building,
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    comingSoon: true,
  },
  {
    name: 'Abrechnung',
    description: 'Plan, Zahlungsmethode und Rechnungen',
    href: '/dashboard/settings/billing',
    icon: CreditCard,
    iconColor: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    comingSoon: true,
  },
  {
    name: 'Benachrichtigungen',
    description: 'E-Mail- und Push-Benachrichtigungen konfigurieren',
    href: '/dashboard/settings/notifications',
    icon: Bell,
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    comingSoon: true,
  },
  {
    name: 'Sicherheit',
    description: 'Passwort, 2FA und aktive Sessions',
    href: '/dashboard/settings/security',
    icon: Shield,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    comingSoon: true,
  },
]

export default async function SettingsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    notFound()
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="h-8 w-8 text-slate-400" />
          Einstellungen
        </h1>
        <p className="text-slate-400 mt-2">
          Verwalte dein Konto und konfiguriere Unicorn Studio
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
            {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {profile?.full_name || 'Benutzer'}
            </h2>
            <p className="text-slate-400">{user.email}</p>
            <p className="text-slate-500 text-sm mt-1">
              {(profile?.organization as { name?: string })?.name || 'Persönlicher Workspace'}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4">
        {settingsItems.map((item) => (
          <Link
            key={item.name}
            href={item.comingSoon ? '#' : item.href}
            className={`
              group bg-slate-800/50 rounded-xl border border-slate-700 p-5
              flex items-center gap-4 transition-all
              ${item.comingSoon
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:bg-slate-800 hover:border-slate-600'}
            `}
            onClick={item.comingSoon ? (e) => e.preventDefault() : undefined}
          >
            <div className={`p-3 rounded-lg ${item.bgColor}`}>
              <item.icon className={`h-6 w-6 ${item.iconColor}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium text-white">{item.name}</h3>
                {item.comingSoon && (
                  <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-400 rounded">
                    Bald
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">{item.description}</p>
            </div>
            {!item.comingSoon && (
              <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
