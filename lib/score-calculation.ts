import type { MediaOutlet } from "./types"

/**
 * Calculate scores for a media outlet based on its data
 * Returns updated score fields that should be merged into the outlet
 */
export function calculateScoresFromData(outlet: MediaOutlet): Partial<MediaOutlet> | null {
  try {
    // Calculate Fact-Check Accuracy (0-100)
    // Based on retractions, corrections, and legal cases
    let factCheckAccuracy = 80 // Base score

    // Penalize for retractions
    const retractionCount = outlet.retractions?.length || 0
    factCheckAccuracy -= Math.min(retractionCount * 5, 30) // Max 30 point penalty

    // Penalize for defamation lawsuits
    const defamationCases =
      outlet.lawsuits?.filter((l) => l.type === "defamation" || l.description?.toLowerCase().includes("defamation"))
        .length || 0
    factCheckAccuracy -= Math.min(defamationCases * 8, 20) // Max 20 point penalty

    // Bonus for accountability measures
    if (outlet.accountability?.correctionPolicy?.exists) {
      factCheckAccuracy += 5
    }
    if (outlet.accountability?.factChecking?.hasTeam) {
      factCheckAccuracy += 5
    }

    factCheckAccuracy = Math.max(0, Math.min(100, factCheckAccuracy))

    // Calculate Editorial Independence (0-100)
    // Based on ownership structure, funding sources, and stakeholder influence
    let editorialIndependence = 75 // Base score

    // Check ownership type
    const ownershipType =
      typeof outlet.ownership === "string"
        ? outlet.ownership.toLowerCase()
        : outlet.ownership?.type?.toLowerCase() || ""

    if (ownershipType.includes("public") || ownershipType.includes("nonprofit")) {
      editorialIndependence += 10
    } else if (ownershipType.includes("state") || ownershipType.includes("government")) {
      editorialIndependence -= 20
    } else if (ownershipType.includes("family") || ownershipType.includes("independent")) {
      editorialIndependence += 5
    }

    // Check for government funding
    const fundingData = typeof outlet.funding === "object" && !Array.isArray(outlet.funding) ? outlet.funding : null
    if (fundingData?.governmentFunding?.hasGovFunding) {
      editorialIndependence -= 15
    }

    // Check for diverse stakeholders (more diverse = more independent)
    const stakeholderCount = outlet.stakeholders?.length || 0
    if (stakeholderCount > 3) {
      editorialIndependence += 5
    } else if (stakeholderCount === 1) {
      editorialIndependence -= 5
    }

    editorialIndependence = Math.max(0, Math.min(100, editorialIndependence))

    // Calculate Transparency (0-100)
    // Based on disclosure of ownership, funding, and accountability measures
    let transparency = 70 // Base score

    // Check ownership transparency
    if (typeof outlet.ownership === "object" && outlet.ownership?.details) {
      transparency += 5
      if (outlet.ownership.shareholders && outlet.ownership.shareholders.length > 0) {
        transparency += 5
      }
      if (outlet.ownership.confidence === "high") {
        transparency += 5
      }
    }

    // Check funding transparency
    if (fundingData) {
      if (fundingData.sources && fundingData.sources.length > 0) {
        transparency += 5
      }
      if (fundingData.financialTransparency === "high") {
        transparency += 10
      } else if (fundingData.financialTransparency === "medium") {
        transparency += 5
      }
    }

    // Check accountability transparency
    if (outlet.accountability) {
      if (outlet.accountability.correctionPolicy?.visible) {
        transparency += 5
      }
      if (outlet.accountability.ethicsCode?.exists) {
        transparency += 5
      }
    }

    // Bonus for board member disclosure
    if (outlet.boardMembers && outlet.boardMembers.length > 0) {
      transparency += 5
    }

    transparency = Math.max(0, Math.min(100, transparency))

    // Calculate overall Free Press Score (weighted average)
    const freePressScore = Math.round(factCheckAccuracy * 0.35 + editorialIndependence * 0.35 + transparency * 0.3)

    return {
      factCheckAccuracy: Math.round(factCheckAccuracy),
      editorialIndependence: Math.round(editorialIndependence),
      transparency: Math.round(transparency),
      freePressScore: Math.max(0, Math.min(100, freePressScore)),
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error("[v0] Error calculating scores:", error)
    return null
  }
}
