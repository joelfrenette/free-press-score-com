import { NextResponse } from "next/server"
import { getOutletCount, mediaOutlets, loadOutlets } from "@/lib/media-outlet-data"

// Disable caching for this route
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    await loadOutlets()

    const count = getOutletCount()
    console.log("[v0] API /outlets/count returning:", count, "outlets. Array length:", mediaOutlets.length)
    return NextResponse.json({ count })
  } catch (error) {
    console.error("[v0] Error getting outlet count:", error)
    return NextResponse.json({ count: 0 }, { status: 500 })
  }
}
