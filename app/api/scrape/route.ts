import { NextRequest, NextResponse } from 'next/server';
import { scrapeOutletData, scrapeMultipleOutlets } from '@/lib/data-scraping';

// POST /api/scrape - Trigger a scrape for one or multiple outlets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if API key is configured
    if (!process.env.SCRAPINGBEE_API_KEY) {
      return NextResponse.json(
        { error: 'ScrapingBee API key not configured. Please add SCRAPINGBEE_API_KEY to environment variables.' },
        { status: 500 }
      );
    }
    
    // Single outlet scrape
    if (body.outletId && body.sourceUrl && body.platform) {
      const result = await scrapeOutletData(body.outletId, body.sourceUrl, body.platform);
      return NextResponse.json(result);
    }
    
    // Bulk scrape
    if (body.outlets && Array.isArray(body.outlets)) {
      const results = await scrapeMultipleOutlets(body.outlets);
      return NextResponse.json({ results });
    }
    
    return NextResponse.json(
      { error: 'Invalid request. Provide either outletId/sourceUrl/platform or outlets array.' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[v0] API scrape error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/scrape?outletId=xyz - Get scraping status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outletId');
    
    if (!outletId) {
      return NextResponse.json(
        { error: 'outletId parameter required' },
        { status: 400 }
      );
    }
    
    // This would fetch from database
    return NextResponse.json({
      outletId,
      lastScraped: new Date().toISOString(),
      status: 'completed',
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
