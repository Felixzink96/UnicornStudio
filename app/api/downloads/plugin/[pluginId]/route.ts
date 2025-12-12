import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface RouteParams {
  params: Promise<{ pluginId: string }>
}

// Plugin configurations
const PLUGINS: Record<string, {
  name: string
  folder: string
  filename: string
  description: string
  version: string
}> = {
  wordpress: {
    name: 'Unicorn Studio Connect',
    folder: 'unicorn-studio-connect',
    filename: 'unicorn-studio-connect.zip',
    description: 'WordPress Plugin für Unicorn Studio Integration',
    version: '1.0.0',
  },
  // Future plugins can be added here
  // shopify: { ... },
  // wix: { ... },
}

/**
 * GET /api/downloads/plugin/:pluginId
 * Download a plugin as ZIP file
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { pluginId } = await params

    // Validate plugin ID
    const plugin = PLUGINS[pluginId]
    if (!plugin) {
      return new Response(JSON.stringify({ error: 'Plugin not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get plugin directory path
    const pluginsBaseDir = path.join(process.cwd(), 'plugins', pluginId)
    const pluginDir = path.join(pluginsBaseDir, plugin.folder)

    // Check if plugin directory exists
    if (!fs.existsSync(pluginDir)) {
      return new Response(JSON.stringify({ error: 'Plugin files not found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create ZIP using system zip command (works on macOS and Linux)
    const tempZipPath = path.join('/tmp', `${plugin.folder}-${Date.now()}.zip`)

    try {
      // Create ZIP file
      await execAsync(`cd "${pluginsBaseDir}" && zip -r "${tempZipPath}" "${plugin.folder}"`)

      // Read ZIP file
      const zipBuffer = fs.readFileSync(tempZipPath)

      // Clean up temp file
      fs.unlinkSync(tempZipPath)

      // Return ZIP file
      return new Response(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${plugin.filename}"`,
          'Content-Length': String(zipBuffer.length),
          'Cache-Control': 'no-cache',
        },
      })
    } catch (zipError) {
      // Clean up on error
      if (fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath)
      }
      throw zipError
    }
  } catch (error) {
    console.error('Plugin download error:', error)
    return new Response(JSON.stringify({ error: 'Failed to create plugin archive' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * HEAD /api/downloads/plugin/:pluginId
 * Get plugin information without downloading
 */
export async function HEAD(request: NextRequest, { params }: RouteParams) {
  const { pluginId } = await params
  const plugin = PLUGINS[pluginId]

  if (!plugin) {
    return new Response(null, { status: 404 })
  }

  return new Response(null, {
    status: 200,
    headers: {
      'X-Plugin-Name': plugin.name,
      'X-Plugin-Description': plugin.description,
      'X-Plugin-Version': plugin.version,
    },
  })
}
