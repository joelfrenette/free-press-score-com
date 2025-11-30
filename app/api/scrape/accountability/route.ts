import type { NextRequest } from "next/server"
import { callAIWithCascade, parseJSONFromResponse } from "@/lib/data-scraping"
import { mediaOutlets, updateOutlet, getOutlets } from "@/lib/media-outlet-data"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { outlets, stream = true } = body

    // Get the outlets to process - either from request or fetch all scrapable
    let outletsToProcess: Array<{ id: string; name: string; website?: string }> = []

    if (outlets && Array.isArray(outlets) && outlets.length > 0) {
      // Client sent outlet objects - extract what we need
      const outletIds = outlets.map((o: any) => o.id || o)
      const allOutlets = getOutlets()
      outletsToProcess = allOutlets
        .filter((o) => outletIds.includes(o.id))
        .map((o) => ({ id: o.id, name: o.name, website: o.website }))
    }

    if (outletsToProcess.length === 0) {
      // Fallback: get all scrapable outlets
      outletsToProcess = mediaOutlets
        .filter((o) => o.outletType === "traditional" || o.outletType === "influencer")
        .map((o) => ({ id: o.id, name: o.name, website: o.website }))
    }

    const totalOutlets = outletsToProcess.length
    console.log(`[v0] Starting accountability scrape for ${totalOutlets} outlets (stream: ${stream})...`)

    // Use SSE streaming for real-time progress updates
    if (stream) {
      const encoder = new TextEncoder()
      let successCount = 0
      let failedCount = 0

      const readable = new ReadableStream({
        async start(controller) {
          const systemPrompt = `You are a journalism standards expert. Evaluate media outlets on their accountability practices, correction policies, and editorial standards.`

          for (let i = 0; i < outletsToProcess.length; i++) {
            const outlet = outletsToProcess[i]

            const prompt = `Evaluate the accountability and editorial standards of "${outlet.name}" media outlet. Research:
1. Correction/retraction policy (do they have one? Is it visible?)
2. Editorial standards or ethics code
3. Fact-checking practices
4. Response to criticism
5. Notable corrections or retractions
6. Industry awards for journalism
7. Press freedom/journalism organization memberships

Return as JSON:
{
  "correctionPolicy": {"exists": true, "visible": true, "url": "...", "quality": "high|medium|low"},
  "ethicsCode": {"exists": true, "details": "..."},
  "factChecking": {"hasTeam": true, "partnerships": ["..."]},
  "responseToCriticism": "transparent|defensive|dismissive|none",
  "notableCorrections": [{"year": 2023, "topic": "...", "details": "..."}],
  "journalismAwards": [{"year": 2023, "award": "...", "category": "..."}],
  "memberships": ["SPJ", "AP", etc],
  "accountabilityScore": "high|medium|low",
  "confidence": "high|medium|low"
}`

            let success = false
            let error: string | undefined

            try {
              const response = await callAIWithCascade(prompt, systemPrompt)
              if (response) {
                const parsed = parseJSONFromResponse(response)
                if (parsed) {
                  // Update the outlet in the database
                  const existingOutlet = mediaOutlets.find((o) => o.id === outlet.id)
                  if (existingOutlet) {
                    updateOutlet(outlet.id, {
                      accountability: {
                        corrections: parsed.correctionPolicy?.quality || "unknown",
                        details: `Correction policy: ${parsed.correctionPolicy?.exists ? "Yes" : "No"}. Ethics code: ${parsed.ethicsCode?.exists ? "Yes" : "No"}. Fact-checking: ${parsed.factChecking?.hasTeam ? "Has team" : "No dedicated team"}.`,
                        correctionPolicy: parsed.correctionPolicy,
                        ethicsCode: parsed.ethicsCode,
                        awards: parsed.journalismAwards,
                      },
                    })
                  }
                  success = true
                  successCount++
                  console.log(`[v0] Updated accountability for ${outlet.name}`)
                } else {
                  error = "Failed to parse AI response"
                  failedCount++
                }
              } else {
                error = "No AI response received"
                failedCount++
              }
            } catch (err) {
              error = err instanceof Error ? err.message : "Unknown error"
              failedCount++
              console.error(`[v0] Error scraping accountability for ${outlet.name}:`, error)
            }

            // Send progress event
            const progressData = {
              type: "progress",
              current: i + 1,
              total: totalOutlets,
              outletName: outlet.name,
              success,
              result: {
                outletId: outlet.id,
                success,
                error,
              },
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`))
          }

          // Send completion event
          const completeData = {
            type: "complete",
            success: successCount,
            failed: failedCount,
            total: totalOutlets,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`))
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

    // Non-streaming fallback (legacy support)
    const { scrapeAccountabilityData } = await import("@/lib/data-scraping")
    const results = await scrapeAccountabilityData(outletsToProcess)

    return Response.json({
      success: true,
      results,
      message: `Updated accountability for ${results.filter((r) => r.success).length} outlets`,
    })
  } catch (error) {
    console.error("[v0] Accountability API error:", error)
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
