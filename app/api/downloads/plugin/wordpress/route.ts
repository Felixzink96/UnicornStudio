import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const pluginPath = path.join(process.cwd(), 'plugins/wordpress/unicorn-studio-connect.zip')

    const fileBuffer = await readFile(pluginPath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="unicorn-studio-connect.zip"',
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Plugin download error:', error)
    return NextResponse.json(
      { error: 'Plugin file not found' },
      { status: 404 }
    )
  }
}
