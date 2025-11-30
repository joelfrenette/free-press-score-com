import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { mediaOutlets } from "@/lib/mock-data"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { getBiasLabel, getBiasColor, getScoreColor } from "@/lib/utils"
import {
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  FileText,
  Scale,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Building2,
  Eye,
} from "lucide-react"
import { RefreshDataButton } from "@/components/refresh-data-button"
import { MediaTypeLink } from "@/components/media-type-link"
import { checkIsAdmin } from "@/lib/admin-actions"
import { OutletEditButton } from "@/components/outlet-edit-button"

function formatTimestamp(dateString?: string) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return null
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function LastUpdated({ date, className = "" }: { date?: string; className?: string }) {
  const formatted = formatTimestamp(date)
  if (!formatted) return null
  return <span className={`text-xs text-muted-foreground ${className}`}>Updated: {formatted}</span>
}

interface OutletPageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  return mediaOutlets.map((outlet) => ({
    id: outlet.id,
  }))
}

export default async function OutletPage({ params }: OutletPageProps) {
  const { id } = await params
  const outlet = mediaOutlets.find((o) => o.id === id)

  if (!outlet) {
    notFound()
  }

  const isAdmin = await checkIsAdmin()

  const getSourceUrl = () => {
    if (outlet.outletType === "traditional") {
      // For traditional outlets, we'd need to add their social media URLs to the data
      return undefined
    }
    // For influencers, construct URLs based on platform
    // This is simplified - in production you'd store these URLs in the database
    return undefined
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-4">
          <div className="mb-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left side: Outlet info + 3 score cards */}
            <div className="flex-1">
              {/* Outlet logo, name, badges */}
              <div className="flex items-start gap-4">
                <div className="relative h-20 w-32 overflow-hidden rounded-lg bg-white shadow-sm">
                  <Image
                    src={outlet.logo || "/placeholder.svg"}
                    alt={`${outlet.name} logo`}
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-foreground">{outlet.name}</h1>
                    {outlet.website && (
                      <MediaTypeLink
                        website={outlet.website}
                        outletType={outlet.outletType}
                        platform={outlet.platform}
                        metricsType={outlet.metrics.type}
                        outletName={outlet.name}
                      />
                    )}
                    {outlet.description && (
                      <Badge variant="outline" className="hidden md:inline-flex text-xs font-normal max-w-xs truncate">
                        {outlet.description.length > 50
                          ? outlet.description.substring(0, 50) + "..."
                          : outlet.description}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className={`${getBiasColor(outlet.biasScore)}`}>
                      {getBiasLabel(outlet.biasScore)}
                    </Badge>
                    <Badge variant="outline">{outlet.country}</Badge>
                    {outlet.outletType === "influencer" && outlet.platform && (
                      <Badge variant="outline" className="capitalize">
                        {outlet.platform}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      Updated: {new Date(outlet.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Score cards - moved here, under the outlet info */}
              <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-3">
                <Card className="p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-foreground">Fact-Check Accuracy</h3>
                  </div>
                  <div className="mb-1 flex items-end gap-1">
                    <span className={`text-xl font-bold ${getScoreColor(outlet.factCheckAccuracy)}`}>
                      {outlet.factCheckAccuracy}
                    </span>
                    <span className="mb-0.5 text-xs text-muted-foreground">/ 100</span>
                  </div>
                  <Progress value={outlet.factCheckAccuracy} className="h-1.5" />
                  <LastUpdated date={outlet.lastUpdated} className="mt-1 block text-[10px]" />
                </Card>

                <Card className="p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-foreground">Editorial Independence</h3>
                  </div>
                  <div className="mb-1 flex items-end gap-1">
                    <span className={`text-xl font-bold ${getScoreColor(outlet.editorialIndependence)}`}>
                      {outlet.editorialIndependence}
                    </span>
                    <span className="mb-0.5 text-xs text-muted-foreground">/ 100</span>
                  </div>
                  <Progress value={outlet.editorialIndependence} className="h-1.5" />
                  <LastUpdated date={outlet.lastUpdated} className="mt-1 block text-[10px]" />
                </Card>

                <Card className="p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-foreground">Transparency</h3>
                  </div>
                  <div className="mb-1 flex items-end gap-1">
                    <span className={`text-xl font-bold ${getScoreColor(outlet.transparency)}`}>
                      {outlet.transparency}
                    </span>
                    <span className="mb-0.5 text-xs text-muted-foreground">/ 100</span>
                  </div>
                  <Progress value={outlet.transparency} className="h-1.5" />
                  <LastUpdated date={outlet.lastUpdated} className="mt-1 block text-[10px]" />
                </Card>
              </div>
            </div>

            {/* Right side: Free Press Score + Admin button + Refresh button */}
            <div className="flex flex-col gap-3 lg:w-56">
              {isAdmin && <OutletEditButton outletId={outlet.id} isAdmin={isAdmin} />}

              <Card className="p-6 text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Free Press Score</span>
                </div>
                <div className={`text-5xl font-bold ${getScoreColor(outlet.freePressScore)}`}>
                  {outlet.freePressScore}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">out of 100</div>
                <LastUpdated date={outlet.lastUpdated} className="mt-2 block" />
              </Card>

              <RefreshDataButton outletId={outlet.id} />
            </div>
          </div>

          {outlet.description && <p className="text-sm text-muted-foreground md:hidden">{outlet.description}</p>}
        </div>

        {/* Bias Analysis - Added timestamp */}
        <Card className="mb-8 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-bold text-foreground">Bias Analysis</h2>
            </div>
            <LastUpdated date={outlet.lastUpdated} />
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Political Lean</span>
                <Badge variant="secondary" className={getBiasColor(outlet.biasScore)}>
                  {getBiasLabel(outlet.biasScore)} ({outlet.biasScore > 0 ? "+" : ""}
                  {outlet.biasScore.toFixed(1)})
                </Badge>
              </div>
              <div className="relative h-8 w-full overflow-hidden rounded-lg bg-gradient-to-r from-[var(--far-left)] via-[var(--center-bias)] to-[var(--far-right)]">
                <div
                  className="absolute top-0 h-full w-1 bg-foreground shadow-lg"
                  style={{
                    left: `${((outlet.biasScore + 2) / 4) * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>Far Left</span>
                <span>Center</span>
                <span>Far Right</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted p-4">
              <span className="text-sm font-medium text-foreground">Perspective Coverage</span>
              <Badge variant={outlet.perspectives === "multiple" ? "default" : "secondary"}>
                {outlet.perspectives === "multiple"
                  ? "Multiple Perspectives"
                  : outlet.perspectives === "limited"
                    ? "Limited Perspectives"
                    : "Single Perspective"}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Ownership & Funding - Added timestamp */}
        <Card className="mb-8 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-bold text-foreground">Ownership & Funding</h2>
            </div>
            <LastUpdated
              date={
                typeof outlet.ownership === "object" && outlet.ownership?.verifiedDate
                  ? outlet.ownership.verifiedDate
                  : outlet.lastUpdated
              }
            />
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Ownership</h3>
              {typeof outlet.ownership === "string" ? (
                <p className="text-foreground">{outlet.ownership}</p>
              ) : outlet.ownership ? (
                <div className="space-y-2">
                  <p className="text-foreground">{outlet.ownership.details || outlet.ownership.type}</p>
                  {outlet.ownership.parent && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Parent Company:</span> {outlet.ownership.parent}
                    </p>
                  )}
                  {outlet.ownership.ultimateOwner && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Ultimate Owner:</span> {outlet.ownership.ultimateOwner}
                    </p>
                  )}
                  {outlet.ownership.recentChanges && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Recent Changes:</span> {outlet.ownership.recentChanges}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-foreground">Unknown</p>
              )}
            </div>

            {/* Major Stakeholders */}
            {outlet.stakeholders && outlet.stakeholders.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    Major Stakeholders & Ownership Structure
                  </h3>
                  <div className="space-y-3">
                    {outlet.stakeholders.map((stakeholder, index) => (
                      <div key={index} className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">{stakeholder.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {stakeholder.stake}
                              </Badge>
                            </div>
                            {stakeholder.entity && (
                              <p className="text-xs text-muted-foreground mb-2">{stakeholder.entity}</p>
                            )}
                            <p className="text-sm text-muted-foreground">{stakeholder.description}</p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`shrink-0 text-xs ${
                              stakeholder.politicalLean === "far-left"
                                ? "bg-[var(--far-left)]/20 text-[var(--far-left)]"
                                : stakeholder.politicalLean === "left"
                                  ? "bg-[var(--left-bias)]/20 text-[var(--left-bias)]"
                                  : stakeholder.politicalLean === "center"
                                    ? "bg-[var(--center-bias)]/20 text-[var(--center-bias)]"
                                    : stakeholder.politicalLean === "right"
                                      ? "bg-[var(--right-bias)]/20 text-[var(--right-bias)]"
                                      : stakeholder.politicalLean === "far-right"
                                        ? "bg-[var(--far-right)]/20 text-[var(--far-right)]"
                                        : ""
                            }`}
                          >
                            {stakeholder.politicalLean === "unknown"
                              ? "Unknown"
                              : stakeholder.politicalLean
                                  .split("-")
                                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                  .join(" ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Board Members */}
            {outlet.boardMembers && outlet.boardMembers.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    Board of Directors & Key Leadership
                  </h3>
                  <div className="space-y-3">
                    {outlet.boardMembers.map((member, index) => (
                      <div key={index} className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="mb-1">
                              <span className="font-semibold text-foreground">{member.name}</span>
                            </div>
                            <p className="mb-1 text-sm font-medium text-muted-foreground">{member.position}</p>
                            <p className="text-xs text-muted-foreground mb-2">{member.background}</p>
                            <p className="text-sm text-muted-foreground">{member.description}</p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`shrink-0 text-xs ${
                              member.politicalLean === "far-left"
                                ? "bg-[var(--far-left)]/20 text-[var(--far-left)]"
                                : member.politicalLean === "left"
                                  ? "bg-[var(--left-bias)]/20 text-[var(--left-bias)]"
                                  : member.politicalLean === "center"
                                    ? "bg-[var(--center-bias)]/20 text-[var(--center-bias)]"
                                    : member.politicalLean === "right"
                                      ? "bg-[var(--right-bias)]/20 text-[var(--right-bias)]"
                                      : member.politicalLean === "far-right"
                                        ? "bg-[var(--far-right)]/20 text-[var(--far-right)]"
                                        : ""
                            }`}
                          >
                            {member.politicalLean === "unknown"
                              ? "Unknown"
                              : member.politicalLean
                                  .split("-")
                                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                  .join(" ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Funding Sources */}
            {outlet.funding && Array.isArray(outlet.funding) && outlet.funding.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Funding Sources</h3>
                <div className="flex flex-wrap gap-2">
                  {outlet.funding.map((source, index) => (
                    <Badge key={index} variant="outline">
                      <DollarSign className="mr-1 h-3 w-3" />
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Major Financial Sponsors & Supporters */}
            {outlet.sponsors && outlet.sponsors.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    Major Financial Sponsors & Supporters
                  </h3>
                  <div className="space-y-2">
                    {outlet.sponsors.map((sponsor, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3"
                      >
                        <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-semibold text-foreground">{sponsor.name}</span>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {sponsor.type.replace("-", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{sponsor.relationship}</p>
                          {sponsor.amount && (
                            <p className="mt-1 text-xs font-medium text-accent">Amount: {sponsor.amount}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Accountability Metrics - Added timestamp */}
        {(outlet.retractions.length > 0 || outlet.lawsuits.length > 0 || outlet.scandals.length > 0) && (
          <Card className="mb-8 p-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h2 className="text-xl font-bold text-foreground">Accountability Metrics</h2>
              </div>
              <LastUpdated date={outlet.lastUpdated} />
            </div>

            <div className="space-y-6">
              {/* Retractions */}
              {outlet.retractions.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4" />
                    Retractions ({outlet.retractions.length})
                  </h3>
                  <div className="space-y-3">
                    {outlet.retractions.map((retraction, index) => (
                      <div key={index} className="rounded-lg border border-border bg-muted/50 p-4">
                        <div className="mb-1 flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(retraction.date).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="mb-1 font-semibold text-foreground">{retraction.title}</h4>
                        <p className="text-sm text-muted-foreground">{retraction.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lawsuits */}
              {outlet.lawsuits.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Scale className="h-4 w-4" />
                    Legal Cases ({outlet.lawsuits.length})
                  </h3>
                  <div className="space-y-3">
                    {outlet.lawsuits.map((lawsuit, index) => (
                      <div key={index} className="rounded-lg border border-border bg-muted/50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(lawsuit.date).toLocaleDateString()}
                            </span>
                          </div>
                          <Badge
                            variant={
                              lawsuit.status === "active"
                                ? "destructive"
                                : lawsuit.status === "settled"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {lawsuit.status === "active" && <XCircle className="mr-1 h-3 w-3" />}
                            {lawsuit.status === "settled" && <DollarSign className="mr-1 h-3 w-3" />}
                            {lawsuit.status === "dismissed" && <CheckCircle className="mr-1 h-3 w-3" />}
                            {lawsuit.status}
                          </Badge>
                        </div>
                        <div className="mb-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {lawsuit.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{lawsuit.description}</p>
                        {lawsuit.amount && (
                          <p className="mt-2 text-sm font-semibold text-destructive">
                            Settlement: ${lawsuit.amount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scandals */}
              {outlet.scandals.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Flag className="h-4 w-4" />
                    Controversies & Scandals ({outlet.scandals.length})
                  </h3>
                  <div className="space-y-3">
                    {outlet.scandals.map((scandal, index) => (
                      <div key={index} className="rounded-lg border border-border bg-muted/50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(scandal.date).toLocaleDateString()}
                            </span>
                          </div>
                          <Badge
                            variant={
                              scandal.severity === "major"
                                ? "destructive"
                                : scandal.severity === "moderate"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {scandal.severity}
                          </Badge>
                        </div>
                        <h4 className="mb-1 font-semibold text-foreground">{scandal.title}</h4>
                        <p className="text-sm text-muted-foreground">{scandal.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Disclaimer */}
        <Card className="border-accent/50 bg-accent/5 p-6">
          <h3 className="mb-2 font-semibold text-foreground">Methodology Note</h3>
          <p className="text-sm text-muted-foreground">
            Our scores are derived from multiple independent fact-checking organizations, media watchdog groups, and
            transparency reports. Bias scores reflect editorial positioning based on content analysis. For more
            information about our methodology,{" "}
            <Link href="/methodology" className="font-medium text-accent hover:underline">
              click here
            </Link>
            .
          </p>
        </Card>
      </div>
    </main>
  )
}
