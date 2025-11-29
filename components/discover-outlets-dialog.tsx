"use client"

import { useState } from "react"
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
import {
  Search,
  RefreshCw,
  Tv,
  Radio,
  Newspaper,
  Mic,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
} from "lucide-react"

export interface DiscoveryFilters {
  country: string
  mediaTypes: string[]
  minAudience: number
  outletsToFind: number
}

export interface DiscoveredOutlet {
  name: string
  website?: string
  country: string
  mediaType: string
  estimatedAudience: number
  description: string
  status: "added" | "duplicate" | "failed"
  reason?: string
  matchedExisting?: string
  matchType?: string
}

export interface DiscoveryResults {
  outlets: DiscoveredOutlet[]
  totalFound: number
  totalAdded: number
  totalDuplicates: number
  totalFailed: number
  searchFilters: DiscoveryFilters
  timestamp: Date
}

interface DiscoverOutletsDialogProps {
  onDiscover: (filters: DiscoveryFilters) => Promise<DiscoveryResults>
  isLoading: boolean
  disabled: boolean
}

const COUNTRIES = [
  { value: "all", label: "All Countries" },
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "canada", label: "Canada" },
  { value: "australia", label: "Australia" },
  { value: "germany", label: "Germany" },
  { value: "france", label: "France" },
  { value: "spain", label: "Spain" },
  { value: "italy", label: "Italy" },
  { value: "japan", label: "Japan" },
  { value: "india", label: "India" },
  { value: "brazil", label: "Brazil" },
  { value: "mexico", label: "Mexico" },
  { value: "argentina", label: "Argentina" },
  { value: "middle-east", label: "Middle East" },
  { value: "africa", label: "Africa" },
  { value: "asia-pacific", label: "Asia Pacific" },
  { value: "latin-america", label: "Latin America" },
  { value: "europe", label: "Europe (Other)" },
]

const MEDIA_TYPES = [
  { id: "tv", label: "Television", icon: Tv },
  { id: "print", label: "Print / Newspaper", icon: Newspaper },
  { id: "radio", label: "Radio", icon: Radio },
  { id: "podcast", label: "Podcast", icon: Mic },
  { id: "social", label: "Social Media / Influencer", icon: Users },
  { id: "legacy", label: "Legacy / Wire Service", icon: Building2 },
]

function formatAudience(num: number): string {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toString()
}

function getMediaTypeLabel(id: string): string {
  return MEDIA_TYPES.find((t) => t.id === id)?.label || id
}

function getCountryLabel(value: string): string {
  return COUNTRIES.find((c) => c.value === value)?.label || value
}

function getMatchTypeLabel(matchType?: string): string {
  const labels: Record<string, string> = {
    exact: "Exact name match",
    similar: "Similar name",
    partial: "Partial name match",
    website: "Same website",
    domain: "Same domain",
    fuzzy: "Very similar name",
  }
  return labels[matchType || ""] || "Already exists"
}

export function DiscoverOutletsDialog({ onDiscover, isLoading, disabled }: DiscoverOutletsDialogProps) {
  const [open, setOpen] = useState(false)
  const [country, setCountry] = useState("all")
  const [mediaTypes, setMediaTypes] = useState<string[]>(["tv", "print", "social"])
  const [minAudience, setMinAudience] = useState(1000000)
  const [outletsToFind, setOutletsToFind] = useState(12)

  const [view, setView] = useState<"filters" | "loading" | "results">("filters")
  const [results, setResults] = useState<DiscoveryResults | null>(null)

  const handleMediaTypeToggle = (typeId: string) => {
    setMediaTypes((prev) => (prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]))
  }

  const handleDiscover = async () => {
    setView("loading")
    try {
      const discoveryResults = await onDiscover({
        country,
        mediaTypes,
        minAudience,
        outletsToFind,
      })
      setResults(discoveryResults)
      setView("results")
    } catch (error) {
      console.error("[v0] Discovery error:", error)
      setView("filters")
    }
  }

  const handleTryAgain = () => {
    setResults(null)
    setView("filters")
  }

  const handleQuit = () => {
    setResults(null)
    setView("filters")
    setOpen(false)
  }

  const audienceSteps = [100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000, 100000000]

  const getAudienceIndex = (value: number) => {
    const idx = audienceSteps.findIndex((v) => v >= value)
    return idx === -1 ? audienceSteps.length - 1 : idx
  }

  const renderResultsView = () => {
    if (!results) return null

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Discovery Results
          </DialogTitle>
          <DialogDescription>Found {results.totalFound} outlets matching your criteria</DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 py-4">
          <div className="rounded-lg border bg-muted/50 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{results.totalFound}</div>
            <div className="text-xs text-muted-foreground">Found</div>
          </div>
          <div className="rounded-lg border bg-green-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{results.totalAdded}</div>
            <div className="text-xs text-muted-foreground">Added</div>
          </div>
          <div className="rounded-lg border bg-yellow-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{results.totalDuplicates}</div>
            <div className="text-xs text-muted-foreground">Duplicates</div>
          </div>
          <div className="rounded-lg border bg-red-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{results.totalFailed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Search Filters Used */}
        <div className="rounded-lg border bg-muted/30 p-3 mb-4">
          <div className="text-sm font-medium mb-2">Search Filters Used:</div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{getCountryLabel(results.searchFilters.country)}</Badge>
            <Badge variant="outline">{formatAudience(results.searchFilters.minAudience)}+ audience</Badge>
            {results.searchFilters.mediaTypes.map((type) => (
              <Badge key={type} variant="secondary">
                {getMediaTypeLabel(type)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results List - Improved outlet display with clearer duplicate info */}
        <ScrollArea className="h-[300px] rounded-lg border">
          <div className="p-4 space-y-3">
            {results.outlets.map((outlet, index) => (
              <div
                key={index}
                className={`rounded-lg border p-4 transition-colors ${
                  outlet.status === "added"
                    ? "bg-green-500/5 border-green-500/30"
                    : outlet.status === "duplicate"
                      ? "bg-yellow-500/5 border-yellow-500/30"
                      : "bg-red-500/5 border-red-500/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {outlet.status === "added" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                      {outlet.status === "duplicate" && <Copy className="h-4 w-4 text-yellow-500 shrink-0" />}
                      {outlet.status === "failed" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                      <span className="font-semibold text-base">{outlet.name}</span>
                      {outlet.status === "added" && (
                        <Badge variant="outline" className="text-green-600 border-green-500/50 text-xs">
                          Added to Database
                        </Badge>
                      )}
                    </div>

                    {outlet.status === "duplicate" && (
                      <div className="mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <div className="flex items-center gap-2 text-sm text-yellow-700">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span className="font-medium">Duplicate Detected</span>
                        </div>
                        {outlet.matchedExisting && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Matches existing outlet: <strong>"{outlet.matchedExisting}"</strong>
                          </p>
                        )}
                        {outlet.matchType && (
                          <p className="text-xs text-yellow-600/80 mt-0.5">
                            Reason: {getMatchTypeLabel(outlet.matchType)}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{outlet.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {outlet.country}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getMediaTypeLabel(outlet.mediaType)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatAudience(outlet.estimatedAudience)} audience
                      </Badge>
                    </div>
                    {outlet.reason && !outlet.matchedExisting && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{outlet.reason}</p>
                    )}
                  </div>
                  {outlet.website && (
                    <Button variant="ghost" size="icon" asChild className="shrink-0">
                      <a href={outlet.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={handleQuit}>
            Quit
          </Button>
          <Button onClick={handleTryAgain} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </DialogFooter>
      </>
    )
  }

  const renderLoadingView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Discovering New Outlets...
        </DialogTitle>
        <DialogDescription>
          Searching for media outlets matching your criteria. This may take a moment.
        </DialogDescription>
      </DialogHeader>
      <div className="py-12 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/30 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Searching {getCountryLabel(country)}...</p>
          <p className="text-xs text-muted-foreground">
            Looking for {outletsToFind} outlets with {formatAudience(minAudience)}+ audience
          </p>
        </div>
      </div>
    </>
  )

  const renderFiltersView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <Search className="h-5 w-5" />
          Discover New Media Outlets
        </DialogTitle>
        <DialogDescription>
          Configure your search filters to find new media outlets matching your criteria.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 py-4">
        {/* Country/Region Selection */}
        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium">
            Country / Region
          </Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger id="country" className="w-full">
              <SelectValue placeholder="Select country or region" />
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

        {/* Media Types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Media Types</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MEDIA_TYPES.map((type) => {
              const Icon = type.icon
              const isSelected = mediaTypes.includes(type.id)
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleMediaTypeToggle(type.id)}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  <Checkbox checked={isSelected} className="pointer-events-none" />
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Minimum Audience */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Minimum Monthly Audience</Label>
            <span className="text-sm font-bold text-primary">{formatAudience(minAudience)}+</span>
          </div>
          <Slider
            value={[getAudienceIndex(minAudience)]}
            onValueChange={([idx]) => setMinAudience(audienceSteps[idx])}
            max={audienceSteps.length - 1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>100K</span>
            <span>1M</span>
            <span>10M</span>
            <span>100M</span>
          </div>
        </div>

        {/* Number of Outlets to Find */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Number of Outlets to Find</Label>
            <span className="text-sm font-bold text-primary">{outletsToFind} outlets</span>
          </div>
          <Slider
            value={[outletsToFind]}
            onValueChange={([val]) => setOutletsToFind(val)}
            min={6}
            max={50}
            step={6}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>6</span>
            <span>12</span>
            <span>24</span>
            <span>36</span>
            <span>50</span>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleDiscover} disabled={mediaTypes.length === 0} className="gap-2">
          <Search className="h-4 w-4" />
          Start Discovery
        </Button>
      </DialogFooter>
    </>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && view === "loading") return // Prevent closing during loading
        setOpen(isOpen)
        if (!isOpen) {
          setView("filters")
          setResults(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled} className="w-full gap-2" variant="default">
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Discover Outlets
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        {view === "filters" && renderFiltersView()}
        {view === "loading" && renderLoadingView()}
        {view === "results" && renderResultsView()}
      </DialogContent>
    </Dialog>
  )
}
