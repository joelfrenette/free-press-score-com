"use client"

import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { getBiasLabel, getBiasColor, getScoreColor } from "@/lib/utils"
import type { MediaOutlet } from "@/lib/types"
import {
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  FileText,
  Scale,
  Flag,
  CheckCircle,
  Clock,
  ExternalLink,
  Users,
  Building2,
  Tv,
  Newspaper,
  Globe,
  Mic,
  Youtube,
  Twitter,
  RefreshCw,
  Eye,
} from "lucide-react"
import { useParams } from "next/navigation"
import { RefreshDataButton } from "@/components/refresh-data-button"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function formatDate(dateString: string | undefined) {
  if (!dateString) return "Unknown"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatShortDate(dateString: string | undefined) {
  if (!dateString) return "Unknown"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  })
}

function getMediaTypeIcon(outlet: MediaOutlet) {
  if (outlet.outletType === "influencer") {
    if (outlet.platform === "youtube") return <Youtube className="h-5 w-5" />
    if (outlet.platform === "podcast") return <Mic className="h-5 w-5" />
    if (outlet.platform === "twitter") return <Twitter className="h-5 w-5" />
    if (outlet.platform === "tiktok") return <Globe className="h-5 w-5" />
    return <Globe className="h-5 w-5" />
  }

  if (outlet.metrics?.type === "tv") return <Tv className="h-5 w-5" />
  if (outlet.metrics?.type === "print") return <Newspaper className="h-5 w-5" />
  if (outlet.metrics?.type === "podcast") return <Mic className="h-5 w-5" />
  return <Globe className="h-5 w-5" />
}

function getOwnershipDetails(ownership: MediaOutlet["ownership"]) {
  if (typeof ownership === "string") {
    return { type: "Unknown", details: ownership }
  }
  return ownership
}

function getFundingDetails(funding: MediaOutlet["funding"]) {
  if (Array.isArray(funding)) {
    return { sources: funding, details: funding.join(", ") }
  }
  return funding
}

export default function OutletDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data, error, isLoading } = useSWR<{
    outlets: MediaOutlet[]
    total: number
  }>("/api/outlets", fetcher)

  const outlet = data?.outlets?.find((o) => o.id === id)

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading outlet details...</p>
        </div>
      </main>
    )
  }

  if (error || !outlet) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold mb-2">Outlet Not Found</h1>
          <p className="text-muted-foreground mb-4">The media outlet you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </main>
    )
  }

  const ownershipData = getOwnershipDetails(outlet.ownership)
  const fundingData = getFundingDetails(outlet.funding)
  const hasIssues = (outlet.lawsuits?.length ?? 0) > 0 || (outlet.scandals?.length ?? 0) > 0

  const factCheckScore = outlet.factCheckAccuracy ?? 0
  const editorialScore = outlet.editorialIndependence ?? 0
  const transparencyScore = outlet.transparency ?? 0
  const freePressScore = outlet.freePressScore ?? 0

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column: Header + Score Cards */}
              <div className="flex-1">
                {/* Header: Logo, name, badges */}
                <div className="flex items-start gap-4 mb-6">
                  {/* Logo */}
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted border">
                    <Image
                      src={outlet.logo || "/placeholder.svg"}
                      alt={`${outlet.name} logo`}
                      fill
                      className="object-contain p-2"
                    />
                  </div>

                  {/* Name and badges */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold text-foreground">{outlet.name}</h1>
                      {getMediaTypeIcon(outlet)}
                      {outlet.description && (
                        <Badge variant="outline" className="font-normal">
                          {outlet.description}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className={`${getBiasColor(outlet.biasScore)}`}>{getBiasLabel(outlet.biasScore)}</Badge>
                      <Badge variant="secondary">{outlet.country}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Updated: {formatShortDate(outlet.lastUpdated)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Three Score Cards - directly under header */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <CheckCircle className="h-4 w-4" />
                        Fact-Check Accuracy
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-bold ${getScoreColor(factCheckScore)}`}>{factCheckScore}</span>
                        <span className="text-muted-foreground">/ 100</span>
                      </div>
                      <Progress value={factCheckScore} className="h-2 mt-2" />
                      <div className="text-xs text-primary mt-2">Updated: {formatDate(outlet.lastUpdated)}</div>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Eye className="h-4 w-4" />
                        Editorial Independence
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-bold ${getScoreColor(editorialScore)}`}>{editorialScore}</span>
                        <span className="text-muted-foreground">/ 100</span>
                      </div>
                      <Progress value={editorialScore} className="h-2 mt-2" />
                      <div className="text-xs text-primary mt-2">Updated: {formatDate(outlet.lastUpdated)}</div>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <FileText className="h-4 w-4" />
                        Transparency
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-bold ${getScoreColor(transparencyScore)}`}>
                          {transparencyScore}
                        </span>
                        <span className="text-muted-foreground">/ 100</span>
                      </div>
                      <Progress value={transparencyScore} className="h-2 mt-2" />
                      <div className="text-xs text-primary mt-2">Updated: {formatDate(outlet.lastUpdated)}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Column: Free Press Score + Refresh Button */}
              <div className="w-full lg:w-52 flex-shrink-0">
                <Card className="border shadow-sm h-full">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <TrendingUp className="h-4 w-4" />
                      Free Press Score
                    </div>
                    <div className={`text-5xl font-bold text-center ${getScoreColor(freePressScore)}`}>
                      {freePressScore}
                    </div>
                    <div className="text-sm text-muted-foreground text-center">out of 100</div>
                    <div className="text-xs text-primary text-center mt-2">
                      Updated: {formatDate(outlet.lastUpdated)}
                    </div>
                    <div className="mt-auto pt-4">
                      <RefreshDataButton outletId={outlet.id} outletName={outlet.name} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bias Analysis Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Bias Analysis</h2>
              </div>
              <span className="text-xs text-primary">Updated: {formatDate(outlet.lastUpdated)}</span>
            </div>

            {/* Political Lean */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Political Lean</span>
                <Badge variant="outline" className="text-primary border-primary">
                  {getBiasLabel(outlet.biasScore)} ({outlet.biasScore > 0 ? "+" : ""}
                  {outlet.biasScore.toFixed(1)})
                </Badge>
              </div>
              <div className="relative">
                <div className="h-4 rounded-full overflow-hidden bg-gradient-to-r from-blue-600 via-gray-400 to-red-600" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-3 border-foreground shadow-lg ring-2 ring-foreground/20"
                  style={{
                    left: `${((outlet.biasScore + 2) / 4) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    border: "3px solid #1a1a1a",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span className="text-blue-600 font-medium">Far Left</span>
                <span>Center</span>
                <span className="text-red-600 font-medium">Far Right</span>
              </div>
            </div>

            {/* Perspective Coverage */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Perspective Coverage</span>
              <Badge
                variant={
                  outlet.perspectives === "multiple"
                    ? "default"
                    : outlet.perspectives === "limited"
                      ? "secondary"
                      : "outline"
                }
              >
                {outlet.perspectives === "multiple"
                  ? "Multiple Perspectives"
                  : outlet.perspectives === "limited"
                    ? "Limited Perspectives"
                    : "Single Perspective"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid - rest of the page */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Ownership & Funding */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Ownership & Funding
                </CardTitle>
                <span className="text-xs text-primary">Updated: {formatDate(outlet.lastUpdated)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-foreground">Ownership</h4>
                <p className="text-sm text-muted-foreground">{ownershipData.type}</p>
                <p className="mt-1 text-sm">{ownershipData.details}</p>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium text-foreground">Funding Sources</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {fundingData.sources?.map((source, i) => (
                    <Badge key={i} variant="secondary">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
              {outlet.sponsors && outlet.sponsors.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-foreground">Key Sponsors</h4>
                    <ul className="mt-2 space-y-1">
                      {outlet.sponsors.slice(0, 5).map((sponsor, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-medium">{sponsor.name}</span>
                          <span className="text-muted-foreground"> - {sponsor.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stakeholders & Board */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Key Stakeholders
                </CardTitle>
                <span className="text-xs text-primary">Updated: {formatDate(outlet.lastUpdated)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {outlet.stakeholders && outlet.stakeholders.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground">Major Stakeholders</h4>
                  <ul className="mt-2 space-y-2">
                    {outlet.stakeholders.map((stakeholder, i) => (
                      <li key={i} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{stakeholder.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {stakeholder.stake}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{stakeholder.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {outlet.boardMembers && outlet.boardMembers.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-foreground">Board Members</h4>
                    <ul className="mt-2 space-y-2">
                      {outlet.boardMembers.slice(0, 5).map((member, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-medium">{member.name}</span>
                          <span className="text-muted-foreground"> - {member.position}</span>
                          <p className="text-xs text-muted-foreground">{member.background}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Accountability & Retractions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Accountability Record
                </CardTitle>
                <span className="text-xs text-primary">Updated: {formatDate(outlet.lastUpdated)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {outlet.retractions && outlet.retractions.length > 0 ? (
                <div>
                  <h4 className="font-medium text-foreground">Recent Retractions</h4>
                  <ul className="mt-2 space-y-2">
                    {outlet.retractions.slice(0, 3).map((retraction, i) => (
                      <li key={i} className="rounded-lg border p-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {retraction.date}
                        </div>
                        <p className="mt-1">{retraction.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">No major retractions on record</span>
                </div>
              )}

              {outlet.accountability && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-foreground">Correction Policy</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{outlet.accountability.corrections}</p>
                    {outlet.accountability.details && <p className="mt-1 text-sm">{outlet.accountability.details}</p>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Legal Issues & Scandals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Legal History & Scandals
                </CardTitle>
                <span className="text-xs text-primary">Updated: {formatDate(outlet.lastUpdated)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {outlet.lawsuits && outlet.lawsuits.length > 0 ? (
                <div>
                  <h4 className="font-medium text-foreground">Lawsuits</h4>
                  <ul className="mt-2 space-y-2">
                    {outlet.lawsuits.map((lawsuit, i) => (
                      <li key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{lawsuit.case || lawsuit.type}</span>
                          <Badge
                            variant={lawsuit.status === "dismissed" ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {lawsuit.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">{lawsuit.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">No major lawsuits on record</span>
                </div>
              )}

              {outlet.scandals && outlet.scandals.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-foreground">Scandals</h4>
                    <ul className="mt-2 space-y-2">
                      {outlet.scandals.map((scandal, i) => (
                        <li key={i} className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{scandal.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {scandal.severity}
                            </Badge>
                          </div>
                          <p className="mt-1 text-muted-foreground">{scandal.description}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audience Metrics */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Audience & Reach
              </CardTitle>
              <span className="text-xs text-primary">Updated: {formatDate(outlet.lastUpdated)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-sm text-muted-foreground">Avg. Monthly Audience</div>
                <div className="mt-1 text-xl font-bold text-foreground">
                  {outlet.metrics?.avgMonthlyAudience ?? "N/A"}
                </div>
              </div>
              {outlet.metrics?.digitalSubscribers && (
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-sm text-muted-foreground">Digital Subscribers</div>
                  <div className="mt-1 text-xl font-bold text-foreground">{outlet.metrics.digitalSubscribers}</div>
                </div>
              )}
              {outlet.metrics?.totalFollowers && (
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-sm text-muted-foreground">Total Followers</div>
                  <div className="mt-1 text-xl font-bold text-foreground">{outlet.metrics.totalFollowers}</div>
                </div>
              )}
              {outlet.metrics?.engagementRate && (
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-sm text-muted-foreground">Engagement Rate</div>
                  <div className="mt-1 text-xl font-bold text-foreground">{outlet.metrics.engagementRate}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/50 p-4">
          <div className="text-sm text-muted-foreground">
            <Clock className="mr-1 inline-block h-4 w-4" />
            Last updated: {formatDate(outlet.lastUpdated)}
          </div>
          <div className="flex gap-2">
            {outlet.website && (
              <Button variant="outline" asChild>
                <a href={outlet.website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Website
                </a>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/compare?outlet1=${outlet.id}`}>
                <Scale className="mr-2 h-4 w-4" />
                Compare
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
