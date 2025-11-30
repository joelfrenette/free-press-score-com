import { loadOutlets, getOutlets } from "@/lib/media-outlet-data"
import { checkScrapingBeeApiKey } from "@/lib/admin-actions"
import { AdminDashboardClient } from "@/components/admin-dashboard-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminPage() {
  const hasApiKey = await checkScrapingBeeApiKey()

  await loadOutlets()
  const allOutlets = getOutlets()

  const scrapableOutlets = allOutlets
    .filter((outlet) => outlet.website || outlet.platform)
    .map((outlet) => ({
      id: outlet.id,
      name: outlet.name,
      platform: outlet.platform,
      outletType: outlet.outletType,
      country: outlet.country,
      mediaType: outlet.metrics?.type || "unknown",
    }))

  return (
    <main className="min-h-screen bg-background">
      <AdminDashboardClient
        hasApiKey={hasApiKey}
        totalOutlets={allOutlets.length}
        scrapableOutlets={scrapableOutlets}
      />
    </main>
  )
}
