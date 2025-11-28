import { NextRequest, NextResponse } from 'next/server';
import { discoverNewOutlets } from '@/lib/data-scraping';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SCRAPINGBEE_API_KEY) {
      return NextResponse.json(
        { error: 'ScrapingBee API key not configured' },
        { status: 500 }
      );
    }

    console.log('[v0] Starting discover new outlets operation...');
    
    const results = await discoverNewOutlets();
    
    return NextResponse.json({ 
      success: true,
      results,
      message: `Discovered ${results.length} potential outlets`
    });
    
  } catch (error) {
    console.error('[v0] Discover API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
