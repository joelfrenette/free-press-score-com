"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { MediaOutletCard } from "@/components/media-outlet-card"
import { COUNTRIES } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Filter, RefreshCw } from "lucide-react"
import type { MediaOutlet } from "@/lib/mock-data"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<string>("all")
  const [biasFilter, setBiasFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("score-desc")
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all")

  const { data, error, isLoading, mutate } = useSWR<{
    outlets: MediaOutlet[]
    total: number
    scrapable: number
  }>("/api/outlets", fetcher, {
    refreshInterval: 0, // Manual refresh only
    revalidateOnFocus: false,
  })

  const mediaOutlets = data?.outlets || []
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }

  const mediaCounts = useMemo(() => {
    const all = mediaOutlets.length
    const traditional = mediaOutlets.filter((o) => o.outletType === "traditional").length
    const influencer = mediaOutlets.filter((o) => o.outletType === "influencer").length
    return { all, traditional, influencer }
  }, [mediaOutlets])

  const filteredOutlets = useMemo(() => {
    let filtered = mediaOutlets

    if (mediaTypeFilter === "traditional") {
      filtered = filtered.filter((outlet) => outlet.outletType === "traditional")
    } else if (mediaTypeFilter === "influencer") {
      filtered = filtered.filter((outlet) => outlet.outletType === "influencer")
    }

    // Filter by country
    if (selectedCountry !== "all") {
      filtered = filtered.filter((outlet) => outlet.country === selectedCountry)
    }

    // Filter by bias
    if (biasFilter !== "all") {
      filtered = filtered.filter((outlet) => {
        if (biasFilter === "far-left") return outlet.biasScore <= -1.5
        if (biasFilter === "left") return outlet.biasScore > -1.5 && outlet.biasScore <= -0.5
        if (biasFilter === "center") return outlet.biasScore > -0.5 && outlet.biasScore < 0.5
        if (biasFilter === "right") return outlet.biasScore >= 0.5 && outlet.biasScore < 1.5
        if (biasFilter === "far-right") return outlet.biasScore >= 1.5
        return true
      })
    }

    // Sort
    if (sortBy === "score-desc") {
      filtered = [...filtered].sort((a, b) => b.freePressScore - a.freePressScore)
    } else if (sortBy === "score-asc") {
      filtered = [...filtered].sort((a, b) => a.freePressScore - b.freePressScore)
    } else if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    }

    return filtered
  }, [selectedCountry, biasFilter, sortBy, mediaTypeFilter, mediaOutlets])

  const groupedByCountry = useMemo(() => {
    const grouped = COUNTRIES.reduce(
      (acc, country) => {
        acc[country] = {
          "far-left": filteredOutlets.filter((o) => o.country === country && o.biasScore <= -1.5),
          left: filteredOutlets.filter((o) => o.country === country && o.biasScore > -1.5 && o.biasScore <= -0.5),
          center: filteredOutlets.filter((o) => o.country === country && o.biasScore > -0.5 && o.biasScore < 0.5),
          right: filteredOutlets.filter((o) => o.country === country && o.biasScore >= 0.5 && o.biasScore < 1.5),
          "far-right": filteredOutlets.filter((o) => o.country === country && o.biasScore >= 1.5),
        }
        return acc
      },
      {} as Record<string, Record<string, typeof mediaOutlets>>,
    )
    return grouped
  }, [filteredOutlets])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading media outlets...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Global Media Bias Dashboard
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-sm text-muted-foreground">
            Understand media bias and press freedom across global news outlets
          </p>
        </div>

        <Card className="mb-6 p-3">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            {/* Filter Icon & Title */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Filters & Sort</h2>
            </div>

            {/* Media Type Tabs - Compact */}
            <Tabs value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="h-7 gap-1 px-2 text-xs">
                  All
                  <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                    {mediaCounts.all}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="traditional" className="h-7 gap-1 px-2 text-xs">
                  Legacy
                  <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                    {mediaCounts.traditional}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="influencer" className="h-7 gap-1 px-2 text-xs">
                  New
                  <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                    {mediaCounts.influencer}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Country Filter - Compact with mobile scrolling */}
            <div className="w-full overflow-x-auto sm:w-auto">
              <Tabs value={selectedCountry} onValueChange={setSelectedCountry}>
                <TabsList className="flex h-8 flex-nowrap justify-start gap-1 bg-transparent p-0 sm:flex-wrap">
                  <TabsTrigger
                    value="all"
                    className="h-7 shrink-0 px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    All
                  </TabsTrigger>
                  {COUNTRIES.map((country) => (
                    <TabsTrigger
                      key={country}
                      value={country}
                      className="h-7 shrink-0 px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {country}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Bias & Sort Filters - Side by side on mobile */}
            <div className="flex w-full gap-2 sm:w-auto">
              <Select value={biasFilter} onValueChange={setBiasFilter}>
                <SelectTrigger className="h-8 flex-1 text-xs sm:w-[140px] sm:flex-none">
                  <SelectValue placeholder="All Bias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bias</SelectItem>
                  <SelectItem value="far-left">Far Left</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="far-right">Far Right</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 flex-1 text-xs sm:w-[140px] sm:flex-none">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score-desc">Highest Score</SelectItem>
                  <SelectItem value="score-asc">Lowest Score</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredOutlets.length}</span> outlets
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 gap-1 px-2 text-xs bg-transparent"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Main Grid */}
        <div className="space-y-12">
          {COUNTRIES.map((country) => {
            const countryData = groupedByCountry[country]
            const hasOutlets = Object.values(countryData).some((arr) => arr.length > 0)

            if (!hasOutlets) return null

            return (
              <div key={country}>
                <h2 className="mb-6 text-xl font-bold text-foreground sm:text-2xl">{country}</h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-6">
                  {/* Far Left */}
                  <div>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--far-left)] sm:text-sm">
                      Far Left
                    </h3>
                    <div className="space-y-4">
                      {countryData["far-left"].length > 0 ? (
                        countryData["far-left"].map((outlet) => <MediaOutletCard key={outlet.id} outlet={outlet} />)
                      ) : (
                        <Card className="p-4">
                          <p className="text-center text-sm text-muted-foreground">No outlets</p>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Left */}
                  <div>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--left-bias)] sm:text-sm">
                      Left
                    </h3>
                    <div className="space-y-4">
                      {countryData["left"].length > 0 ? (
                        countryData["left"].map((outlet) => <MediaOutletCard key={outlet.id} outlet={outlet} />)
                      ) : (
                        <Card className="p-4">
                          <p className="text-center text-sm text-muted-foreground">No outlets</p>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Center */}
                  <div>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--center-bias)] sm:text-sm">
                      Center
                    </h3>
                    <div className="space-y-4">
                      {countryData["center"].length > 0 ? (
                        countryData["center"].map((outlet) => <MediaOutletCard key={outlet.id} outlet={outlet} />)
                      ) : (
                        <Card className="p-4">
                          <p className="text-center text-sm text-muted-foreground">No outlets</p>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Right */}
                  <div>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--right-bias)] sm:text-sm">
                      Right
                    </h3>
                    <div className="space-y-4">
                      {countryData["right"].length > 0 ? (
                        countryData["right"].map((outlet) => <MediaOutletCard key={outlet.id} outlet={outlet} />)
                      ) : (
                        <Card className="p-4">
                          <p className="text-center text-sm text-muted-foreground">No outlets</p>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Far Right */}
                  <div>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--far-right)] sm:text-sm">
                      Far Right
                    </h3>
                    <div className="space-y-4">
                      {countryData["far-right"].length > 0 ? (
                        countryData["far-right"].map((outlet) => <MediaOutletCard key={outlet.id} outlet={outlet} />)
                      ) : (
                        <Card className="p-4">
                          <p className="text-center text-sm text-muted-foreground">No outlets</p>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground sm:text-sm">
            Last updated: January 2025 • Data sources: Multiple independent fact-checkers and media watchdog
            organizations
          </p>
        </div>
      </div>
    </main>
  )
}
