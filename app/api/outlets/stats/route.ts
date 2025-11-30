import { NextResponse } from "next/server"
import { mediaOutlets, getOutletCount, loadOutlets } from "@/lib/media-outlet-data"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  await loadOutlets()

  const totalOutlets = getOutletCount()

  const scrapableOutlets = mediaOutlets
    .filter((o) => o.website && o.website !== "N/A")
    .map((outlet) => ({
      id: outlet.id,
      name: outlet.name,
      platform: outlet.platform,
      outletType: outlet.type,
      country: outlet.country,
      mediaType: outlet.type,
    }))

  return NextResponse.json({
    totalOutlets,
    scrapable: scrapableOutlets.length,
    scrapableOutlets, // Include full list for dialogs
    lastUpdated: new Date().toISOString(),
  })
}
