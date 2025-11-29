import { NextResponse } from "next/server"
import { findAllDuplicates, removeDuplicates } from "@/lib/mock-data"

export const dynamic = "force-dynamic"
export const revalidate = 0

// GET - Find all duplicates
export async function GET() {
  try {
    const duplicates = findAllDuplicates()
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
    const result = removeDuplicates()
    return NextResponse.json({
      success: true,
      removed: result.removed,
      duplicatesFound: result.duplicatesFound,
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
