"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils" // Fixed import path for cn utility
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Users,
  DollarSign,
  Scale,
  FileText,
  TrendingUp,
  ImageIcon,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react"

// Types
export interface OperationFilters {
  batchSize: number
  outletTypes: string[]
  countryFilter: string
  skipRecent: boolean
  recentDays: number
}

export interface OperationResult {
  outletId: string
  outletName: string
  success: boolean
  data?: any
  error?: string
}

export interface OperationResults {
  results: OperationResult[]
  totalProcessed: number
  totalSuccess: number
  totalFailed: number
  timestamp: Date
  filters: OperationFilters
}

// Operation configurations
export type OperationType = "ownership" | "funding" | "legal" | "accountability" | "audience" | "logos"

interface OperationConfig {
  title: string
  description: string
  filterDescription: string
  icon: LucideIcon
  iconColor: string
  bgColor: string
  endpoint: string
  processingText: string
  defaultBatchSize: number
  maxBatchSize: number
}

const OPERATION_CONFIGS: Record<OperationType, OperationConfig> = {
  ownership: {
    title: "Update Ownership",
    description: "Refresh stakeholder and board member information",
    filterDescription: "Configure which outlets to update ownership data for.",
    icon: Users,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-500/10",
    endpoint: "/api/scrape/ownership",
    processingText: "Updating ownership data",
    defaultBatchSize: 20,
    maxBatchSize: 50,
  },
  funding: {
    title: "Update Funding",
    description: "Research sponsorships and financial supporters",
    filterDescription: "Configure which outlets to research funding sources for.",
    icon: DollarSign,
    iconColor: "text-green-600",
    bgColor: "bg-green-500/10",
    endpoint: "/api/scrape/funding",
    processingText: "Researching funding sources",
    defaultBatchSize: 20,
    maxBatchSize: 50,
  },
  legal: {
    title: "Research Legal Cases",
    description: "Find defamation suits, settlements, and court proceedings",
    filterDescription: "Configure which outlets to research legal history for.",
    icon: Scale,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-500/10",
    endpoint: "/api/scrape/legal",
    processingText: "Researching legal cases",
    defaultBatchSize: 20,
    maxBatchSize: 50,
  },
  accountability: {
    title: "Update Accountability",
    description: "Count retractions, errata, and update scores",
    filterDescription: "Configure which outlets to evaluate accountability for.",
    icon: FileText,
    iconColor: "text-red-600",
    bgColor: "bg-red-500/10",
    endpoint: "/api/scrape/accountability",
    processingText: "Evaluating accountability",
    defaultBatchSize: 20,
    maxBatchSize: 50,
  },
  audience: {
    title: "Update Audience Data",
    description: "Refresh follower counts and viewership metrics",
    filterDescription: "Configure which outlets to update audience metrics for.",
    icon: TrendingUp,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-500/10",
    endpoint: "/api/scrape/audience",
    processingText: "Updating audience metrics",
    defaultBatchSize: 10,
    maxBatchSize: 30,
  },
  logos: {
    title: "Update Logos",
    description: "Refresh and update media outlet logos from official sources",
    filterDescription: "Configure which outlets to update logos for.",
    icon: ImageIcon,
    iconColor: "text-indigo-600",
    bgColor: "bg-indigo-500/10",
    endpoint: "/api/scrape/logos",
    processingText: "Updating logos",
    defaultBatchSize: 30,
    maxBatchSize: 100,
  },
}

const OUTLET_TYPE_CATEGORIES = [
  {
    label: "Legacy Media",
    types: [
      { id: "tv", label: "Television" },
      { id: "print", label: "Print / Newspaper" },
      { id: "mixed", label: "Multi-Platform" },
    ],
  },
  {
    label: "New Media",
    types: [
      { id: "digital", label: "Digital Native" },
      { id: "podcast", label: "Podcast" },
    ],
  },
]

// Flat list for backwards compatibility
const OUTLET_TYPES = OUTLET_TYPE_CATEGORIES.flatMap((cat) => cat.types)

const COUNTRIES = [
  { value: "all", label: "All Countries" },
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "canada", label: "Canada" },
  { value: "australia", label: "Australia" },
  { value: "other", label: "Other" },
]

interface AdminOperationDialogProps {
  operationType: OperationType
  scrapableOutlets: Array<{
    id: string
    name: string
    platform?: string
    outletType: string
    country?: string
    mediaType?: string
  }>
  disabled: boolean
  onOperationComplete: (results: OperationResults) => void
}

export function AdminOperationDialog({
  operationType,
  scrapableOutlets,
  disabled,
  onOperationComplete,
}: AdminOperationDialogProps) {
  const config = OPERATION_CONFIGS[operationType]
  const Icon = config.icon

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"filters" | "processing" | "results">("filters")

  // Filter state
  const [filters, setFilters] = useState<OperationFilters>({
    batchSize: config.defaultBatchSize,
    outletTypes: [],
    countryFilter: "all",
    skipRecent: false,
    recentDays: 7,
  })

  // Processing state
  const [progress, setProgress] = useState(0)
  const [currentOutlet, setCurrentOutlet] = useState("")
  const [processedCount, setProcessedCount] = useState(0)
  const [liveSuccess, setLiveSuccess] = useState(0)
  const [liveFailed, setLiveFailed] = useState(0)

  // Results state
  const [results, setResults] = useState<OperationResults | null>(null)
  const [wasCancelled, setWasCancelled] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const mediaTypes = scrapableOutlets.map((o) => o.mediaType)
    const uniqueTypes = [...new Set(mediaTypes)]
    console.log("[v0] scrapableOutlets mediaTypes:", uniqueTypes)
    console.log(
      "[v0] Sample outlets:",
      scrapableOutlets.slice(0, 5).map((o) => ({ name: o.name, mediaType: o.mediaType })),
    )
  }, [scrapableOutlets])

  // Filter outlets based on criteria
  const getFilteredOutlets = useCallback(() => {
    let filtered = [...scrapableOutlets]

    if (filters.outletTypes.length > 0) {
      console.log("[v0] Filtering by outletTypes:", filters.outletTypes)
      filtered = filtered.filter((o) =>
        filters.outletTypes.some((type) => {
          const mediaType = o.mediaType?.toLowerCase() || ""
          if (type === "tv") return mediaType === "tv" || mediaType === "television"
          if (type === "print") return mediaType === "print" || mediaType === "newspaper"
          if (type === "radio") return mediaType === "radio"
          if (type === "podcast") return mediaType === "podcast"
          if (type === "social")
            return mediaType === "social" || mediaType === "youtube" || o.outletType === "influencer"
          if (type === "legacy") return mediaType === "legacy" || mediaType === "wire"
          if (type === "digital") return mediaType === "digital" || mediaType === "online"
          return mediaType.includes(type.toLowerCase())
        }),
      )
      console.log("[v0] After filtering, count:", filtered.length)
    }

    if (filters.countryFilter !== "all") {
      filtered = filtered.filter((o) => {
        const country = o.country?.toLowerCase() || ""
        if (filters.countryFilter === "us")
          return country.includes("united states") || country.includes("usa") || country === "us"
        if (filters.countryFilter === "uk")
          return country.includes("united kingdom") || country.includes("uk") || country.includes("britain")
        if (filters.countryFilter === "canada") return country.includes("canada")
        if (filters.countryFilter === "australia") return country.includes("australia")
        return true
      })
    }

    return filtered
  }, [scrapableOutlets, filters])

  const filteredCount = getFilteredOutlets().length

  const handleStartOperation = async () => {
    setView("processing")
    setProgress(0)
    setProcessedCount(0)
    setCurrentOutlet("")
    setLiveSuccess(0)
    setLiveFailed(0)
    setWasCancelled(false)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const outletsToProcess = getFilteredOutlets()
    const totalOutlets = outletsToProcess.length

    const allResults: Array<{
      outletId: string
      outletName: string
      success: boolean
      data?: any
      error?: string
    }> = []

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlets: outletsToProcess,
          operationType,
          filters,
          stream: true,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (contentType?.includes("text/event-stream")) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
          let buffer = ""
          while (true) {
            if (abortController.signal.aborted) {
              reader.cancel()
              break
            }

            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6))

                  if (data.type === "progress") {
                    setProcessedCount(data.current)
                    setProgress((data.current / totalOutlets) * 100)
                    setCurrentOutlet(data.outletName)

                    if (data.success) {
                      setLiveSuccess((prev) => prev + 1)
                    } else {
                      setLiveFailed((prev) => prev + 1)
                    }

                    allResults.push({
                      outletId: data.result?.outletId || data.outletId,
                      outletName: data.outletName,
                      success: data.result?.success ?? data.success,
                      data: data.result?.data,
                      error: data.result?.error,
                    })
                  } else if (data.type === "complete") {
                    console.log("[v0] Received complete event:", data)
                    const operationResults: OperationResults = {
                      results: allResults,
                      // Use server values if available, otherwise calculate from allResults
                      totalProcessed: data.totalProcessed ?? allResults.length,
                      totalSuccess: data.totalSuccess ?? allResults.filter((r) => r.success).length,
                      totalFailed: data.totalFailed ?? allResults.filter((r) => !r.success).length,
                      timestamp: new Date(),
                      filters,
                    }

                    setResults(operationResults)
                    setProgress(100)
                    setView("results")
                    onOperationComplete(operationResults)
                    return
                  }
                } catch (parseError) {
                  console.error("[v0] Error parsing SSE data:", parseError)
                }
              }
            }
          }
        }

        if (!abortController.signal.aborted) {
          const operationResults: OperationResults = {
            results: allResults,
            totalProcessed: allResults.length,
            totalSuccess: allResults.filter((r) => r.success).length,
            totalFailed: allResults.filter((r) => !r.success).length,
            timestamp: new Date(),
            filters,
          }

          setResults(operationResults)
          setProgress(100)
          setView("results")
          onOperationComplete(operationResults)
        }
      } else {
        const data = await response.json()

        const operationResults: OperationResults = {
          results: (data.results || []).map((r: any) => ({
            outletId: r.outletId,
            outletName: outletsToProcess.find((o) => o.id === r.outletId)?.name || r.outletId,
            success: r.success,
            data: r.data,
            error: r.error,
          })),
          totalProcessed: data.results?.length || 0,
          totalSuccess: data.results?.filter((r: any) => r.success).length || 0,
          totalFailed: data.results?.filter((r: any) => !r.success).length || 0,
          timestamp: new Date(),
          filters,
        }

        setResults(operationResults)
        setProgress(100)
        setView("results")
        onOperationComplete(operationResults)
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        const cancelledResults: OperationResults = {
          results: allResults,
          totalProcessed: allResults.length,
          totalSuccess: allResults.filter((r) => r.success).length,
          totalFailed: allResults.filter((r) => !r.success).length,
          timestamp: new Date(),
          filters,
        }
        setResults(cancelledResults)
        setWasCancelled(true)
        setView("results")
        if (allResults.length > 0) {
          onOperationComplete(cancelledResults)
        }
        return
      }

      console.error(`[v0] ${operationType} operation error:`, error)
      const errorResults: OperationResults = {
        results: [
          {
            outletId: "error",
            outletName: "Operation Error",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          },
        ],
        totalProcessed: 0,
        totalSuccess: 0,
        totalFailed: 1,
        timestamp: new Date(),
        filters,
      }
      setResults(errorResults)
      setProgress(100)
      setView("results")
      onOperationComplete(errorResults)
    }
  }

  const handleCancelOperation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  const handleCancelAndClose = () => {
    handleCancelOperation()
    setOpen(false)
    // Reset state after dialog animation completes
    setTimeout(() => {
      setView("filters")
      setResults(null)
      setProgress(0)
      setLiveSuccess(0)
      setLiveFailed(0)
      setWasCancelled(false)
    }, 200)
  }

  const handleTryAgain = () => {
    setResults(null)
    setView("filters")
    setProgress(0)
    setLiveSuccess(0)
    setLiveFailed(0)
    setWasCancelled(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (view === "processing" && !newOpen) {
      handleCancelAndClose()
      return
    }
    if (newOpen) {
      setOpen(true)
      setView("filters")
      setResults(null)
      setProgress(0)
      setLiveSuccess(0)
      setLiveFailed(0)
      setWasCancelled(false)
    } else {
      setOpen(false)
      setTimeout(() => {
        setView("filters")
        setResults(null)
        setProgress(0)
        setLiveSuccess(0)
        setLiveFailed(0)
        setWasCancelled(false)
      }, 200)
    }
  }

  const handleClose = () => {
    handleOpenChange(false)
  }

  const renderFiltersView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <div className={`rounded-lg ${config.bgColor} p-2`}>
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
          {config.title}
        </DialogTitle>
        <DialogDescription>{config.filterDescription}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 py-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Filter by Outlet Type (optional)</Label>
          <div className="space-y-4">
            {OUTLET_TYPE_CATEGORIES.map((category) => (
              <div key={category.label} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category.label}</p>
                <div className="flex flex-wrap gap-2">
                  {category.types.map((type) => (
                    <label
                      key={type.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors text-sm",
                        filters.outletTypes.includes(type.id)
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-background hover:bg-muted",
                      )}
                    >
                      <Checkbox
                        checked={filters.outletTypes.includes(type.id)}
                        onCheckedChange={(checked) => {
                          setFilters((prev) => ({
                            ...prev,
                            outletTypes: checked
                              ? [...prev.outletTypes, type.id]
                              : prev.outletTypes.filter((t) => t !== type.id),
                          }))
                        }}
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {filters.outletTypes.length === 0 && (
            <p className="text-xs text-muted-foreground">No filter applied - all outlet types included</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Filter by Country (optional)</Label>
          <Select
            value={filters.countryFilter}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, countryFilter: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id={`skip-recent-${operationType}`}
              checked={filters.skipRecent}
              onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, skipRecent: checked as boolean }))}
            />
            <Label htmlFor={`skip-recent-${operationType}`} className="text-sm font-medium cursor-pointer">
              Skip recently updated outlets
            </Label>
          </div>
          {filters.skipRecent && (
            <div className="ml-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Updated within</span>
                <span className="text-xs font-medium">{filters.recentDays} days</span>
              </div>
              <Slider
                value={[filters.recentDays]}
                onValueChange={([val]) => setFilters((prev) => ({ ...prev, recentDays: val }))}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Outlets matching filters:</span>
            <Badge variant="secondary" className="font-mono">
              {filteredCount} outlets
            </Badge>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleStartOperation} disabled={filteredCount === 0} className="gap-2">
          <Icon className="h-4 w-4" />
          Start {config.title}
        </Button>
      </DialogFooter>
    </>
  )

  const renderProcessingView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          {config.processingText}...
        </DialogTitle>
        <DialogDescription>
          Processing {getFilteredOutlets().length} outlets. This may take a few minutes.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex flex-col items-center justify-center py-6">
          <div className="relative mb-4">
            <div className={`rounded-full ${config.bgColor} p-4`}>
              <Icon className={`h-8 w-8 ${config.iconColor}`} />
            </div>
            <div className="absolute -top-1 -right-1">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {config.processingText} for {getFilteredOutlets().length} outlets...
          </p>
          {currentOutlet && <p className="text-xs text-muted-foreground mt-1">Currently processing: {currentOutlet}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <div className="text-2xl font-bold">{getFilteredOutlets().length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="rounded-lg border bg-green-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{liveSuccess || "-"}</div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>
          <div className="rounded-lg border bg-red-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{liveFailed || "-"}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={handleCancelAndClose} className="gap-2">
            <XCircle className="h-4 w-4" />
            Cancel Operation
          </Button>
        </DialogFooter>
      </div>
    </>
  )

  const renderResultsView = () => {
    if (!results) return null

    const successRate = results.totalProcessed > 0 ? (results.totalSuccess / results.totalProcessed) * 100 : 0

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {wasCancelled ? (
              <>
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                Operation Cancelled
              </>
            ) : successRate >= 80 ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Operation Complete
              </>
            ) : successRate >= 50 ? (
              <>
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                Operation Complete with Issues
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-500" />
                Operation Failed
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {wasCancelled
              ? `Operation was cancelled. ${results.totalProcessed} outlets were processed before cancellation.`
              : `Processed ${results.totalProcessed} outlets. ${results.totalSuccess} succeeded, ${results.totalFailed} failed.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <div className="text-2xl font-bold">{results.totalProcessed}</div>
            <div className="text-xs text-muted-foreground">Processed</div>
          </div>
          <div className="rounded-lg border bg-green-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{results.totalSuccess}</div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>
          <div className="rounded-lg border bg-red-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{results.totalFailed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 mb-4">
          <div className="text-sm font-medium mb-2">Filters Applied:</div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{results.filters.batchSize} outlets</Badge>
            {results.filters.countryFilter !== "all" && (
              <Badge variant="outline">{COUNTRIES.find((c) => c.value === results.filters.countryFilter)?.label}</Badge>
            )}
            {results.filters.outletTypes.map((type) => (
              <Badge key={type} variant="secondary">
                {OUTLET_TYPES.find((t) => t.id === type)?.label || type}
              </Badge>
            ))}
            {results.filters.skipRecent && <Badge variant="outline">Skip recent ({results.filters.recentDays}d)</Badge>}
          </div>
        </div>

        <ScrollArea className="h-[250px] rounded-lg border">
          <div className="p-4 space-y-2">
            {results.results.map((result, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 transition-colors ${
                  result.success ? "bg-green-500/5 border-green-500/30" : "bg-red-500/5 border-red-500/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <span className="font-medium">{result.outletName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-right max-w-[200px] truncate">
                    {result.success ? result.data?.message || "Updated successfully" : result.error || "Update failed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={handleClose}>
            {results.totalFailed > 0 ? "Quit" : "Close"}
          </Button>
          <Button
            onClick={handleTryAgain}
            className="gap-2"
            variant={results.totalFailed > 0 ? "default" : "secondary"}
          >
            <RefreshCw className="h-4 w-4" />
            {results.totalFailed > 0 ? "Try Again" : "Run Again"}
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className="w-full gap-2" variant="default">
          <Icon className="h-4 w-4" />
          {config.title}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" showCloseButton={view !== "processing"}>
        {view === "filters" && renderFiltersView()}
        {view === "processing" && renderProcessingView()}
        {view === "results" && renderResultsView()}
      </DialogContent>
    </Dialog>
  )
}
