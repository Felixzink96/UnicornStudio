import { NextResponse } from 'next/server'
import { readdir, readFile, stat } from 'fs/promises'
import path from 'path'
import JSZip from 'jszip'

// Recursively add directory to zip
async function addDirectoryToZip(zip: JSZip, dirPath: string, zipPath: string) {
  const entries = await readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const zipFilePath = path.join(zipPath, entry.name)

    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, zipFilePath)
    } else {
      const content = await readFile(fullPath)
      zip.file(zipFilePath, content)
    }
  }
}

export async function GET() {
  try {
    const pluginDir = path.join(process.cwd(), 'plugins/wordpress/unicorn-studio-connect')

    // Check if directory exists
    const dirStat = await stat(pluginDir)
    if (!dirStat.isDirectory()) {
      throw new Error('Plugin directory not found')
    }

    // Create a new zip
    const zip = new JSZip()

    // Add the entire plugin directory
    await addDirectoryToZip(zip, pluginDir, 'unicorn-studio-connect')

    // Generate zip as blob (compatible with NextResponse)
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    })

    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="unicorn-studio-connect.zip"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Plugin download error:', error)
    return NextResponse.json(
      { error: 'Plugin konnte nicht erstellt werden' },
      { status: 500 }
    )
  }
}
