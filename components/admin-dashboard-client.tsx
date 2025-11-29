"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Search,
  Users,
  DollarSign,
  Scale,
  FileText,
  TrendingUp,
  Copy,
  ImageIcon,
} from "lucide-react"
import Link from "next/link"
import {
  DiscoverOutletsDialog,
  type DiscoveryFilters,
  type DiscoveryResults,
  type DiscoveredOutlet,
} from "./discover-outlets-dialog"
import { MergeDuplicatesDialog } from "./merge-duplicates-dialog"
import { AdminOperationDialog, type OperationResults, type OperationType } from "./admin-operation-dialog"

interface ScrapeResult {
  outletId: string
  success: boolean
  data?: any
  error?: string
}

interface AdminDashboardClientProps {
  hasApiKey: boolean
  totalOutlets: number
  scrapableOutlets: Array<{
    id: string
    name: string
    platform?: string
    outletType: string
    country?: string
    mediaType?: string
  }>
}

export function AdminDashboardClient({
  hasApiKey,
  totalOutlets: initialTotalOutlets,
  scrapableOutlets,
}: AdminDashboardClientProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  const [isScraping, setIsScraping] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ScrapeResult[]>([])
  const [activeOperation, setActiveOperation] = useState<string | null>(null)

  const [currentOutletCount, setCurrentOutletCount] = useState(initialTotalOutlets)
  const [scrapableCount, setScrapableCount] = useState(scrapableOutlets.length)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [showMergeDuplicatesDialog, setShowMergeDuplicatesDialog] = useState(false)
  const [lastOperationResults, setLastOperationResults] = useState<{
    type: string
    success: number
    failed: number
    timestamp: Date
  } | null>(null)

  const refreshAllStats = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/outlets/stats", { cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        setCurrentOutletCount(data.totalOutlets)
        setScrapableCount(data.scrapable)
      }
    } catch (error) {
      console.error("Error refreshing stats:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    if (email === "joelfrenette@gmail.com" && password === "Japan2025!") {
      setIsAuthenticated(true)
    } else {
      setLoginError("Invalid email or password")
    }
  }

  const handleDiscoverWithFilters = async (filters: DiscoveryFilters): Promise<DiscoveryResults> => {
    setIsScraping(true)
    setActiveOperation("discover")
    setProgress(0)
    setResults([])

    console.log("[v0] Starting discover new outlets operation with filters:", filters)

    try {
      const response = await fetch("/api/scrape/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters,
          operationType: "discover",
        }),
      })

      const data = await response.json()

      let discoveredOutlets: DiscoveredOutlet[] = []

      if (data.results && Array.isArray(data.results)) {
        discoveredOutlets = data.results.map((r: any) => ({
          name: r.data?.name || r.outletId?.replace(/-/g, " ") || "Unknown Outlet",
          website: r.data?.website,
          country: r.data?.country || filters.country || "Unknown",
          mediaType: r.data?.mediaType || filters.mediaTypes?.[0] || "unknown",
          estimatedAudience: r.data?.estimatedAudience || filters.minAudience || 1000000,
          description: r.data?.description || "Media outlet discovered via search.",
          status: r.success
            ? "added"
            : r.error?.toLowerCase().includes("already exists") ||
                r.error?.toLowerCase().includes("duplicate") ||
                r.error?.toLowerCase().includes("matches")
              ? "duplicate"
              : "failed",
          reason: r.error,
          // Pass through duplicate match info from API
          matchedExisting: r.data?.matchedExisting,
          matchType: r.data?.matchType,
        }))
        setResults(data.results)
        setProgress(100)
      } else if (data.error) {
        discoveredOutlets = [
          {
            name: "Error",
            country: filters.country || "Unknown",
            mediaType: "unknown",
            estimatedAudience: 0,
            description: data.error,
            status: "failed",
            reason: data.error,
          },
        ]
        setResults([{ outletId: "error", success: false, error: data.error }])
        setProgress(100)
      }

      await refreshAllStats()

      const totalAdded = discoveredOutlets.filter((o) => o.status === "added").length
      const totalDuplicates = discoveredOutlets.filter((o) => o.status === "duplicate").length
      const totalFailed = discoveredOutlets.filter((o) => o.status === "failed").length

      return {
        outlets: discoveredOutlets,
        totalFound: discoveredOutlets.length,
        totalAdded,
        totalDuplicates,
        totalFailed,
        searchFilters: filters,
        timestamp: new Date(),
      }
    } catch (error) {
      console.error("[v0] Bulk discover error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setResults([{ outletId: "error", success: false, error: errorMessage }])

      return {
        outlets: [
          {
            name: "Error",
            country: "Unknown",
            mediaType: "unknown",
            estimatedAudience: 0,
            description: errorMessage,
            status: "failed",
            reason: errorMessage,
          },
        ],
        totalFound: 0,
        totalAdded: 0,
        totalDuplicates: 0,
        totalFailed: 1,
        searchFilters: filters,
        timestamp: new Date(),
      }
    } finally {
      setIsScraping(false)
      setActiveOperation(null)
    }
  }

  const handleOperationComplete = (operationType: OperationType, results: OperationResults) => {
    setLastOperationResults({
      type: operationType,
      success: results.totalSuccess,
      failed: results.totalFailed,
      timestamp: results.timestamp,
    })
    // Refresh stats to show updated totals
    refreshAllStats()
  }

  useEffect(() => {
    refreshAllStats()
  }, [])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-foreground">Admin Login</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Enter your credentials to access the admin dashboard
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {loginError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {loginError}
              </div>
            )}

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-6">
            <Link href="/">
              <Button variant="ghost" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const successCount =
    lastOperationResults?.success ?? (Array.isArray(results) ? results.filter((r) => r.success).length : 0)
  const failCount =
    lastOperationResults?.failed ?? (Array.isArray(results) ? results.filter((r) => !r.success).length : 0)

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage data scraping and updates for media outlets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshAllStats} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Total Outlets</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{currentOutletCount}</div>
        </Card>

        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Scrapable</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{scrapableCount}</div>
        </Card>

        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-muted-foreground">Last Success</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{successCount}</div>
          {lastOperationResults && (
            <p className="text-xs text-muted-foreground mt-1">{lastOperationResults.type} operation</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-muted-foreground">Last Failed</span>
          </div>
          <div className="text-3xl font-bold text-destructive">{failCount}</div>
        </Card>
      </div>

      {/* Bulk Scraping Control */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        {/* Discover New Outlets */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Discover New Outlets</h3>
              <p className="text-sm text-muted-foreground">Search for new media outlets with customizable filters</p>
            </div>
          </div>
          <DiscoverOutletsDialog
            onDiscover={handleDiscoverWithFilters}
            isLoading={isScraping && activeOperation === "discover"}
            disabled={isScraping || !hasApiKey}
          />
        </Card>

        {/* Update Ownership */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Update Ownership</h3>
              <p className="text-sm text-muted-foreground">Refresh stakeholder and board member information</p>
            </div>
          </div>
          <AdminOperationDialog
            operationType="ownership"
            scrapableOutlets={scrapableOutlets}
            disabled={isScraping || !hasApiKey}
            onOperationComplete={(results) => handleOperationComplete("ownership", results)}
          />
        </Card>

        {/* Update Funding */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-green-500/10 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Update Funding</h3>
              <p className="text-sm text-muted-foreground">Research sponsorships and financial supporters</p>
            </div>
          </div>
          <AdminOperationDialog
            operationType="funding"
            scrapableOutlets={scrapableOutlets}
            disabled={isScraping || !hasApiKey}
            onOperationComplete={(results) => handleOperationComplete("funding", results)}
          />
        </Card>

        {/* Research Legal Cases */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Scale className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Research Legal Cases</h3>
              <p className="text-sm text-muted-foreground">Find defamation suits, settlements, and court proceedings</p>
            </div>
          </div>
          <AdminOperationDialog
            operationType="legal"
            scrapableOutlets={scrapableOutlets}
            disabled={isScraping || !hasApiKey}
            onOperationComplete={(results) => handleOperationComplete("legal", results)}
          />
        </Card>

        {/* Update Accountability */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-red-500/10 p-3">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Update Accountability</h3>
              <p className="text-sm text-muted-foreground">Count retractions, errata, and update scores</p>
            </div>
          </div>
          <AdminOperationDialog
            operationType="accountability"
            scrapableOutlets={scrapableOutlets}
            disabled={isScraping || !hasApiKey}
            onOperationComplete={(results) => handleOperationComplete("accountability", results)}
          />
        </Card>

        {/* Update Audience Data */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Update Audience Data</h3>
              <p className="text-sm text-muted-foreground">Refresh follower counts and viewership metrics</p>
            </div>
          </div>
          <AdminOperationDialog
            operationType="audience"
            scrapableOutlets={scrapableOutlets}
            disabled={isScraping || !hasApiKey}
            onOperationComplete={(results) => handleOperationComplete("audience", results)}
          />
        </Card>

        {/* Merge Duplicates */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-cyan-500/10 p-3">
              <Copy className="h-6 w-6 text-cyan-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Merge Duplicates</h3>
              <p className="text-sm text-muted-foreground">Identify and merge duplicate media outlet entries</p>
            </div>
          </div>
          <Button
            onClick={() => setShowMergeDuplicatesDialog(true)}
            disabled={isScraping}
            className="w-full gap-2"
            variant="default"
          >
            <Copy className="h-4 w-4" />
            Merge Duplicates
          </Button>
        </Card>

        {/* Update Logos */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-indigo-500/10 p-3">
              <ImageIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Update Logos</h3>
              <p className="text-sm text-muted-foreground">
                Refresh and update media outlet logos from official sources
              </p>
            </div>
          </div>
          <AdminOperationDialog
            operationType="logos"
            scrapableOutlets={scrapableOutlets}
            disabled={isScraping || !hasApiKey}
            onOperationComplete={(results) => handleOperationComplete("logos", results)}
          />
        </Card>
      </div>

      {!hasApiKey && (
        <Card className="mb-8 p-6">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="mb-1 font-semibold text-foreground">API Key Required</h3>
              <p className="text-sm text-muted-foreground">
                Please add SCRAPINGBEE_API_KEY to your environment variables in the Vars section to enable data
                scraping.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Merge Duplicates Dialog */}
      <MergeDuplicatesDialog
        open={showMergeDuplicatesDialog}
        onOpenChange={setShowMergeDuplicatesDialog}
        onMergeComplete={refreshAllStats}
      />
    </div>
  )
}
