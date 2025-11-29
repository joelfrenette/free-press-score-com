import { mediaOutlets } from "@/lib/mock-data"
import { checkScrapingBeeApiKey } from "@/lib/admin-actions"
import { AdminDashboardClient } from "@/components/admin-dashboard-client"

export default async function AdminPage() {
  const hasApiKey = await checkScrapingBeeApiKey()

  const scrapableOutlets = mediaOutlets
    .filter((outlet) => outlet.website || outlet.platform)
    .map((outlet) => ({
      id: outlet.id,
      name: outlet.name,
      platform: outlet.platform,
      outletType: outlet.outletType,
      country: outlet.country,
      mediaType: outlet.metrics?.type || "unknown", // Extract media type for filtering
    }))

  return (
    <main className="min-h-screen bg-background">
      <AdminDashboardClient
        hasApiKey={hasApiKey}
        totalOutlets={mediaOutlets.length}
        scrapableOutlets={scrapableOutlets}
      />
    </main>
  )
}
