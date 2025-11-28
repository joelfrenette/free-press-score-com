import { type NextRequest, NextResponse } from "next/server"
import { discoverNewOutlets } from "@/lib/data-scraping"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const filters = body.filters || {}

    console.log("[v0] Starting discover new outlets operation with filters:", filters)

    const results = await discoverNewOutlets(filters)

    return NextResponse.json({
      success: true,
      results,
      message: `Discovered ${results.length} potential outlets`,
    })
  } catch (error) {
    console.error("[v0] Discover API error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
