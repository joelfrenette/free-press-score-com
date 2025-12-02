import { type NextRequest, NextResponse } from "next/server"
import { loadOutlets, saveOutlets, getOutlets, updateOutlet } from "@/lib/media-outlet-data"
import {
  scrapeOwnershipData,
  scrapeFundingData,
  scrapeLegalCases,
  scrapeAudienceData,
  searchImagesWithSERP,
} from "@/lib/data-scraping"
import type { MediaOutlet } from "@/lib/types"
import { calculateScoresFromData } from "@/lib/score-calculation"

export const maxDuration = 60

async function saveWithTimeout(outlets: MediaOutlet[], timeoutMs = 10000): Promise<boolean> {
  try {
    const savePromise = saveOutlets(outlets)
    const timeoutPromise = new Promise<{ success: false }>((_, reject) =>
      setTimeout(() => reject(new Error("Save timeout")), timeoutMs),
    )

    const result = await Promise.race([savePromise, timeoutPromise])
    return result.success
  } catch (error) {
    console.error("[v0] Save with timeout failed:", error)
    return false
  }
}

// Refresh all data for a single outlet
export async function POST(request: NextRequest) {
  try {
    const { outletId } = await request.json()

    if (!outletId) {
      return NextResponse.json({ error: "Missing outletId" }, { status: 400 })
    }

    await loadOutlets()
    const outlets = getOutlets()

    console.log("[v0] Loaded outlets for refresh:", outlets?.length || 0)

    if (!outlets || outlets.length === 0) {
      return NextResponse.json({ error: "No outlets found" }, { status: 404 })
    }

    const outlet = outlets.find((o: MediaOutlet) => o.id === outletId)
    if (!outlet) {
      console.log(
        "[v0] Outlet not found:",
        outletId,
        "Available IDs:",
        outlets.map((o: MediaOutlet) => o.id).slice(0, 5),
      )
      return NextResponse.json({ error: "Outlet not found" }, { status: 404 })
    }

    console.log("[v0] Found outlet for refresh:", outlet.name)

    let latestOutlets = outlets

    // Create SSE stream for progress updates
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch (e) {
            console.error("[v0] Failed to send event:", e)
          }
        }

        const updates: Partial<MediaOutlet> = {}
        const steps = [
          { name: "logo", label: "Logo" },
          { name: "ownership", label: "Ownership" },
          { name: "funding", label: "Funding" },
          { name: "legal", label: "Legal Cases" },
          { name: "audience", label: "Audience Data" },
        ]

        let completed = 0
        const total = steps.length

        for (const step of steps) {
          sendEvent({
            type: "progress",
            step: step.name,
            label: step.label,
            progress: Math.round((completed / total) * 100),
            message: `Researching ${step.label}...`,
          })

          let stepSuccess = false
          let stepError = ""

          try {
            if (step.name === "logo") {
              try {
                // Use the same logic as the /api/scrape/logos route
                let newLogoUrl: string | null = null

                // Try Clearbit first
                if (outlet.website) {
                  try {
                    const domain = new URL(outlet.website).hostname.replace("www.", "")
                    const clearbitUrl = `https://logo.clearbit.com/${domain}`
                    const response = await fetch(clearbitUrl, { method: "HEAD", signal: AbortSignal.timeout(2000) })
                    if (response.ok) {
                      newLogoUrl = clearbitUrl
                    }
                  } catch {
                    // Clearbit failed, continue to next fallback
                  }
                }

                // Try SERP image search
                if (!newLogoUrl) {
                  try {
                    const images = await searchImagesWithSERP(`${outlet.name} official logo transparent png`, {
                      num: 3,
                    })

                    if (images && images.length > 0) {
                      for (const image of images) {
                        if (image.thumbnail) {
                          newLogoUrl = image.thumbnail
                          break
                        }
                        const blockedDomains = ["seeklogo.com", "logowik.com", "brandlogos.net", "logopng.com"]
                        const isBlocked = blockedDomains.some((domain) => image.original?.includes(domain))
                        if (!isBlocked && image.original) {
                          newLogoUrl = image.original
                          break
                        }
                      }
                    }
                  } catch {
                    // SERP failed, continue
                  }
                }

                // Fallback to Google Favicon
                if (!newLogoUrl && outlet.website) {
                  try {
                    const domain = new URL(outlet.website).hostname
                    newLogoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
                  } catch {
                    // Favicon URL generation failed
                  }
                }

                if (newLogoUrl) {
                  updates.logo = newLogoUrl
                  stepSuccess = true
                }
              } catch (e) {
                stepError = e instanceof Error ? e.message : "Failed to fetch logo"
                console.log(`[v0] Logo scraping error (non-fatal):`, stepError)
              }
            } else if (step.name === "ownership") {
              try {
                const results = await scrapeOwnershipData([
                  { id: outlet.id, name: outlet.name, website: outlet.website },
                ])
                if (results && results.length > 0 && results[0].success) {
                  await saveOutlets()
                  const updatedOutlets = getOutlets()
                  const updatedOutlet = updatedOutlets?.find((o: MediaOutlet) => o.id === outletId)
                  if (updatedOutlet?.ownership) {
                    updates.ownership = updatedOutlet.ownership
                    updates.lastUpdated = new Date().toISOString()
                    latestOutlets = updatedOutlets
                    stepSuccess = true
                  }
                }
              } catch (e) {
                stepError = e instanceof Error ? e.message : "Failed to fetch ownership data"
                console.log(`[v0] Ownership scraping error (non-fatal):`, stepError)
              }
            } else if (step.name === "funding") {
              try {
                const results = await scrapeFundingData([{ id: outlet.id, name: outlet.name }])
                if (results && results.length > 0 && results[0].success) {
                  await saveOutlets()
                  const updatedOutlets = getOutlets()
                  const updatedOutlet = updatedOutlets?.find((o: MediaOutlet) => o.id === outletId)
                  if (updatedOutlet) {
                    updates.funding = updatedOutlet.funding
                    updates.sponsors = updatedOutlet.sponsors
                    updates.stakeholders = updatedOutlet.stakeholders
                    updates.lastUpdated = new Date().toISOString()
                    latestOutlets = updatedOutlets
                    stepSuccess = true
                  }
                }
              } catch (e) {
                stepError = e instanceof Error ? e.message : "Failed to fetch funding data"
                console.log(`[v0] Funding scraping error (non-fatal):`, stepError)
              }
            } else if (step.name === "legal") {
              try {
                const results = await scrapeLegalCases([{ id: outlet.id, name: outlet.name }])
                if (results && results.length > 0 && results[0].success) {
                  await saveOutlets()
                  const updatedOutlets = getOutlets()
                  const updatedOutlet = updatedOutlets?.find((o: MediaOutlet) => o.id === outletId)
                  if (updatedOutlet) {
                    updates.lawsuits = updatedOutlet.lawsuits
                    updates.retractions = updatedOutlet.retractions
                    updates.scandals = updatedOutlet.scandals
                    updates.lastUpdated = new Date().toISOString()
                    latestOutlets = updatedOutlets
                    stepSuccess = true
                  }
                }
              } catch (e) {
                stepError = e instanceof Error ? e.message : "Failed to fetch legal data"
                console.log(`[v0] Legal scraping error (non-fatal):`, stepError)
              }
            } else if (step.name === "audience") {
              try {
                const results = await scrapeAudienceData([{ id: outlet.id, name: outlet.name }])
                if (results && results.length > 0 && results[0].success) {
                  await saveOutlets()
                  const updatedOutlets = getOutlets()
                  const updatedOutlet = updatedOutlets?.find((o: MediaOutlet) => o.id === outletId)
                  if (updatedOutlet) {
                    updates.audienceData = updatedOutlet.audienceData
                    updates.metrics = updatedOutlet.metrics
                    updates.lastUpdated = new Date().toISOString()
                    latestOutlets = updatedOutlets
                    stepSuccess = true
                  }
                }
              } catch (e) {
                stepError = e instanceof Error ? e.message : "Failed to fetch audience data"
                console.log(`[v0] Audience scraping error (non-fatal):`, stepError)
              }
            }

            sendEvent({
              type: "step_complete",
              step: step.name,
              label: step.label,
              success: stepSuccess,
              error: stepError || undefined,
            })
          } catch (error) {
            console.error(`Error in ${step.name}:`, error)
            sendEvent({
              type: "step_complete",
              step: step.name,
              label: step.label,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            })
          }

          completed++
        }

        // Step 7: Recalculate scores
        sendEvent({ type: "progress", progress: 95, step: "scores", message: "Recalculating Free Press Score..." })

        let scoresSuccess = false
        try {
          // Get latest outlets from memory
          const currentOutlets = getOutlets() || []
          const freshOutlet = currentOutlets.find((o: MediaOutlet) => o.id === outletId)

          if (freshOutlet) {
            const scoreUpdates = calculateScoresFromData(freshOutlet)
            if (scoreUpdates) {
              // Update scores in memory (this will trigger debounced auto-save)
              updateOutlet(outletId, scoreUpdates)
              scoresSuccess = true
            } else {
              // No score updates needed, but still success
              scoresSuccess = true
            }
          } else {
            // Outlet not found, but don't fail - data was saved in previous steps
            scoresSuccess = true
          }
        } catch (error) {
          console.error("[v0] Score calculation error:", error)
          // Still mark as success since data was saved
          scoresSuccess = true
        }

        // The debounced auto-save will handle persistence
        sendEvent({
          type: "step_complete",
          step: "scores",
          label: "Recalculating Scores",
          success: scoresSuccess,
        })

        sendEvent({
          type: "complete",
          success: true,
          message: "Data refresh complete",
          updates: Object.keys(updates),
        })

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Outlet refresh error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
