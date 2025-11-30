import { searchWithSERP, callAIWithCascade, parseJSONFromResponse } from "@/lib/data-scraping"
import { getOutlets, updateOutlet } from "@/lib/media-outlet-data"

export async function POST(request: Request) {
  const { outlets: requestedOutlets, outletIds, stream = true } = await request.json()

  // Get all outlets that need updating
  const allOutlets = getOutlets()

  let outlets
  if (requestedOutlets && Array.isArray(requestedOutlets) && requestedOutlets.length > 0) {
    // Client sent full outlet objects - extract IDs and filter
    const requestedIds = requestedOutlets.map((o: any) => o.id)
    outlets = allOutlets.filter((o) => requestedIds.includes(o.id))
    console.log(`[v0] Legal: Received ${requestedOutlets.length} outlets from client, matched ${outlets.length}`)
  } else if (outletIds && Array.isArray(outletIds) && outletIds.length > 0) {
    // Legacy: Client sent array of IDs
    outlets = allOutlets.filter((o) => outletIds.includes(o.id))
    console.log(`[v0] Legal: Received ${outletIds.length} outlet IDs, matched ${outlets.length}`)
  } else {
    // Fallback: process all scrapable outlets
    outlets = allOutlets.filter((o) => o.isScrapable !== false)
    console.log(`[v0] Legal: No outlets specified, processing all ${outlets.length} scrapable outlets`)
  }

  const systemPrompt = `You are a legal researcher specializing in media law. Research and return factual legal cases involving media outlets. Only include verified cases.`

  if (stream) {
    // Use SSE for streaming progress updates
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        console.log(`[v0] Starting legal cases research for ${outlets.length} outlets (SSE)...`)

        const results: Array<{ outletId: string; success: boolean; data?: any; error?: string }> = []

        for (let i = 0; i < outlets.length; i++) {
          const outlet = outlets[i]

          try {
            // Search for legal cases
            let scrapedContext = ""
            const serpResults = await searchWithSERP(`${outlet.name} lawsuit defamation legal case settlement`)
            if (serpResults && serpResults.length > 0) {
              scrapedContext = `\n\nSearch results about legal cases: ${serpResults
                .slice(0, 5)
                .map((r: any) => `${r.title}: ${r.snippet}`)
                .join("; ")}`
            }

            const prompt = `Research REAL, VERIFIED legal cases involving "${outlet.name}" media outlet. Only include actual cases you are certain exist. Find:
1. Defamation or libel lawsuits (won, lost, settled)
2. FCC violations or complaints
3. Copyright infringement cases
4. Privacy violation lawsuits
5. Retractions ordered by courts
6. Notable settlements

IMPORTANT: Only include real cases with verifiable details. If you don't know of any real cases, return empty arrays.
${scrapedContext}

Return as JSON:
{
  "defamationCases": [{"year": 2023, "plaintiff": "...", "outcome": "won|lost|settled", "amount": "...", "summary": "..."}],
  "fccViolations": [{"year": 2023, "type": "...", "fine": "...", "details": "..."}],
  "copyrightCases": [{"year": 2023, "details": "..."}],
  "privacyCases": [{"year": 2023, "details": "..."}],
  "courtOrderedRetractions": 0,
  "totalSettlements": "$XXM",
  "legalRiskScore": "high|medium|low",
  "confidence": "high|medium|low",
  "sources": ["URLs or sources for verification"]
}`

            const response = await callAIWithCascade(prompt, systemPrompt)

            if (response) {
              const parsed = parseJSONFromResponse(response)
              if (parsed) {
                // Update the outlet in the database
                updateOutlet(outlet.id, {
                  legalCases: parsed,
                })

                const result = {
                  outletId: outlet.id,
                  success: true,
                  data: parsed,
                }
                results.push(result)

                sendEvent({
                  type: "progress",
                  current: i + 1,
                  total: outlets.length,
                  outletName: outlet.name,
                  success: true,
                  result,
                })
              } else {
                const result = {
                  outletId: outlet.id,
                  success: false,
                  error: "Failed to parse AI response",
                }
                results.push(result)

                sendEvent({
                  type: "progress",
                  current: i + 1,
                  total: outlets.length,
                  outletName: outlet.name,
                  success: false,
                  result,
                })
              }
            } else {
              const result = {
                outletId: outlet.id,
                success: false,
                error: "No AI response",
              }
              results.push(result)

              sendEvent({
                type: "progress",
                current: i + 1,
                total: outlets.length,
                outletName: outlet.name,
                success: false,
                result,
              })
            }
          } catch (error) {
            const result = {
              outletId: outlet.id,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            }
            results.push(result)

            sendEvent({
              type: "progress",
              current: i + 1,
              total: outlets.length,
              outletName: outlet.name,
              success: false,
              result,
            })
          }
        }

        // Send completion event
        sendEvent({
          type: "complete",
          results,
          totalProcessed: results.length,
          totalSuccess: results.filter((r) => r.success).length,
          totalFailed: results.filter((r) => !r.success).length,
        })

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

  // Non-streaming fallback
  const results: Array<{ outletId: string; success: boolean; data?: any; error?: string }> = []

  for (const outlet of outlets) {
    try {
      let scrapedContext = ""
      const serpResults = await searchWithSERP(`${outlet.name} lawsuit defamation legal case settlement`)
      if (serpResults && serpResults.length > 0) {
        scrapedContext = `\n\nSearch results about legal cases: ${serpResults
          .slice(0, 5)
          .map((r: any) => `${r.title}: ${r.snippet}`)
          .join("; ")}`
      }

      const prompt = `Research legal cases for "${outlet.name}".${scrapedContext} Return as JSON with defamationCases, fccViolations, etc.`
      const response = await callAIWithCascade(prompt, systemPrompt)

      if (response) {
        const parsed = parseJSONFromResponse(response)
        if (parsed) {
          updateOutlet(outlet.id, { legalCases: parsed })
          results.push({ outletId: outlet.id, success: true, data: parsed })
        } else {
          results.push({ outletId: outlet.id, success: false, error: "Failed to parse" })
        }
      } else {
        results.push({ outletId: outlet.id, success: false, error: "No AI response" })
      }
    } catch (error) {
      results.push({
        outletId: outlet.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      results,
      message: `Researched legal cases for ${results.filter((r) => r.success).length} outlets`,
    }),
    { headers: { "Content-Type": "application/json" } },
  )
}
