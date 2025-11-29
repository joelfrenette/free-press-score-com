import { loadOutletsFromBlob, saveOutletsToBlob } from "@/lib/blob-storage"
import { searchImagesWithSERP } from "@/lib/data-scraping"
import type { MediaOutlet } from "@/lib/types"

export const maxDuration = 60

export async function POST(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (e) {
          console.error("[v0] Failed to send event:", e)
        }
      }

      let successCount = 0
      let failedCount = 0
      let totalOutlets = 0

      try {
        const body = await request.json()
        const { outlets: requestedOutlets } = body

        const { outlets: allOutlets } = await loadOutletsFromBlob()

        if (!allOutlets) {
          sendEvent({ type: "error", error: "No outlets found in storage" })
          controller.close()
          return
        }

        // Filter to requested outlets if specified
        let outletsToProcess: MediaOutlet[] = []
        if (requestedOutlets && Array.isArray(requestedOutlets) && requestedOutlets.length > 0) {
          const requestedIds = new Set(requestedOutlets.map((o: MediaOutlet) => o.id))
          outletsToProcess = allOutlets.filter((o) => requestedIds.has(o.id))
        } else {
          outletsToProcess = allOutlets.filter((o) => o.scpiScore !== undefined)
        }

        totalOutlets = outletsToProcess.length

        // Send start event
        sendEvent({
          type: "start",
          total: totalOutlets,
          message: `Starting logo updates for ${totalOutlets} outlets`,
        })

        // Known blocked domains that return 403
        const blockedDomains = [
          "seeklogo.com",
          "logowik.com",
          "logos-world.net",
          "logopng.com",
          "pngitem.com",
          "nicepng.com",
          "clipartmax.com",
          "pngegg.com",
          "cleanpng.com",
          "freepnglogos.com",
          "pngfind.com",
          "pngwing.com",
        ]

        const updatedOutletsMap = new Map<string, MediaOutlet>()

        for (let i = 0; i < outletsToProcess.length; i++) {
          const outlet = outletsToProcess[i]

          try {
            let newLogoUrl: string | null = null
            let source = "none"

            // Try SERP Images API first
            if (process.env.SERP_API_KEY) {
              try {
                const images = await searchImagesWithSERP(`${outlet.name} official logo transparent png`, { num: 10 })

                if (images && images.length > 0) {
                  // Filter for images that look like logos
                  const logoImages = images.filter((img) => {
                    const titleLower = (img.title || "").toLowerCase()
                    const sourceLower = (img.source || "").toLowerCase()
                    const linkLower = (img.link || "").toLowerCase()
                    return titleLower.includes("logo") || sourceLower.includes("logo") || linkLower.includes("logo")
                  })

                  // Try to find a working image URL
                  const imagesToTry = logoImages.length > 0 ? logoImages : images.slice(0, 5)

                  for (const img of imagesToTry) {
                    // Prefer thumbnail as it's hosted on Google's servers
                    const urlToTry = img.thumbnail || img.original
                    if (!urlToTry) continue

                    // Skip blocked domains for original URLs
                    if (!img.thumbnail && blockedDomains.some((domain) => urlToTry.includes(domain))) {
                      continue
                    }

                    // Use the thumbnail directly (Google-hosted, always accessible)
                    if (img.thumbnail) {
                      newLogoUrl = img.thumbnail
                      source = "serp-images"
                      break
                    }
                  }
                }
              } catch {
                // SERP failed silently, try next source
              }
            }

            // Fallback to Clearbit Logo API
            if (!newLogoUrl && outlet.website) {
              try {
                const domain = new URL(outlet.website).hostname.replace("www.", "")
                const clearbitUrl = `https://logo.clearbit.com/${domain}`
                const response = await fetch(clearbitUrl, {
                  method: "HEAD",
                  signal: AbortSignal.timeout(5000),
                })
                if (response.ok) {
                  newLogoUrl = clearbitUrl
                  source = "clearbit"
                }
              } catch {
                // Clearbit failed, try next
              }
            }

            // Fallback to Google Favicon
            if (!newLogoUrl && outlet.website) {
              try {
                const domain = new URL(outlet.website).hostname
                newLogoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
                source = "google-favicon"
              } catch {
                // Google favicon failed
              }
            }

            if (newLogoUrl && newLogoUrl !== outlet.logo) {
              const updatedOutlet = { ...outlet, logo: newLogoUrl }
              updatedOutletsMap.set(outlet.id, updatedOutlet)
              successCount++

              sendEvent({
                type: "progress",
                current: i + 1,
                total: totalOutlets,
                outletId: outlet.id,
                outletName: outlet.name,
                success: true,
                result: {
                  outletId: outlet.id,
                  outletName: outlet.name,
                  success: true,
                  data: { logo: newLogoUrl, source },
                },
              })
            } else if (newLogoUrl) {
              // Logo unchanged
              successCount++
              sendEvent({
                type: "progress",
                current: i + 1,
                total: totalOutlets,
                outletId: outlet.id,
                outletName: outlet.name,
                success: true,
                result: {
                  outletId: outlet.id,
                  outletName: outlet.name,
                  success: true,
                  data: { logo: outlet.logo, source: "unchanged" },
                },
              })
            } else {
              // No logo found
              failedCount++
              sendEvent({
                type: "progress",
                current: i + 1,
                total: totalOutlets,
                outletId: outlet.id,
                outletName: outlet.name,
                success: false,
                result: {
                  outletId: outlet.id,
                  outletName: outlet.name,
                  success: false,
                  error: "No logo found",
                },
              })
            }
          } catch (error) {
            failedCount++

            sendEvent({
              type: "progress",
              current: i + 1,
              total: totalOutlets,
              outletId: outlet.id,
              outletName: outlet.name,
              success: false,
              result: {
                outletId: outlet.id,
                outletName: outlet.name,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
            })
          }
        }

        if (updatedOutletsMap.size > 0) {
          try {
            const finalOutlets = allOutlets.map((o) => updatedOutletsMap.get(o.id) || o)
            await Promise.race([
              saveOutletsToBlob(finalOutlets),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Blob save timeout")), 30000)),
            ])
          } catch (saveError) {
            console.error("[v0] Blob save error (non-fatal):", saveError)
            // Continue to send completion event even if save fails
          }
        }

        sendEvent({
          type: "complete",
          totalProcessed: totalOutlets,
          totalSuccess: successCount,
          totalFailed: failedCount,
          message: `Logo update complete: ${successCount} updated, ${failedCount} failed`,
        })
      } catch (error) {
        console.error("[v0] Update logos error:", error)
        sendEvent({
          type: "complete",
          totalProcessed: totalOutlets,
          totalSuccess: successCount,
          totalFailed: failedCount,
          message: `Logo update ended with error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 200))
        try {
          controller.close()
        } catch {
          // Controller may already be closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
