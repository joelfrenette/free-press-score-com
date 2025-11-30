import { getOutlets, updateOutlet } from "@/lib/media-outlet-data"
import { callAIWithCascade, parseJSONFromResponse } from "@/lib/data-scraping"

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { outlets: requestedOutlets, stream = true } = await request.json()

    // Get all outlets from data source
    const allOutlets = getOutlets()

    // Determine which outlets to process
    let outletsToProcess: Array<{ id: string; name: string; url?: string; platform?: string }>

    if (requestedOutlets && Array.isArray(requestedOutlets) && requestedOutlets.length > 0) {
      // If outlets array is provided from client, use those IDs to filter
      const requestedIds = new Set(requestedOutlets.map((o: any) => o.id))
      outletsToProcess = allOutlets
        .filter((o) => requestedIds.has(o.id))
        .map((o) => ({
          id: o.id,
          name: o.name,
          url: o.website,
          platform: o.metrics?.type,
        }))
    } else {
      // Fallback: process all scrapable outlets
      outletsToProcess = allOutlets
        .filter((o) => o.scrapable !== false)
        .map((o) => ({
          id: o.id,
          name: o.name,
          url: o.website,
          platform: o.metrics?.type,
        }))
    }

    if (!stream) {
      // Non-streaming response (legacy support)
      const results = await scrapeAudienceDataBatch(outletsToProcess)
      return Response.json({ success: true, results })
    }

    // SSE streaming response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const total = outletsToProcess.length
        let processed = 0
        let successCount = 0
        let failedCount = 0
        const results: any[] = []

        const systemPrompt = `You are a media analytics expert. Provide accurate audience and viewership data for media outlets based on publicly available information.`

        for (const outlet of outletsToProcess) {
          processed++

          const prompt = `Research current audience metrics for "${outlet.name}" media outlet. Find:
1. Monthly unique visitors (website)
2. TV ratings/viewership (if applicable)
3. Social media followers (Twitter, Facebook, YouTube, Instagram)
4. Podcast downloads (if applicable)
5. Print circulation (if applicable)
6. Subscriber count (if applicable)
7. Year-over-year growth trend

Return as JSON:
{
  "monthlyVisitors": 10000000,
  "tvViewership": {"averageViewers": 1000000, "peakViewers": 2000000, "share": "1.5%"},
  "socialMedia": {
    "twitter": 5000000,
    "facebook": 3000000,
    "youtube": 2000000,
    "instagram": 1000000,
    "tiktok": 500000
  },
  "podcastDownloads": 100000,
  "printCirculation": 500000,
  "subscribers": {"paid": 100000, "free": 500000},
  "totalReach": 15000000,
  "growthTrend": "growing|stable|declining",
  "lastUpdated": "2024",
  "confidence": "high|medium|low"
}`

          let success = false
          let resultData = null
          let error = null

          try {
            const response = await callAIWithCascade(prompt, systemPrompt)
            if (response) {
              const parsed = parseJSONFromResponse(response)
              if (parsed) {
                // Calculate total audience
                const totalAudience =
                  parsed.totalReach ||
                  (parsed.monthlyVisitors || 0) +
                    (parsed.tvViewership?.averageViewers || 0) +
                    Object.values(parsed.socialMedia || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)

                // Update the outlet in the database
                updateOutlet(outlet.id, {
                  audienceSize: totalAudience,
                  audienceData: parsed,
                })

                success = true
                successCount++
                resultData = parsed
                console.log(`[v0] Updated audience for ${outlet.name}: ${totalAudience.toLocaleString()}`)
              } else {
                failedCount++
                error = "Failed to parse AI response"
              }
            } else {
              failedCount++
              error = "No response from AI"
            }
          } catch (err) {
            failedCount++
            error = err instanceof Error ? err.message : "Unknown error"
            console.error(`[v0] Error updating audience for ${outlet.name}:`, error)
          }

          results.push({
            outletId: outlet.id,
            success,
            data: resultData,
            error,
          })

          // Send progress event
          const progressEvent = {
            type: "progress",
            current: processed,
            total,
            outletName: outlet.name,
            success,
            result: {
              outletId: outlet.id,
              success,
              data: resultData,
              error,
            },
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`))
        }

        // Send completion event
        const completeEvent = {
          type: "complete",
          success: true,
          results,
          totalProcessed: total,
          totalSuccess: successCount,
          totalFailed: failedCount,
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`))
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
  } catch (error) {
    console.error("[v0] Error in audience scraping:", error)
    return Response.json({ success: false, error: "Failed to scrape audience data" }, { status: 500 })
  }
}

// Non-streaming batch function
async function scrapeAudienceDataBatch(outlets: Array<{ id: string; name: string; url?: string; platform?: string }>) {
  const results: any[] = []
  const systemPrompt = `You are a media analytics expert. Provide accurate audience and viewership data for media outlets based on publicly available information.`

  for (const outlet of outlets) {
    const prompt = `Research current audience metrics for "${outlet.name}" media outlet. Return as JSON with monthlyVisitors, tvViewership, socialMedia, podcastDownloads, printCirculation, subscribers, totalReach, growthTrend, lastUpdated, confidence.`

    try {
      const response = await callAIWithCascade(prompt, systemPrompt)
      if (response) {
        const parsed = parseJSONFromResponse(response)
        if (parsed) {
          const totalAudience =
            parsed.totalReach ||
            (parsed.monthlyVisitors || 0) +
              (parsed.tvViewership?.averageViewers || 0) +
              Object.values(parsed.socialMedia || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)

          updateOutlet(outlet.id, {
            audienceSize: totalAudience,
            audienceData: parsed,
          })

          results.push({ outletId: outlet.id, success: true, data: parsed })
        } else {
          results.push({ outletId: outlet.id, success: false, error: "Failed to parse response" })
        }
      } else {
        results.push({ outletId: outlet.id, success: false, error: "No AI response" })
      }
    } catch (err) {
      results.push({ outletId: outlet.id, success: false, error: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  return results
}
