import { searchImagesWithSERP } from "@/lib/data-scraping"
import { loadOutletsFromBlob, saveOutletsToBlob } from "@/lib/blob-storage"
import type { MediaOutlet } from "@/lib/types"

export const maxDuration = 60

export async function POST(request: Request) {
  const { outletIds } = await request.json()

  const encoder = new TextEncoder()
  let controllerClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        if (controllerClosed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          controllerClosed = true
        }
      }

      let successCount = 0
      let failedCount = 0
      let totalOutlets = 0
      let allOutlets: MediaOutlet[] = []

      try {
        const blobData = await loadOutletsFromBlob()
        allOutlets = blobData?.outlets || []

        if (!allOutlets.length) {
          sendEvent({
            type: "complete",
            totalProcessed: 0,
            totalSuccess: 0,
            totalFailed: 0,
            message: "No outlets found in storage",
          })
          controller.close()
          return
        }

        const outletsToProcess = outletIds?.length ? allOutlets.filter((o) => outletIds.includes(o.id)) : allOutlets

        totalOutlets = outletsToProcess.length

        const BATCH_SIZE = 10
        const updatedOutletsMap = new Map<string, MediaOutlet>()

        for (let i = 0; i < outletsToProcess.length; i++) {
          const outlet = outletsToProcess[i]

          try {
            let newLogoUrl: string | null = null

            // Try SERP Images API first
            const images = await searchImagesWithSERP(`${outlet.name} official logo transparent png`, { num: 5 })

            if (images && images.length > 0) {
              // Try to find a valid image
              for (const image of images) {
                // Prefer thumbnails (hosted by Google, always accessible)
                if (image.thumbnail) {
                  newLogoUrl = image.thumbnail
                  break
                }
                // Fall back to original if no blocked domains
                const blockedDomains = ["seeklogo.com", "logowik.com", "brandlogos.net", "logopng.com"]
                const isBlocked = blockedDomains.some((domain) => image.original?.includes(domain))
                if (!isBlocked && image.original) {
                  newLogoUrl = image.original
                  break
                }
              }
            }

            // Fallback to Clearbit Logo API
            if (!newLogoUrl && outlet.website) {
              try {
                const domain = new URL(outlet.website).hostname.replace("www.", "")
                const clearbitUrl = `https://logo.clearbit.com/${domain}`
                const response = await fetch(clearbitUrl, { method: "HEAD", signal: AbortSignal.timeout(3000) })
                if (response.ok) {
                  newLogoUrl = clearbitUrl
                }
              } catch {
                // Clearbit failed, continue to next fallback
              }
            }

            // Fallback to Google Favicon
            if (!newLogoUrl && outlet.website) {
              try {
                const domain = new URL(outlet.website).hostname
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
                const response = await fetch(faviconUrl, { method: "HEAD", signal: AbortSignal.timeout(3000) })
                if (response.ok) {
                  newLogoUrl = faviconUrl
                }
              } catch {
                // Favicon failed
              }
            }

            if (newLogoUrl) {
              successCount++
              const updatedOutlet = { ...outlet, logo: newLogoUrl }
              updatedOutletsMap.set(outlet.id, updatedOutlet)

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
                  logoUrl: newLogoUrl,
                },
              })
            } else {
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

          if (updatedOutletsMap.size > 0 && (i + 1) % BATCH_SIZE === 0) {
            try {
              const currentOutlets = allOutlets.map((o) => updatedOutletsMap.get(o.id) || o)
              await saveOutletsToBlob(currentOutlets)
              // Update allOutlets with saved changes
              allOutlets = currentOutlets
            } catch (saveError) {
              console.error("[v0] Batch save error (non-fatal):", saveError)
            }
          }
        }

        if (updatedOutletsMap.size > 0) {
          try {
            const finalOutlets = allOutlets.map((o) => updatedOutletsMap.get(o.id) || o)
            await saveOutletsToBlob(finalOutlets)
          } catch (saveError) {
            console.error("[v0] Final save error (non-fatal):", saveError)
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
        await new Promise((resolve) => setTimeout(resolve, 100))
        try {
          if (!controllerClosed) {
            controller.close()
          }
        } catch {
          // Already closed
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
