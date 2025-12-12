import { NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import JSZip from 'jszip'

export async function GET() {
  try {
    const themePath = path.join(process.cwd(), 'plugins/wordpress/unicorn-studio-connect/themes/unicorn-studio-blank')

    // Create ZIP from theme folder
    const zip = new JSZip()
    const themeFolder = zip.folder('unicorn-studio-blank')

    if (!themeFolder) {
      throw new Error('Could not create ZIP folder')
    }

    // Read all theme files
    const files = await readdir(themePath)

    for (const file of files) {
      const filePath = path.join(themePath, file)
      const content = await readFile(filePath)
      themeFolder.file(file, content)
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="unicorn-studio-blank-theme.zip"',
        'Content-Length': zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Theme download error:', error)
    return NextResponse.json(
      { error: 'Theme files not found' },
      { status: 404 }
    )
  }
}
