import { NextResponse } from "next/server"
import { findAllDuplicates, removeDuplicates, getOutletCount, loadOutlets, saveOutlets } from "@/lib/media-outlet-data"

export const dynamic = "force-dynamic"
export const revalidate = 0

// GET - Find all duplicates
export async function GET() {
  try {
    await loadOutlets()

    console.log("[v0] Scanning for duplicates...")
    const duplicates = findAllDuplicates()
    console.log(`[v0] Found ${duplicates.length} duplicate groups`)

    return NextResponse.json({
      success: true,
      duplicates,
      totalDuplicateGroups: duplicates.length,
      totalDuplicateEntries: duplicates.reduce((sum, d) => sum + d.count - 1, 0),
    })
  } catch (error) {
    console.error("[v0] Find duplicates error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to find duplicates" },
      { status: 500 },
    )
  }
}

// POST - Merge (remove) all duplicates
export async function POST() {
  try {
    await loadOutlets()

    console.log("[v0] Starting duplicate removal...")
    const beforeCount = getOutletCount()
    const result = removeDuplicates()
    const afterCount = getOutletCount()

    await saveOutlets()

    console.log(
      `[v0] Duplicate removal complete. Before: ${beforeCount}, After: ${afterCount}, Removed: ${result.removed}`,
    )

    return NextResponse.json({
      success: true,
      removed: result.removed,
      duplicatesFound: result.duplicatesFound,
      beforeCount,
      afterCount,
      message: `Removed ${result.removed} duplicate entries`,
    })
  } catch (error) {
    console.error("[v0] Remove duplicates error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove duplicates" },
      { status: 500 },
    )
  }
}
