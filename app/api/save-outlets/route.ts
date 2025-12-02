import { NextResponse } from "next/server"
import { saveOutletsToSupabase } from "@/lib/supabase-storage"
import type { MediaOutlet } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const { outlets } = (await request.json()) as { outlets: MediaOutlet[] }

    if (!outlets || !Array.isArray(outlets)) {
      return NextResponse.json({ success: false, error: "Invalid outlets data" }, { status: 400 })
    }

    const success = await saveOutletsToSupabase(outlets)

    if (success) {
      return NextResponse.json({ success: true, count: outlets.length })
    } else {
      return NextResponse.json({ success: false, error: "Failed to save to Supabase" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Error in save-outlets API:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
