import { NextRequest, NextResponse } from 'next/server';
import { scrapeOwnershipData } from '@/lib/data-scraping';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SCRAPINGBEE_API_KEY) {
      return NextResponse.json(
        { error: 'ScrapingBee API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { outlets } = body;

    if (!outlets || !Array.isArray(outlets)) {
      return NextResponse.json(
        { error: 'outlets array required' },
        { status: 400 }
      );
    }

    console.log(`[v0] Starting ownership scrape for ${outlets.length} outlets...`);
    
    const results = await scrapeOwnershipData(outlets);
    
    return NextResponse.json({ 
      success: true,
      results,
      message: `Updated ownership for ${results.filter(r => r.success).length} outlets`
    });
    
  } catch (error) {
    console.error('[v0] Ownership API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
