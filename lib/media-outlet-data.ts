import type { MediaOutlet } from "./types"
import { loadOutletsFromBlob } from "./blob-storage"

export type { MediaOutlet } from "./types"

let hasLoadedFromBlob = false
let saveTimeout: NodeJS.Timeout | null = null

// Helper function for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/^the\s+/i, "") // Remove leading "The"
    .replace(/\s+(show|podcast|news|network|media|channel|tv|radio)$/i, "") // Remove common suffixes
    .replace(/[^\w\s]/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Normalize spaces
    .trim()
}

function extractDomain(url: string | undefined): string | null {
  if (!url) return null
  try {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname
    return domain.replace(/^www\./, "").toLowerCase()
  } catch {
    return null
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  if (s1 === s2) return 1

  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1

  if (longer.length === 0) return 1

  // Check if one contains the other
  if (longer.includes(shorter)) {
    return shorter.length / longer.length
  }

  // Levenshtein distance
  const costs: number[] = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }

  return (longer.length - costs[s2.length]) / longer.length
}

async function saveOutletsViaApi(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/save-outlets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outlets: mediaOutlets }),
    })

    const result = await response.json()

    if (result.success) {
      console.log(`[v0] Saved ${mediaOutlets.length} outlets via API`)
    } else {
      console.error("[v0] Error saving outlets via API:", result.error)
    }

    return result
  } catch (error) {
    console.error("[v0] Error saving outlets via API:", error)
    return { success: false, error: String(error) }
  }
}

async function debouncedSaveToBlob() {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(async () => {
    console.log("[v0] Auto-saving outlets to Blob...")
    await saveOutletsViaApi()
  }, 2000) // Wait 2 seconds after last change before saving
} // Added missing closing brace for the function

export async function saveOutlets(): Promise<{ success: boolean; error?: string }> {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  const result = await saveOutletsViaApi()
  return result
}

export async function loadOutlets(): Promise<{ loaded: boolean; count: number; source: string }> {
  if (hasLoadedFromBlob) {
    return { loaded: true, count: mediaOutlets.length, source: "cache" }
  }

  try {
    const { outlets, error } = await loadOutletsFromBlob()

    if (outlets && outlets.length > 0) {
      // Replace in-memory array with blob data
      mediaOutlets.length = 0
      mediaOutlets.push(...outlets)
      hasLoadedFromBlob = true
      console.log(`[v0] Loaded ${outlets.length} outlets from Blob storage`)
      return { loaded: true, count: outlets.length, source: "blob" }
    } else {
      hasLoadedFromBlob = true
      console.log(`[v0] No blob data found, using seed data (${mediaOutlets.length} outlets)`)
      return { loaded: true, count: mediaOutlets.length, source: "seed" }
    }
  } catch (error) {
    console.error("[v0] Failed to load from Blob:", error)
    hasLoadedFromBlob = true
    return { loaded: false, count: mediaOutlets.length, source: "seed" }
  }
}

export async function loadFromBlobOnce(): Promise<{ loaded: boolean; count: number }> {
  try {
    const { outlets } = await loadOutletsFromBlob()
    if (outlets && outlets.length > 0) {
      // Replace in-memory array with fresh blob data
      mediaOutlets.length = 0
      mediaOutlets.push(...outlets)
      hasLoadedFromBlob = true
      return { loaded: true, count: outlets.length }
    }
    return { loaded: false, count: mediaOutlets.length }
  } catch (error) {
    console.error("[v0] Failed to reload from Blob:", error)
    return { loaded: false, count: mediaOutlets.length }
  }
}

export function getLoadStatus(): { hasLoaded: boolean; count: number } {
  return { hasLoaded: hasLoadedFromBlob, count: mediaOutlets.length }
}

export function getOutlets(): MediaOutlet[] {
  return mediaOutlets
}

export function updateOutlet(id: string, updates: Partial<MediaOutlet>): boolean {
  const index = mediaOutlets.findIndex((o) => o.id === id)
  if (index !== -1) {
    // Always update the lastUpdated timestamp when data changes
    const updatesWithTimestamp = {
      ...updates,
      lastUpdated: new Date().toISOString(),
    }
    mediaOutlets[index] = { ...mediaOutlets[index], ...updatesWithTimestamp }
    console.log(`[v0] Updated outlet ${id} with new data (timestamp: ${updatesWithTimestamp.lastUpdated})`)
    debouncedSaveToBlob() // Auto-save after update
    return true
  }
  return false
}

export function addOutlet(outlet: MediaOutlet): boolean {
  // Check if outlet already exists
  const exists = mediaOutlets.some((o) => o.id === outlet.id)
  if (exists) {
    console.log(`[v0] Outlet ${outlet.id} already exists, skipping`)
    return false
  }
  mediaOutlets.push(outlet)
  console.log(`[v0] Added new outlet: ${outlet.name}`)
  debouncedSaveToBlob() // Auto-save after add
  return true
}

export function getOutletCount(): number {
  return mediaOutlets.length
}

export function outletExists(
  name: string,
  website?: string,
): { exists: boolean; matchedOutlet?: string; matchType?: string } {
  const normalizedName = name.toLowerCase().trim()

  // Remove common prefixes/suffixes for better matching
  const cleanName = normalizedName
    .replace(/^the\s+/i, "")
    .replace(/\s+(news|network|media|online|digital|tv|radio)$/i, "")
    .trim()

  for (const outlet of mediaOutlets) {
    const existingName = outlet.name.toLowerCase().trim()
    const existingCleanName = existingName
      .replace(/^the\s+/i, "")
      .replace(/\s+(news|network|media|online|digital|tv|radio)$/i, "")
      .trim()

    // Exact match
    if (existingName === normalizedName) {
      return { exists: true, matchedOutlet: outlet.name, matchType: "exact" }
    }

    // Clean name exact match
    if (existingCleanName === cleanName && cleanName.length > 3) {
      return { exists: true, matchedOutlet: outlet.name, matchType: "similar" }
    }

    // One contains the other (for longer names only to avoid false positives)
    if (cleanName.length > 5 && existingCleanName.length > 5) {
      if (existingCleanName.includes(cleanName) || cleanName.includes(existingCleanName)) {
        return { exists: true, matchedOutlet: outlet.name, matchType: "partial" }
      }
    }

    // Website match (if provided)
    if (website && outlet.website) {
      const normalizedWebsite = website
        .toLowerCase()
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\/$/, "")
      const existingWebsite = outlet.website
        .toLowerCase()
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\/$/, "")

      if (normalizedWebsite === existingWebsite) {
        return { exists: true, matchedOutlet: outlet.name, matchType: "website" }
      }

      // Check if domains match (e.g., cnn.com matches edition.cnn.com)
      const newDomain = normalizedWebsite.split("/")[0]
      const existingDomain = existingWebsite.split("/")[0]
      if (
        newDomain === existingDomain ||
        newDomain.endsWith("." + existingDomain) ||
        existingDomain.endsWith("." + newDomain)
      ) {
        return { exists: true, matchedOutlet: outlet.name, matchType: "domain" }
      }
    }

    // Levenshtein distance for very similar names (typos, minor variations)
    if (cleanName.length > 4 && existingCleanName.length > 4) {
      const distance = levenshteinDistance(cleanName, existingCleanName)
      const maxLen = Math.max(cleanName.length, existingCleanName.length)
      const similarity = 1 - distance / maxLen

      if (similarity > 0.85) {
        return { exists: true, matchedOutlet: outlet.name, matchType: "fuzzy" }
      }
    }
  }

  return { exists: false }
}

// Updated findAllDuplicates to use new helper functions
export function findAllDuplicates(): Array<{
  name: string
  ids: string[]
  count: number
  matchType: string
}> {
  const duplicates: Array<{ name: string; ids: string[]; count: number; matchType: string }> = []
  const processed = new Set<string>()

  for (let i = 0; i < mediaOutlets.length; i++) {
    if (processed.has(mediaOutlets[i].id)) continue

    const outlet = mediaOutlets[i]
    const normalizedName = normalizeForComparison(outlet.name)
    const domain = extractDomain(outlet.website)
    const matchingIds: string[] = [outlet.id]
    let matchType = ""

    for (let j = i + 1; j < mediaOutlets.length; j++) {
      if (processed.has(mediaOutlets[j].id)) continue

      const other = mediaOutlets[j]
      const otherNormalized = normalizeForComparison(other.name)
      const otherDomain = extractDomain(other.website)

      // Exact name match (normalized)
      if (normalizedName === otherNormalized) {
        matchingIds.push(other.id)
        matchType = "exact name"
        processed.add(other.id)
        continue
      }

      // Same domain
      if (domain && otherDomain && domain === otherDomain) {
        matchingIds.push(other.id)
        matchType = matchType || "same website"
        processed.add(other.id)
        continue
      }

      // High similarity (>85%)
      const similarity = calculateSimilarity(normalizedName, otherNormalized)
      if (similarity > 0.85) {
        matchingIds.push(other.id)
        matchType = matchType || `similar (${Math.round(similarity * 100)}%)`
        processed.add(other.id)
        continue
      }
    }

    if (matchingIds.length > 1) {
      duplicates.push({
        name: outlet.name,
        ids: matchingIds,
        count: matchingIds.length,
        matchType: matchType || "exact name",
      })
      processed.add(outlet.id)
    }
  }

  return duplicates
}

// Updated removeDuplicates to use findAllDuplicates
export function removeDuplicates(): {
  removed: number
  duplicatesFound: Array<{ name: string; kept: string; removed: string[] }>
} {
  const duplicates = findAllDuplicates()
  const duplicatesFound: Array<{ name: string; kept: string; removed: string[] }> = []
  const idsToRemove = new Set<string>()

  for (const dup of duplicates) {
    // Keep the first ID, remove the rest
    const [keepId, ...removeIds] = dup.ids
    removeIds.forEach((id) => idsToRemove.add(id))

    duplicatesFound.push({
      name: dup.name,
      kept: keepId,
      removed: removeIds,
    })
  }

  // Actually remove the duplicates from the array
  const initialCount = mediaOutlets.length
  mediaOutlets = mediaOutlets.filter((outlet) => !idsToRemove.has(outlet.id))
  const removedCount = initialCount - mediaOutlets.length

  console.log(`[v0] Removed ${removedCount} duplicate outlets. New total: ${mediaOutlets.length}`)

  return {
    removed: removedCount,
    duplicatesFound,
  }
}

export function removeOutletById(id: string): boolean {
  const index = mediaOutlets.findIndex((o) => o.id === id)
  if (index !== -1) {
    mediaOutlets.splice(index, 1)
    debouncedSaveToBlob() // Auto-save after removal
    return true
  }
  return false
}

// Calculations: TV primetime × 30 days, digital monthly visitors, print circulation × 30
export let mediaOutlets: MediaOutlet[] = [
  // ===== UNITED STATES - TRADITIONAL MEDIA =====
  {
    id: "msnbc",
    name: "MSNBC",
    country: "United States",
    biasScore: -1.8,
    freePressScore: 72,
    logo: "/msnbc-news-logo.jpg",
    description: "American news-based cable channel owned by NBCUniversal",
    ownership: "Comcast (NBCUniversal)",
    funding: ["Advertising", "Cable subscriptions"],
    website: "https://www.msnbc.com",
    outletType: "traditional",
    metrics: {
      type: "tv",
      avgMonthlyAudience: "36.6M",
    },
    factCheckAccuracy: 75,
    editorialIndependence: 68,
    transparency: 73,
    perspectives: "limited",
    stakeholders: [
      {
        name: "Brian L. Roberts",
        stake: "Controlling stake via Comcast",
        entity: "Comcast Corporation",
        politicalLean: "center",
        description: "Chairman and CEO of Comcast, maintains operational control through parent company",
      },
      {
        name: "Vanguard Group",
        stake: "8.1%",
        entity: "Vanguard Group (Comcast shares)",
        politicalLean: "center",
        description: "Major institutional investor in Comcast Corporation",
      },
      {
        name: "BlackRock",
        stake: "7.3%",
        entity: "BlackRock Inc. (Comcast shares)",
        politicalLean: "center",
        description: "Second-largest institutional investor in parent company",
      },
    ],
    boardMembers: [
      {
        name: "Cesar Conde",
        position: "Chairman, NBCUniversal News Group",
        background: "Former Univision executive, oversees MSNBC operations",
        politicalLean: "left",
        description: "Appointed 2020, known for progressive diversity initiatives",
      },
      {
        name: "Rashida Jones",
        position: "President, MSNBC",
        background: "Former NBC News and The Weather Channel executive",
        politicalLean: "left",
        description: "First Black executive to lead MSNBC, focuses on social justice coverage",
      },
      {
        name: "Rebecca Kutler",
        position: "Senior VP, Content Strategy",
        background: "Former MSNBC producer and programming executive",
        politicalLean: "left",
        description: "Shapes editorial direction with progressive programming focus",
      },
    ],
    retractions: [
      {
        date: "2023-03-15",
        title: "Correction on Trump Legal Filing",
        description: "Corrected mischaracterization of court filing details in coverage of Trump investigation",
      },
      {
        date: "2022-11-08",
        title: "Retraction of Election Night Projection",
        description: "Withdrew early call on congressional race due to incomplete vote counting",
      },
    ],
    lawsuits: [
      {
        date: "2023-06-12",
        type: "defamation",
        status: "settled",
        description: "Defamation suit related to coverage of political figure settled out of court",
        amount: 750000,
      },
    ],
    scandals: [
      {
        date: "2021-09-20",
        title: "Chris Hayes Interview Editing Controversy",
        description: "Criticism over selective editing of guest interview that changed context",
        severity: "moderate",
      },
    ],
    sponsors: [
      { name: "Pfizer", type: "advertiser", relationship: "Major pharmaceutical advertising sponsor" },
      { name: "General Motors", type: "advertiser", relationship: "Long-term automotive advertising partner" },
      { name: "Comcast", type: "parent-company", relationship: "Parent company and primary owner" },
      { name: "Progressive Insurance", type: "advertiser", relationship: "Major insurance advertising sponsor" },
    ],
    lastUpdated: "2025-01-19",
  },
  {
    id: "cnn",
    name: "CNN",
    country: "United States",
    biasScore: -1.3,
    freePressScore: 74,
    logo: "/cnn-red-logo.jpg",
    description: "American news-based pay television channel",
    ownership: "Warner Bros. Discovery",
    funding: ["Advertising", "Cable subscriptions"],
    website: "https://www.cnn.com",
    outletType: "traditional",
    metrics: {
      type: "tv",
      avgMonthlyAudience: "18.9M",
    },
    factCheckAccuracy: 78,
    editorialIndependence: 72,
    transparency: 76,
    perspectives: "limited",
    stakeholders: [
      {
        name: "David Zaslav",
        stake: "CEO control",
        entity: "Warner Bros. Discovery",
        politicalLean: "center",
        description: "CEO of Warner Bros. Discovery, oversees CNN strategic direction",
      },
      {
        name: "Liberty Media (John Malone)",
        stake: "24.4%",
        entity: "Liberty Media Corporation",
        politicalLean: "right",
        description: "Largest voting shareholder in Warner Bros. Discovery, libertarian-leaning",
      },
      {
        name: "Vanguard Group",
        stake: "7.8%",
        entity: "Vanguard Group",
        politicalLean: "center",
        description: "Major institutional investor in WBD",
      },
    ],
    boardMembers: [
      {
        name: "Mark Thompson",
        position: "CEO, CNN",
        background: "Former New York Times CEO and BBC Director-General",
        politicalLean: "center",
        description: "Appointed 2023, focusing on digital transformation and centrist repositioning",
      },
      {
        name: "David Leavy",
        position: "Chief Operating Officer",
        background: "Former Marriott executive and State Department spokesperson",
        politicalLean: "center",
        description: "Manages day-to-day operations, non-partisan business focus",
      },
    ],
    retractions: [
      {
        date: "2024-01-22",
        title: "Correction on Economic Data Report",
        description: "Corrected misrepresentation of unemployment statistics in economic segment",
      },
      {
        date: "2023-07-14",
        title: "Russia Investigation Story Retraction",
        description:
          "Retracted story connecting Trump associates to Russian bank due to single-source verification failure",
      },
    ],
    lawsuits: [
      {
        date: "2024-02-10",
        type: "defamation",
        status: "active",
        description:
          "Ongoing defamation lawsuit filed by political commentator over panel discussion characterizations",
      },
    ],
    scandals: [
      {
        date: "2023-05-03",
        title: "Chris Cuomo Scandal",
        description: "Fired anchor assisted brother Andrew Cuomo during harassment allegations",
        severity: "major",
      },
    ],
    sponsors: [
      { name: "Pfizer", type: "advertiser", relationship: "Top pharmaceutical advertising sponsor" },
      { name: "Warner Bros. Discovery", type: "parent-company", relationship: "Parent company and primary owner" },
    ],
    lastUpdated: "2025-01-15",
  },
  {
    id: "huffpost",
    name: "HuffPost",
    country: "United States",
    biasScore: -1.6,
    freePressScore: 68,
    logo: "/huffpost-logo.jpg",
    description: "American progressive news and opinion website",
    ownership: "BuzzFeed Inc.",
    funding: ["Advertising", "Sponsored content"],
    website: "https://www.huffpost.com",
    outletType: "traditional",
    metrics: {
      type: "digital",
      avgMonthlyAudience: "110M",
    },
    factCheckAccuracy: 70,
    editorialIndependence: 65,
    transparency: 68,
    perspectives: "limited",
    retractions: [],
    lawsuits: [],
    scandals: [],
    lastUpdated: "2025-01-10",
  },
  {
    id: "nytimes",
    name: "The New York Times",
    country: "United States",
    biasScore: -1.2,
    freePressScore: 82,
    logo: "/new-york-times-logo.png",
    description: "American daily newspaper based in New York City",
    ownership: "The New York Times Company",
    funding: ["Subscriptions", "Advertising"],
    website: "https://www.nytimes.com",
    outletType: "traditional",
    metrics: {
      type: "print",
      avgMonthlyAudience: "7.5M",
      digitalSubscribers: "11M",
    },
    factCheckAccuracy: 85,
    editorialIndependence: 80,
    transparency: 82,
    perspectives: "multiple",
    stakeholders: [
      {
        name: "A.G. Sulzberger",
        stake: "Publisher & Family Trust",
        entity: "Ochs-Sulzberger Family Trust",
        politicalLean: "left",
        description: "Fifth generation of Ochs-Sulzberger family, controls company through dual-class shares",
      },
      {
        name: "Carlos Slim",
        stake: "17.4%",
        entity: "Banco Inbursa",
        politicalLean: "center",
        description: "Mexican billionaire, provided $250M loan in 2009, major shareholder",
      },
    ],
    boardMembers: [
      {
        name: "Meredith Kopit Levien",
        position: "CEO",
        background: "Former Forbes and Forbes Media executive",
        politicalLean: "left",
        description: "Leads digital transformation and subscription growth strategy",
      },
      {
        name: "Dean Baquet",
        position: "Former Executive Editor",
        background: "Pulitzer Prize-winning journalist",
        politicalLean: "left",
        description: "First Black executive editor, shaped coverage 2014-2022",
      },
    ],
    retractions: [
      {
        date: "2023-10-15",
        title: "Correction on Gaza Hospital Report",
        description:
          "Corrected initial headline about hospital explosion that relied on Hamas sources without sufficient verification",
      },
      {
        date: "2022-09-20",
        title: "Retraction of Caliphate Podcast Claims",
        description: "Retracted key claims from award-winning podcast after source credibility concerns",
      },
    ],
    lawsuits: [
      {
        date: "2024-01-05",
        type: "defamation",
        status: "active",
        description: "Sarah Palin defamation lawsuit regarding 2017 editorial linking her to shooting",
      },
    ],
    scandals: [
      {
        date: "2023-06-12",
        title: "Tom Cotton Op-Ed Controversy",
        description: "Internal revolt over publishing Senator Cotton op-ed calling for military deployment",
        severity: "moderate",
      },
    ],
    sponsors: [
      { name: "Advertising Revenue", type: "advertiser", relationship: "Display and classified advertising" },
      { name: "Subscription Revenue", type: "subscriber", relationship: "Primary revenue from digital subscriptions" },
    ],
    lastUpdated: "2025-01-18",
  },
  {
    id: "wapo",
    name: "The Washington Post",
    country: "United States",
    biasScore: -1.1,
    freePressScore: 80,
    logo: "/washington-post-logo.png",
    description: "American daily newspaper published in Washington, D.C.",
    ownership: "Nash Holdings (Jeff Bezos)",
    funding: ["Subscriptions", "Advertising"],
    website: "https://www.washingtonpost.com",
    outletType: "traditional",
    metrics: {
      type: "print",
      avgMonthlyAudience: "4.2M",
      digitalSubscribers: "2.5M",
    },
    factCheckAccuracy: 83,
    editorialIndependence: 78,
    transparency: 80,
    perspectives: "multiple",
    stakeholders: [
      {
        name: "Jeff Bezos",
        stake: "100%",
        entity: "Nash Holdings LLC",
        politicalLean: "left",
        description: "Amazon founder purchased for $250M in 2013, sole owner through personal holding company",
      },
    ],
    boardMembers: [
      {
        name: "Will Lewis",
        position: "CEO and Publisher",
        background: "Former Wall Street Journal publisher and Dow Jones CEO",
        politicalLean: "center",
        description: "Appointed 2024 to lead business transformation",
      },
      {
        name: "Sally Buzbee",
        position: "Former Executive Editor",
        background: "Former AP Washington bureau chief",
        politicalLean: "left",
        description: "First woman executive editor 2021-2024",
      },
    ],
    retractions: [
      {
        date: "2023-11-08",
        title: "Correction on Trump Phone Call Story",
        description: "Corrected misquote of Trump call to Georgia election investigator",
      },
      {
        date: "2022-04-15",
        title: "Hunter Biden Laptop Story Update",
        description: "Acknowledged laptop authenticity after initially dismissing as disinformation",
      },
    ],
    lawsuits: [],
    scandals: [
      {
        date: "2024-02-20",
        title: "Newsroom Diversity Controversy",
        description: "Internal tensions over diversity initiatives and editorial independence",
        severity: "moderate",
      },
    ],
    sponsors: [
      { name: "Jeff Bezos", type: "owner", relationship: "Sole owner provides financial backing" },
      { name: "Subscription Revenue", type: "subscriber", relationship: "Digital subscription model" },
    ],
    lastUpdated: "2025-01-17",
  },
  {
    id: "politico",
    name: "Politico",
    country: "United States",
    biasScore: -0.8,
    freePressScore: 76,
    logo: "/politico-logo.jpg",
    description: "American political journalism company",
    ownership: "Axel Springer SE",
    funding: ["Subscriptions", "Advertising"],
    website: "https://www.politico.com",
    outletType: "traditional",
    metrics: {
      type: "digital",
      avgMonthlyAudience: "51.5M",
    },
    factCheckAccuracy: 80,
    editorialIndependence: 74,
    transparency: 76,
    perspectives: "multiple",
    retractions: [],
    lawsuits: [],
    scandals: [],
    lastUpdated: "2025-01-16",
  },
  {
    id: "the-hill",
    name: "The Hill",
    country: "United States",
    biasScore: -0.5,
    freePressScore: 72,
    logo: "/the-hill-news-logo.jpg",
    description: "American political journalism publication",
    ownership: "Nexstar Media Group",
    funding: ["Advertising", "Sponsored content"],
    website: "https://thehill.com/",
    outletType: "traditional",
    metrics: {
      type: "digital",
      avgMonthlyAudience: "45M",
    },
    factCheckAccuracy: 75,
    editorialIndependence: 70,
    transparency: 72,
    perspectives: "multiple",
    retractions: [],
    lawsuits: [],
    scandals: [],
    lastUpdated: "2025-01-14",
  },
  {
    id: "abc-news",
    name: "ABC News",
    country: "United States",
    biasScore: -0.3,
    freePressScore: 78,
    logo: "/abc-news-logo.png",
    description: "American broadcast television network",
    ownership: "The Walt Disney Company",
    funding: ["Advertising"],
    website: "https://abcnews.go.com/",
    outletType: "traditional",
    metrics: {
      type: "tv",
      avgMonthlyAudience: "171M",
    },
    factCheckAccuracy: 81,
    editorialIndependence: 76,
    transparency: 78,
    perspectives: "multiple",
    retractions: [],
    lawsuits: [],
    scandals: [],
    lastUpdated: "2025-01-18",
  },
  {
    id: "nbc-news",
    name: "NBC News",
    country: "United States",
    biasScore: -0.2,
    freePressScore: 77,
    logo: "/nbc-news-logo.jpg",
    description: "American broadcast television network",
    ownership: "Comcast (NBCUniversal)",
    funding: ["Advertising"],
    website: "https://www.nbcnews.com/",
    outletType: "traditional",
    metrics: {
      type: "tv",
      avgMonthlyAudience: "159M",
    },
    factCheckAccuracy: 80,
    editorialIndependence: 75,
    transparency: 77,
    perspectives: "multiple",
    retractions: [],
    lawsuits: [],
    scandals: [],
    lastUpdated: "2025-01-17",
  },
  {
    id: "cbs-news",
    name: "CBS News",
    country: "United States",
    biasScore: -0.1,
    freePressScore: 76,
    logo: "/cbs-news-logo.png",
    description: "American broadcast television network",
    ownership: "Paramount Global",
    funding: ["Advertising"],
    website: "https://www.cbsnews.com/",
    outletType: "traditional",
    metrics: {
      type: "tv",
      avgMonthlyAudience: "105M",
    },
    factCheckAccuracy: 79,
    editorialIndependence: 74,
    transparency: 76,
    perspectives: "multiple",
    retractions: [],
    lawsuits: [],
    scandals: [],
    lastUpdated: "2025-01-18",
  },
]

// Added missing closing brace for the mediaOutlets array
