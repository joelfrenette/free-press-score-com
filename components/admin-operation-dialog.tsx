"use client"

import { useState, useCallback } from "react"
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

const OUTLET_TYPES = [
  { id: "tv", label: "Television" },
  { id: "print", label: "Print / Newspaper" },
  { id: "radio", label: "Radio" },
  { id: "podcast", label: "Podcast" },
  { id: "social", label: "Social Media" },
  { id: "legacy", label: "Legacy / Wire Service" },
  { id: "digital", label: "Digital Native" },
]

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
  const [batchSize, setBatchSize] = useState(config.defaultBatchSize)
  const [outletTypes, setOutletTypes] = useState<string[]>([])
  const [countryFilter, setCountryFilter] = useState("all")
  const [skipRecent, setSkipRecent] = useState(false)
  const [recentDays, setRecentDays] = useState(7)

  // Processing state
  const [progress, setProgress] = useState(0)
  const [currentOutlet, setCurrentOutlet] = useState("")
  const [processedCount, setProcessedCount] = useState(0)

  // Results state
  const [results, setResults] = useState<OperationResults | null>(null)

  // Filter outlets based on criteria
  const getFilteredOutlets = useCallback(() => {
    let filtered = [...scrapableOutlets]

    if (outletTypes.length > 0) {
      filtered = filtered.filter((o) =>
        outletTypes.some((type) => o.outletType?.toLowerCase().includes(type.toLowerCase())),
      )
    }

    if (countryFilter !== "all") {
      filtered = filtered.filter((o) => {
        const country = o.country?.toLowerCase() || ""
        if (countryFilter === "us")
          return country.includes("united states") || country.includes("usa") || country === "us"
        if (countryFilter === "uk")
          return country.includes("united kingdom") || country.includes("uk") || country.includes("britain")
        if (countryFilter === "canada") return country.includes("canada")
        if (countryFilter === "australia") return country.includes("australia")
        return true
      })
    }

    return filtered.slice(0, batchSize)
  }, [scrapableOutlets, outletTypes, countryFilter, batchSize])

  const filteredCount = getFilteredOutlets().length

  const handleOutletTypeToggle = (typeId: string) => {
    setOutletTypes((prev) => (prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]))
  }

  const handleStartOperation = async () => {
    setView("processing")
    setProgress(0)
    setProcessedCount(0)
    setCurrentOutlet("")

    const outletsToProcess = getFilteredOutlets()
    const totalOutlets = outletsToProcess.length

    try {
      // Simulate progress updates during the API call
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 10
        })
      }, 500)

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlets: outletsToProcess,
          operationType,
          filters: {
            batchSize,
            outletTypes,
            countryFilter,
            skipRecent,
            recentDays,
          },
        }),
      })

      clearInterval(progressInterval)

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
        filters: { batchSize, outletTypes, countryFilter, skipRecent, recentDays },
      }

      setResults(operationResults)
      setProgress(100)
      setView("results")
      onOperationComplete(operationResults)
    } catch (error) {
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
        filters: { batchSize, outletTypes, countryFilter, skipRecent, recentDays },
      }
      setResults(errorResults)
      setProgress(100)
      setView("results")
    }
  }

  const handleTryAgain = () => {
    setResults(null)
    setView("filters")
    setProgress(0)
  }

  const handleClose = () => {
    if (view === "processing") return // Prevent closing during processing
    setOpen(false)
    setTimeout(() => {
      setView("filters")
      setResults(null)
      setProgress(0)
    }, 200)
  }

  // Filter view
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
        {/* Batch Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Number of Outlets</Label>
            <span className="text-sm font-bold text-primary">{batchSize} outlets</span>
          </div>
          <Slider
            value={[batchSize]}
            onValueChange={([val]) => setBatchSize(val)}
            min={5}
            max={config.maxBatchSize}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5</span>
            <span>{Math.floor(config.maxBatchSize / 2)}</span>
            <span>{config.maxBatchSize}</span>
          </div>
        </div>

        {/* Outlet Types Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Filter by Outlet Type (optional)</Label>
          <div className="grid grid-cols-2 gap-2">
            {OUTLET_TYPES.map((type) => {
              const isSelected = outletTypes.includes(type.id)
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleOutletTypeToggle(type.id)}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left text-sm transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  <Checkbox checked={isSelected} className="pointer-events-none h-4 w-4" />
                  <span>{type.label}</span>
                </button>
              )
            })}
          </div>
          {outletTypes.length === 0 && (
            <p className="text-xs text-muted-foreground">No filter applied - all outlet types included</p>
          )}
        </div>

        {/* Country Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Filter by Country (optional)</Label>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
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

        {/* Skip Recently Updated */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="skip-recent"
              checked={skipRecent}
              onCheckedChange={(checked) => setSkipRecent(checked as boolean)}
            />
            <Label htmlFor="skip-recent" className="text-sm font-medium cursor-pointer">
              Skip recently updated outlets
            </Label>
          </div>
          {skipRecent && (
            <div className="ml-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Updated within</span>
                <span className="text-xs font-medium">{recentDays} days</span>
              </div>
              <Slider
                value={[recentDays]}
                onValueChange={([val]) => setRecentDays(val)}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Summary */}
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

  // Processing view
  const renderProcessingView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <RefreshCw className="h-5 w-5 animate-spin" />
          {config.processingText}...
        </DialogTitle>
        <DialogDescription>Processing {filteredCount} outlets. This may take a few minutes.</DialogDescription>
      </DialogHeader>

      <div className="py-8 space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Animated Status */}
        <div className="flex flex-col items-center justify-center py-6">
          <div className="relative mb-4">
            <div className={`w-20 h-20 rounded-full ${config.bgColor} flex items-center justify-center`}>
              <Icon className={`h-10 w-10 ${config.iconColor}`} />
            </div>
            <div className="absolute -top-1 -right-1">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {config.processingText} for {filteredCount} outlets...
          </p>
          {currentOutlet && <p className="text-xs text-muted-foreground mt-2">Currently processing: {currentOutlet}</p>}
        </div>

        {/* Stats Preview */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/50 p-3 text-center">
            <div className="text-xl font-bold text-muted-foreground">{filteredCount}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="rounded-lg border bg-green-500/10 p-3 text-center">
            <div className="text-xl font-bold text-green-600">-</div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>
          <div className="rounded-lg border bg-red-500/10 p-3 text-center">
            <div className="text-xl font-bold text-red-600">-</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>
      </div>
    </>
  )

  // Results view
  const renderResultsView = () => {
    if (!results) return null

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {config.title} Complete
          </DialogTitle>
          <DialogDescription>
            Processed {results.totalProcessed} outlets with {results.totalSuccess} successful updates.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 py-4">
          <div className="rounded-lg border bg-muted/50 p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{results.totalProcessed}</div>
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

        {/* Filters Used */}
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

        {/* Results List */}
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
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">{result.outletName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {result.success ? result.data?.message || "Updated successfully" : result.error || "Update failed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button onClick={handleTryAgain} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Run Again
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className="w-full gap-2" variant="default" onClick={() => setOpen(true)}>
          <Icon className="h-4 w-4" />
          {config.title}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        {view === "filters" && renderFiltersView()}
        {view === "processing" && renderProcessingView()}
        {view === "results" && renderResultsView()}
      </DialogContent>
    </Dialog>
  )
}
