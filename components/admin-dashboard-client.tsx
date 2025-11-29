"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, Database, CheckCircle, XCircle, AlertCircle, Lock, Search, Copy, Loader2, Zap } from "lucide-react"
import {
  DiscoverOutletsDialog,
  type DiscoveryFilters,
  type DiscoveryResults,
  type DiscoveredOutlet,
} from "./discover-outlets-dialog"
import { MergeDuplicatesDialog } from "./merge-duplicates-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ProgressUpdate {
  outletId: string
  outletName: string
  status: "pending" | "processing" | "success" | "error" | "skipped"
  message?: string
  data?: any
  timestamp?: number
  operation?: string
}

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
  }>
}

const allOperations = [
  { type: "ownership", name: "Ownership", endpoint: "/api/scrape/ownership" },
  { type: "funding", name: "Funding", endpoint: "/api/scrape/funding" },
  { type: "legal", name: "Legal Cases", endpoint: "/api/scrape/legal" },
  { type: "accountability", name: "Accountability", endpoint: "/api/scrape/accountability" },
  { type: "audience", name: "Audience", endpoint: "/api/scrape/audience" },
  { type: "logos", name: "Logos", endpoint: "/api/scrape/logos" },
]

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
  const [currentOutletCount, setCurrentOutletCount] = useState(initialTotalOutlets)
  const [scrapableCount, setScrapableCount] = useState(scrapableOutlets.length)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [showMergeDuplicatesDialog, setShowMergeDuplicatesDialog] = useState(false)

  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [progressTotal, setProgressTotal] = useState(0)
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([])
  const [progressIndex, setProgressIndex] = useState(0)
  const [progressComplete, setProgressComplete] = useState(false)
  const [aiProvider, setAiProvider] = useState<string | null>(null)
  const [currentOperation, setCurrentOperation] = useState<string>("")
  const [operationIndex, setOperationIndex] = useState(0)
  const [totalOperations, setTotalOperations] = useState(0)

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

  const refreshOutletCount = async () => {
    try {
      const response = await fetch("/api/outlets/count", { cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        setCurrentOutletCount(data.count)
      }
    } catch (error) {
      console.error("Error refreshing outlet count:", error)
    }
  }

  const [showDiscoverDialog, setShowDiscoverDialog] = useState(false)
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryResults | null>(null)
  const [isDiscovering, setIsDiscovering] = useState(false)

  const handleDiscover = () => {
    setDiscoveryResults(null)
    setShowDiscoverDialog(true)
  }

  const handleDiscoverWithFilters = async (filters: DiscoveryFilters) => {
    setIsDiscovering(true)

    try {
      const response = await fetch("/api/scrape/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      })

      const data = await response.json()

      const results: DiscoveryResults = {
        found: data.results?.length || 0,
        added: 0,
        duplicates: 0,
        failed: 0,
        outlets:
          data.results?.map((r: any) => ({
            name: r.name || "Unknown",
            description: r.description || "",
            country: r.country || filters.country || "Unknown",
            type: r.type || "Online",
            audienceSize: r.audienceSize || "Unknown",
            status: r.error
              ? r.error.includes("exists") || r.error.includes("matches") || r.error.includes("duplicate")
                ? "duplicate"
                : "failed"
              : "added",
            error: r.error,
            url: r.website || r.url,
            matchedExisting: r.matchedExisting,
            matchType: r.matchType,
          })) || [],
        filtersUsed: filters,
      }

      results.added = results.outlets.filter((o: DiscoveredOutlet) => o.status === "added").length
      results.duplicates = results.outlets.filter((o: DiscoveredOutlet) => o.status === "duplicate").length
      results.failed = results.outlets.filter((o: DiscoveredOutlet) => o.status === "failed").length

      setDiscoveryResults(results)

      if (results.added > 0) {
        await refreshOutletCount()
      }
    } catch (error) {
      console.error("Discovery error:", error)
      setDiscoveryResults({
        found: 0,
        added: 0,
        duplicates: 0,
        failed: 1,
        outlets: [],
        filtersUsed: filters,
      })
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleUpdateAllInfo = async () => {
    const outletsToProcess = scrapableOutlets.slice(0, 20) // Process first 20 outlets
    const totalSteps = outletsToProcess.length * allOperations.length

    // Initialize progress dialog
    setProgressTotal(totalSteps)
    setProgressUpdates([])
    setProgressIndex(0)
    setProgressComplete(false)
    setAiProvider(null)
    setCurrentOperation("")
    setOperationIndex(0)
    setTotalOperations(allOperations.length)
    setShowProgressDialog(true)
    setIsScraping(true)

    let globalIndex = 0

    // Process each operation type
    for (let opIdx = 0; opIdx < allOperations.length; opIdx++) {
      const operation = allOperations[opIdx]
      setCurrentOperation(operation.name)
      setOperationIndex(opIdx + 1)

      // Process each outlet for this operation
      for (let i = 0; i < outletsToProcess.length; i++) {
        const outlet = outletsToProcess[i]
        const updateKey = `${operation.type}-${outlet.id}`

        // Add to progress updates
        setProgressUpdates((prev) => [
          ...prev,
          {
            outletId: updateKey,
            outletName: outlet.name,
            status: "processing" as const,
            message: `Updating ${operation.name.toLowerCase()}...`,
            operation: operation.name,
            timestamp: Date.now(),
          },
        ])

        try {
          const response = await fetch(operation.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outlets: [outlet],
              operationType: operation.type,
            }),
          })

          const data = await response.json()

          // Set AI provider if returned
          if (data.aiProvider && !aiProvider) {
            setAiProvider(data.aiProvider)
          }

          const result = data.results?.[0]

          if (result?.success) {
            setProgressUpdates((prev) =>
              prev.map((u) =>
                u.outletId === updateKey
                  ? {
                      ...u,
                      status: "success" as const,
                      message: `${operation.name}: ${result.message || "Updated"}`,
                      data: result.data,
                    }
                  : u,
              ),
            )
          } else if (result?.skipped) {
            setProgressUpdates((prev) =>
              prev.map((u) =>
                u.outletId === updateKey
                  ? {
                      ...u,
                      status: "skipped" as const,
                      message: `${operation.name}: ${result.reason || "Skipped"}`,
                    }
                  : u,
              ),
            )
          } else {
            setProgressUpdates((prev) =>
              prev.map((u) =>
                u.outletId === updateKey
                  ? {
                      ...u,
                      status: "error" as const,
                      message: `${operation.name}: ${result?.error || data.error || "Failed"}`,
                    }
                  : u,
              ),
            )
          }
        } catch (error) {
          setProgressUpdates((prev) =>
            prev.map((u) =>
              u.outletId === updateKey
                ? {
                    ...u,
                    status: "error" as const,
                    message: `${operation.name}: ${error instanceof Error ? error.message : "Request failed"}`,
                  }
                : u,
            ),
          )
        }

        globalIndex++
        setProgressIndex(globalIndex)

        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    setProgressComplete(true)
    setIsScraping(false)
    await refreshAllStats()
  }

  const handleCloseProgressDialog = () => {
    setShowProgressDialog(false)
    setProgressUpdates([])
    setProgressIndex(0)
    setProgressComplete(false)
    setAiProvider(null)
    setCurrentOperation("")
    setOperationIndex(0)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        setIsAuthenticated(true)
        localStorage.setItem("admin_authenticated", "true")
      } else {
        setLoginError(data.error || "Invalid credentials")
      }
    } catch (error) {
      setLoginError("Login failed. Please try again.")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("admin_authenticated")
  }

  useEffect(() => {
    const isAuth = localStorage.getItem("admin_authenticated")
    if (isAuth === "true") {
      setIsAuthenticated(true)
    }
  }, [])

  // Calculate progress stats
  const successCount = progressUpdates.filter((u) => u.status === "success").length
  const errorCount = progressUpdates.filter((u) => u.status === "error").length
  const skippedCount = progressUpdates.filter((u) => u.status === "skipped").length
  const progressPercent = progressTotal > 0 ? Math.round((progressIndex / progressTotal) * 100) : 0

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-center justify-center mb-6">
            <Lock className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-6">Admin Access</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@free-press-scores.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {loginError && (
              <div className="text-sm text-red-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {loginError}
              </div>
            )}
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage data scraping and updates for media outlets</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refreshAllStats} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Outlets</p>
                <p className="text-3xl font-bold">{currentOutletCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Scrapable</p>
                <p className="text-3xl font-bold">{scrapableCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-lg font-semibold">{successCount > 0 ? `${successCount} successful` : "Ready"}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Discover New Outlets */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Discover New Outlets</h3>
                <p className="text-sm text-muted-foreground">
                  Search for new media outlets using AI with customizable filters for country, type, and audience
                </p>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={handleDiscover}>
              <Search className="h-4 w-4 mr-2" />
              Discover Outlets
            </Button>
          </Card>

          {/* Merge Duplicates */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Copy className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Merge Duplicates</h3>
                <p className="text-sm text-muted-foreground">
                  Identify and merge duplicate media outlet entries to keep your database clean
                </p>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => setShowMergeDuplicatesDialog(true)}
              disabled={isScraping}
            >
              <Copy className="h-4 w-4 mr-2" />
              Merge Duplicates
            </Button>
          </Card>

          {/* Update All Info */}
          <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Update All Info</h3>
                <p className="text-sm text-muted-foreground">
                  Run all updates: Ownership, Funding, Legal, Accountability, Audience, and Logos
                </p>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={handleUpdateAllInfo} disabled={isScraping}>
              {isScraping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Update All Info
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Discover Outlets Dialog */}
        <DiscoverOutletsDialog
          open={showDiscoverDialog}
          onOpenChange={setShowDiscoverDialog}
          onDiscover={handleDiscoverWithFilters}
          results={discoveryResults}
          isLoading={isDiscovering}
        />

        {/* Merge Duplicates Dialog */}
        <MergeDuplicatesDialog
          open={showMergeDuplicatesDialog}
          onOpenChange={setShowMergeDuplicatesDialog}
          onComplete={refreshAllStats}
        />

        {/* Progress Dialog for Update All Info */}
        <Dialog open={showProgressDialog} onOpenChange={handleCloseProgressDialog}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {!progressComplete ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Zap className="h-5 w-5 text-primary" />
                )}
                Update All Info
              </DialogTitle>
              <DialogDescription>
                {progressComplete
                  ? "All updates completed!"
                  : `Running ${currentOperation} (Step ${operationIndex} of ${totalOperations})`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progressComplete ? "Complete" : `Processing ${progressIndex} of ${progressTotal} tasks`}
                  </span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />

                <div className="flex items-center gap-2 flex-wrap">
                  {aiProvider && (
                    <Badge variant="outline" className="text-xs">
                      AI: {aiProvider}
                    </Badge>
                  )}
                  {currentOperation && !progressComplete && (
                    <Badge variant="secondary" className="text-xs">
                      Current: {currentOperation}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Operation Progress Indicators */}
              <div className="flex gap-1">
                {allOperations.map((op, idx) => (
                  <div
                    key={op.type}
                    className={cn(
                      "flex-1 h-2 rounded-full transition-colors",
                      idx < operationIndex - 1
                        ? "bg-green-500"
                        : idx === operationIndex - 1 && !progressComplete
                          ? "bg-blue-500 animate-pulse"
                          : progressComplete
                            ? "bg-green-500"
                            : "bg-muted",
                    )}
                    title={op.name}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Ownership</span>
                <span>Logos</span>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">{progressTotal}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-green-600">{successCount}</div>
                  <div className="text-xs text-muted-foreground">Success</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-red-600">{errorCount}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-yellow-600">{skippedCount}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
              </div>

              {/* Live Updates Log */}
              <div className="flex-1 min-h-0">
                <h4 className="text-sm font-medium mb-2">Live Updates</h4>
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-3 space-y-2">
                    {progressUpdates.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Starting updates...</p>
                      </div>
                    ) : (
                      progressUpdates
                        .slice()
                        .reverse()
                        .slice(0, 50)
                        .map((update, index) => (
                          <div
                            key={`${update.outletId}-${index}`}
                            className={cn(
                              "flex items-start gap-2 p-2 rounded-md text-sm transition-all",
                              update.status === "processing" && "bg-blue-500/10 border border-blue-500/30",
                              update.status === "success" && "bg-green-500/10",
                              update.status === "error" && "bg-red-500/10",
                              update.status === "skipped" && "bg-yellow-500/10",
                            )}
                          >
                            {update.status === "processing" && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500 mt-0.5 shrink-0" />
                            )}
                            {update.status === "success" && (
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            )}
                            {update.status === "error" && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                            {update.status === "skipped" && (
                              <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate flex items-center gap-2">
                                {update.outletName}
                                {update.operation && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {update.operation}
                                  </Badge>
                                )}
                              </div>
                              {update.message && (
                                <div className="text-xs text-muted-foreground truncate">{update.message}</div>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                {progressComplete ? (
                  <Button onClick={handleCloseProgressDialog}>Done</Button>
                ) : (
                  <Button variant="outline" disabled>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
