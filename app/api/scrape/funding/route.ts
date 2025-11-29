import type { NextRequest } from "next/server"
import { scrapeFundingData } from "@/lib/data-scraping"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SCRAPINGBEE_API_KEY) {
      return new Response(JSON.stringify({ error: "ScrapingBee API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body = await request.json()
    const { outlets, stream } = body

    if (!outlets || !Array.isArray(outlets)) {
      return new Response(JSON.stringify({ error: "outlets array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log(`[v0] Starting funding scrape for ${outlets.length} outlets...`)

    if (stream) {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          const results: Array<{ outletId: string; success: boolean; error?: string }> = []

          for (let i = 0; i < outlets.length; i++) {
            const outlet = outlets[i]
            try {
              // Process single outlet
              const singleResult = await scrapeFundingData([outlet])
              const result = singleResult[0] || { outletId: outlet.id, success: false, error: "No result" }
              results.push(result)

              // Send progress update
              const progress = {
                type: "progress",
                current: i + 1,
                total: outlets.length,
                outletName: outlet.name,
                success: result.success,
                result,
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`))
            } catch (error) {
              const errorResult = {
                outletId: outlet.id,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              }
              results.push(errorResult)

              // Send error progress update
              const progress = {
                type: "progress",
                current: i + 1,
                total: outlets.length,
                outletName: outlet.name,
                success: false,
                result: errorResult,
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`))
            }
          }

          // Send final completion message
          const completion = {
            type: "complete",
            results,
            totalProcessed: results.length,
            totalSuccess: results.filter((r) => r.success).length,
            totalFailed: results.filter((r) => !r.success).length,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completion)}\n\n`))
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    // Non-streaming fallback (original behavior)
    const results = await scrapeFundingData(outlets)

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Updated funding for ${results.filter((r) => r.success).length} outlets`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("[v0] Funding API error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
