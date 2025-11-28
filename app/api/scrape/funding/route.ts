import { NextRequest, NextResponse } from 'next/server';
import { scrapeFundingData } from '@/lib/data-scraping';

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

    console.log(`[v0] Starting funding scrape for ${outlets.length} outlets...`);
    
    const results = await scrapeFundingData(outlets);
    
    return NextResponse.json({ 
      success: true,
      results,
      message: `Updated funding for ${results.filter(r => r.success).length} outlets`
    });
    
  } catch (error) {
    console.error('[v0] Funding API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
