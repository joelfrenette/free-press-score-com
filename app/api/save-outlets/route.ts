import { NextResponse } from "next/server"
import { saveOutletsToBlob } from "@/lib/blob-storage"
import type { MediaOutlet } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const { outlets } = (await request.json()) as { outlets: MediaOutlet[] }

    if (!outlets || !Array.isArray(outlets)) {
      return NextResponse.json({ success: false, error: "Invalid outlets data" }, { status: 400 })
    }

    const result = await saveOutletsToBlob(outlets)

    if (result.success) {
      return NextResponse.json({ success: true, url: result.url })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Error in save-outlets API:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
