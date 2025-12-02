import { mediaOutlets, loadOutlets } from "@/lib/media-outlet-data"
import { saveOutletsToSupabase } from "@/lib/supabase-storage"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  console.log("[v0] /api/outlets GET called")

  await loadOutlets()
  console.log("[v0] mediaOutlets.length after load:", mediaOutlets.length)

  const scrapableCount = mediaOutlets.filter((o) => o.website && o.website.length > 0).length

  console.log("[v0] Returning", mediaOutlets.length, "outlets to client")

  return NextResponse.json({
    outlets: mediaOutlets,
    total: mediaOutlets.length,
    scrapable: scrapableCount,
  })
}

export async function POST() {
  try {
    const success = await saveOutletsToSupabase(mediaOutlets)
    return NextResponse.json({
      success,
      total: mediaOutlets.length,
      error: success ? undefined : "Failed to save to Supabase",
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
