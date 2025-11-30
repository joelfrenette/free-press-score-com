import { mediaOutlets, loadOutlets, saveOutlets } from "@/lib/media-outlet-data"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  await loadOutlets()

  // Return fresh outlets data
  const scrapableCount = mediaOutlets.filter((o) => o.website && o.website.length > 0).length

  return NextResponse.json({
    outlets: mediaOutlets,
    total: mediaOutlets.length,
    scrapable: scrapableCount,
  })
}

export async function POST() {
  try {
    const result = await saveOutlets()
    return NextResponse.json({
      success: result.success,
      total: mediaOutlets.length,
      error: result.error,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
