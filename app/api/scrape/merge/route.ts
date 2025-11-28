import { NextResponse } from 'next/server'
import { mergeDuplicateOutlets } from '@/lib/data-scraping'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.SCRAPINGBEE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SCRAPINGBEE_API_KEY not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { outlets } = body

    if (!outlets || !Array.isArray(outlets)) {
      return NextResponse.json(
        { error: 'Invalid request: outlets array required' },
        { status: 400 }
      )
    }

    const results = await mergeDuplicateOutlets(outlets)

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[v0] Merge duplicates error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to merge duplicates',
        results: []
      },
      { status: 500 }
    )
  }
}
