'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Page } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'

interface PagesListProps {
  siteId: string
  initialPages: Page[]
}

export function PagesList({ siteId }: PagesListProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const finalSlug = slug || generateSlug(name)

    const { error: createError } = await supabase.from('pages').insert({
      site_id: siteId,
      name,
      slug: finalSlug,
    })

    if (createError) {
      setError(createError.message)
      setIsLoading(false)
      return
    }

    setOpen(false)
    setName('')
    setSlug('')
    setIsLoading(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle className="text-white">Create New Page</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a new page to your site
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pageName" className="text-white">
                Page Name
              </Label>
              <Input
                id="pageName"
                placeholder="About Us"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!slug) {
                    // Auto-generate slug if not manually set
                  }
                }}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageSlug" className="text-white">
                URL Slug
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">/</span>
                <Input
                  id="pageSlug"
                  placeholder={name ? generateSlug(name) : 'about-us'}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <p className="text-xs text-slate-500">
                Leave empty to auto-generate from name
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Page'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
