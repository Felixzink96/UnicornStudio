import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    // Serve pre-built ZIP file
    const zipPath = path.join(process.cwd(), 'plugins/wordpress/unicorn-studio-connect/themes/unicorn-studio-blank.zip')

    const fileBuffer = await readFile(zipPath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="unicorn-studio-blank.zip"',
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Theme download error:', error)
    return NextResponse.json(
      { error: 'Theme ZIP not found. Please rebuild the theme package.' },
      { status: 404 }
    )
  }
}
