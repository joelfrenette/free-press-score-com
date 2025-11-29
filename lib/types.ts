export interface MediaOutlet {
  id: string
  name: string
  country: string
  biasScore: number // -2 (far left) to +2 (far right), 0 is center
  freePressScore: number // 0-100
  logo: string
  description: string
  ownership: string | OwnershipData // Can now be string or structured data
  funding: string[] | FundingData // Can now be array or structured data
  website: string
  sponsors: Sponsor[]
  stakeholders: Stakeholder[]
  boardMembers: BoardMember[]
  metrics: IndustryMetrics
  outletType: "traditional" | "influencer"
  platform?: "podcast" | "youtube" | "tiktok" | "twitter" | "multi-platform"
  retractions: Retraction[]
  lawsuits: Lawsuit[]
  scandals: Scandal[]
  factCheckAccuracy: number // 0-100
  editorialIndependence: number // 0-100
  transparency: number // 0-100
  perspectives: "single" | "limited" | "multiple"
  lastUpdated: string

  legalCases?: LegalCasesData
  audienceData?: AudienceData
  audienceSize?: number
  accountability?: AccountabilityData
  type?: "tv" | "print" | "radio" | "podcast" | "social" | "legacy" | "digital"
  overallScore?: number
  scores?: {
    ownershipTransparency: number
    journalisticStandards: number
    correctionPolicy: number
    financialTransparency: number
  }
}

export interface OwnershipData {
  type: string
  details: string
  parent?: string
  ultimateOwner?: string
  shareholders?: Array<{ name: string; stake: string }>
  recentChanges?: string
  crossOwnership?: string[]
  verifiedDate?: string
  confidence?: "high" | "medium" | "low"
}

export interface FundingData {
  sources: string[]
  details: string
  sponsors?: Array<{ name: string; type: string }>
  politicalDonors?: Array<{ name: string; affiliation: string }>
  governmentFunding?: { hasGovFunding: boolean; details: string }
  foundationSupport?: Array<{ name: string; amount: string }>
  estimatedRevenue?: string
  financialTransparency?: "high" | "medium" | "low"
}

export interface LegalCasesData {
  defamationCases?: Array<{
    year: number
    plaintiff: string
    outcome: "won" | "lost" | "settled" | "pending"
    amount?: string
    summary: string
  }>
  fccViolations?: Array<{
    year: number
    type: string
    fine: string
    details: string
  }>
  copyrightCases?: Array<{ year: number; details: string }>
  privacyCases?: Array<{ year: number; details: string }>
  courtOrderedRetractions?: number
  totalSettlements?: string
  legalRiskScore?: "high" | "medium" | "low"
  confidence?: "high" | "medium" | "low"
}

export interface AudienceData {
  monthlyVisitors?: number
  tvViewership?: {
    averageViewers: number
    peakViewers: number
    share: string
  }
  socialMedia?: {
    twitter?: number
    facebook?: number
    youtube?: number
    instagram?: number
    tiktok?: number
  }
  podcastDownloads?: number
  printCirculation?: number
  subscribers?: {
    paid?: number
    free?: number
  }
  totalReach?: number
  growthTrend?: "growing" | "stable" | "declining"
  lastUpdated?: string
  confidence?: "high" | "medium" | "low"
}

export interface AccountabilityData {
  corrections: string
  details: string
  correctionPolicy?: {
    exists: boolean
    visible: boolean
    url?: string
    quality: "high" | "medium" | "low"
  }
  ethicsCode?: {
    exists: boolean
    details: string
  }
  factChecking?: {
    hasTeam: boolean
    partnerships: string[]
  }
  responseToCriticism?: "transparent" | "defensive" | "dismissive" | "none"
  notableCorrections?: Array<{
    year: number
    topic: string
    details: string
  }>
  awards?: Array<{
    year: number
    award: string
    category: string
  }>
  memberships?: string[]
  accountabilityScore?: "high" | "medium" | "low"
}

export interface IndustryMetrics {
  type: "tv" | "print" | "digital" | "mixed" | "podcast" | "social"
  avgMonthlyAudience: string
  digitalSubscribers?: string
  totalFollowers?: string
  avgViewsPerVideo?: string
  engagementRate?: string
}

export interface Retraction {
  date: string
  title?: string
  description: string
}

export interface Lawsuit {
  date?: string
  case?: string
  year?: number
  type?: "defamation" | "misinformation" | "other"
  status: "active" | "settled" | "dismissed" | "Settled"
  description: string
  amount?: number | string
}

export interface Scandal {
  date?: string
  year?: number
  title: string
  description: string
  severity: "minor" | "moderate" | "major" | "medium"
}

export interface Sponsor {
  name: string
  type:
    | "advertiser"
    | "investor"
    | "donor"
    | "parent-company"
    | "government"
    | "Advertiser"
    | "subscriber"
    | "revenue"
    | "owner"
  amount?: string
  relationship: string
}

export interface Stakeholder {
  name: string
  stake: string
  entity?: string
  politicalLean: "far-left" | "left" | "center" | "right" | "far-right" | "unknown" | "center-right" | "center-left"
  description: string
}

export interface BoardMember {
  name: string
  position: string
  background: string
  politicalLean?: "far-left" | "left" | "center" | "right" | "far-right" | "unknown" | "center-right" | "center-left"
  description?: string
}

export const COUNTRIES = [
  "United States",
  "Canada",
  "Australia",
  "United Kingdom",
  "France",
  "Germany",
  "Japan",
  "Russia",
  "China",
  "India",
  "Central & South America",
  "Middle East",
] as const

export type Country = (typeof COUNTRIES)[number]

export const BIAS_CATEGORIES = {
  "far-left": { min: -2, max: -1.5, label: "Far Left" },
  left: { min: -1.49, max: -0.5, label: "Left" },
  center: { min: -0.49, max: 0.49, label: "Center" },
  right: { min: 0.5, max: 1.49, label: "Right" },
  "far-right": { min: 1.5, max: 2, label: "Far Right" },
} as const
