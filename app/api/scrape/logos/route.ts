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

        const updatedOutletsMap = new Map<string, MediaOutlet>()

        for (let i = 0; i < outletsToProcess.length; i++) {
          const outlet = outletsToProcess[i]

          try {
            let newLogoUrl: string | null = null

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

            if (!newLogoUrl) {
              try {
                const images = await searchImagesWithSERP(`${outlet.name} official logo transparent png`, { num: 3 })

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
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
                // Don't validate favicon - Google always returns something
                newLogoUrl = faviconUrl
              } catch {
                // Favicon URL generation failed
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
        }

        sendEvent({
          type: "complete",
          totalProcessed: totalOutlets,
          totalSuccess: successCount,
          totalFailed: failedCount,
          message: `Logo update complete: ${successCount} updated, ${failedCount} failed`,
        })

        if (updatedOutletsMap.size > 0) {
          try {
            const finalOutlets = allOutlets.map((o) => updatedOutletsMap.get(o.id) || o)
            await saveOutletsToBlob(finalOutlets)
          } catch (saveError) {
            console.error("[v0] Final save error:", saveError)
          }
        }
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
