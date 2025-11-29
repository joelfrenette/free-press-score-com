import { mediaOutlets } from "@/lib/mock-data"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  // Return fresh outlets data
  const scrapableCount = mediaOutlets.filter((o) => o.website && o.website.length > 0).length

  return NextResponse.json({
    outlets: mediaOutlets,
    total: mediaOutlets.length,
    scrapable: scrapableCount,
  })
}
