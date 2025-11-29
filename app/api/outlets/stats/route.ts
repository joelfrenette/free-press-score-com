import { NextResponse } from "next/server"
import { mediaOutlets, getOutletCount, loadOutlets } from "@/lib/mock-data"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  await loadOutlets()

  const totalOutlets = getOutletCount()
  const scrapable = mediaOutlets.filter((o) => o.website && o.website !== "N/A").length

  return NextResponse.json({
    totalOutlets,
    scrapable,
    lastUpdated: new Date().toISOString(),
  })
}
