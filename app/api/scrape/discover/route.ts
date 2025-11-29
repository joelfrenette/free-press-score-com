import { type NextRequest, NextResponse } from "next/server"
import { discoverNewOutlets } from "@/lib/data-scraping"
import { loadOutlets, saveOutlets } from "@/lib/mock-data"

export async function POST(request: NextRequest) {
  try {
    await loadOutlets()

    const body = await request.json().catch(() => ({}))
    const filters = body.filters || {}

    console.log("[v0] Starting discover new outlets operation with filters:", filters)

    const results = await discoverNewOutlets(filters)

    if (results.some((r) => r.status === "added")) {
      await saveOutlets()
    }

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
