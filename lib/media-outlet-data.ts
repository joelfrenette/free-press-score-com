import type { MediaOutlet } from "./types"
import { loadOutletsFromSupabase, saveOutletToSupabase, saveOutletsToSupabase } from "./supabase-storage"
import { loadOutletsFromBlob } from "./blob-storage"

export type { MediaOutlet } from "./types"

let hasLoadedFromDb = false
let saveTimeout: NodeJS.Timeout | null = null

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
    .replace(/^the\s+/i, "")
    .replace(/\s+(show|podcast|news|network|media|channel|tv|radio)$/i, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
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

  if (longer.includes(shorter)) {
    return shorter.length / longer.length
  }

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

function debouncedSaveToSupabase(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  saveTimeout = setTimeout(async () => {
    try {
      const success = await saveOutletsToSupabase(mediaOutlets)
      if (success) {
        console.log(`[v0] Auto-saved ${mediaOutlets.length} outlets to Supabase`)
      }
    } catch (error) {
      console.error("[v0] Failed to auto-save to Supabase:", error)
    }
  }, 2000)
}

export async function loadOutlets(): Promise<MediaOutlet[]> {
  if (hasLoadedFromDb && mediaOutlets.length > 0) {
    return mediaOutlets
  }

  try {
    // First try to load from Supabase
    const supabaseOutlets = await loadOutletsFromSupabase()

    if (supabaseOutlets.length > 0) {
      console.log(`[v0] Loaded ${supabaseOutlets.length} outlets from Supabase`)
      mediaOutlets.length = 0
      mediaOutlets.push(...supabaseOutlets)
      hasLoadedFromDb = true
      return mediaOutlets
    }

    // If Supabase is empty, try to load from Blob (migration path)
    console.log("[v0] No outlets in Supabase, checking Blob for migration...")
    const blobOutlets = await loadOutletsFromBlob()

    if (blobOutlets.length > 0) {
      console.log(`[v0] Found ${blobOutlets.length} outlets in Blob, migrating to Supabase...`)
      mediaOutlets.length = 0
      mediaOutlets.push(...blobOutlets)

      // Migrate to Supabase
      const migrated = await saveOutletsToSupabase(blobOutlets)
      if (migrated) {
        console.log(`[v0] Successfully migrated ${blobOutlets.length} outlets to Supabase`)
      }

      hasLoadedFromDb = true
      return mediaOutlets
    }

    // If both are empty, use seed data
    console.log("[v0] No outlets found, using seed data")
    hasLoadedFromDb = true
    return mediaOutlets
  } catch (error) {
    console.error("[v0] Error loading outlets:", error)
    return mediaOutlets
  }
}

export function getOutlets(): MediaOutlet[] {
  return mediaOutlets
}

export function getOutletById(id: string): MediaOutlet | undefined {
  return mediaOutlets.find((outlet) => outlet.id === id)
}

export async function updateOutlet(id: string, updates: Partial<MediaOutlet>): Promise<MediaOutlet | null> {
  const index = mediaOutlets.findIndex((outlet) => outlet.id === id)
  if (index === -1) return null

  const updatedOutlet = {
    ...mediaOutlets[index],
    ...updates,
    lastUpdated: new Date().toISOString(),
  }

  mediaOutlets[index] = updatedOutlet

  // Save immediately to Supabase
  await saveOutletToSupabase(updatedOutlet)

  return updatedOutlet
}

export async function addOutlet(outlet: MediaOutlet): Promise<MediaOutlet> {
  // Check for duplicates
  const isDuplicate = checkForDuplicate(outlet)
  if (isDuplicate) {
    console.log(`[v0] Duplicate outlet detected: ${outlet.name}`)
    return isDuplicate
  }

  mediaOutlets.push(outlet)
  console.log(`[v0] Added new outlet: ${outlet.name} (Total: ${mediaOutlets.length})`)

  // Save immediately to Supabase
  await saveOutletToSupabase(outlet)

  return outlet
}

export function checkForDuplicate(newOutlet: { name: string; website?: string }): MediaOutlet | null {
  const newNormalized = normalizeForComparison(newOutlet.name)
  const newDomain = extractDomain(newOutlet.website)

  for (const existing of mediaOutlets) {
    // Exact domain match
    const existingDomain = extractDomain(existing.website)
    if (newDomain && existingDomain && newDomain === existingDomain) {
      return existing
    }

    // Normalized name exact match
    const existingNormalized = normalizeForComparison(existing.name)
    if (newNormalized === existingNormalized) {
      return existing
    }

    // High similarity match (>85%)
    const similarity = calculateSimilarity(newNormalized, existingNormalized)
    if (similarity > 0.85) {
      return existing
    }
  }

  return null
}

export function findDuplicates(): Array<{ outlet1: MediaOutlet; outlet2: MediaOutlet; reason: string }> {
  const duplicates: Array<{ outlet1: MediaOutlet; outlet2: MediaOutlet; reason: string }> = []

  for (let i = 0; i < mediaOutlets.length; i++) {
    for (let j = i + 1; j < mediaOutlets.length; j++) {
      const outlet1 = mediaOutlets[i]
      const outlet2 = mediaOutlets[j]

      // Check domain match
      const domain1 = extractDomain(outlet1.website)
      const domain2 = extractDomain(outlet2.website)
      if (domain1 && domain2 && domain1 === domain2) {
        duplicates.push({ outlet1, outlet2, reason: `Same domain: ${domain1}` })
        continue
      }

      // Check name similarity
      const norm1 = normalizeForComparison(outlet1.name)
      const norm2 = normalizeForComparison(outlet2.name)
      const similarity = calculateSimilarity(norm1, norm2)
      if (similarity > 0.8) {
        duplicates.push({
          outlet1,
          outlet2,
          reason: `Similar names (${Math.round(similarity * 100)}%): "${outlet1.name}" / "${outlet2.name}"`,
        })
      }
    }
  }

  return duplicates
}

// Alias for findDuplicates - used by duplicates route
export function findAllDuplicates(): Array<{ outlet1: MediaOutlet; outlet2: MediaOutlet; reason: string }> {
  return findDuplicates()
}

// Get outlet count
export function getOutletCount(): number {
  return mediaOutlets.length
}

// Check if outlet exists by name or website
export function outletExists(
  name: string,
  website?: string,
): { exists: boolean; matchType?: string; matchedOutlet?: string } {
  const duplicate = checkForDuplicate({ name, website })
  if (duplicate) {
    // Determine match type
    let matchType = "name"
    if (website && duplicate.website && duplicate.website.toLowerCase().includes(website.toLowerCase())) {
      matchType = "website"
    } else if (duplicate.name.toLowerCase() === name.toLowerCase()) {
      matchType = "exact"
    } else {
      matchType = "similar"
    }
    return { exists: true, matchType, matchedOutlet: duplicate.name }
  }
  return { exists: false }
}

// Remove duplicate outlets by ID
export async function removeDuplicates(idsToRemove: string[]): Promise<number> {
  const initialLength = mediaOutlets.length
  const idsSet = new Set(idsToRemove)

  // Filter out duplicates
  const remaining = mediaOutlets.filter((outlet) => !idsSet.has(outlet.id))

  // Update the array
  mediaOutlets.length = 0
  mediaOutlets.push(...remaining)

  // Save to Supabase
  await saveOutletsToSupabase(mediaOutlets)

  return initialLength - mediaOutlets.length
}

// Save all outlets to Supabase
export async function saveOutlets(): Promise<boolean> {
  return saveOutletsToSupabase(mediaOutlets)
}

// Seed data - only used if Supabase is empty
export const mediaOutlets: MediaOutlet[] = [
  {
    id: "cnn",
    name: "CNN",
    country: "United States",
    biasScore: -0.8,
    freePressScore: 72,
    logo: "/cnn-news-logo-red.jpg",
    description: "Cable News Network - 24-hour news channel",
    ownership: "Warner Bros. Discovery",
    funding: ["Advertising", "Cable subscriptions"],
    website: "https://cnn.com",
    sponsors: [],
    stakeholders: [],
    boardMembers: [],
    metrics: { type: "tv", avgMonthlyAudience: "80M" },
    outletType: "traditional",
    retractions: [],
    lawsuits: [],
    scandals: [],
    factCheckAccuracy: 75,
    editorialIndependence: 70,
    transparency: 71,
    perspectives: "limited",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "fox-news",
    name: "Fox News",
    country: "United States",
    biasScore: 1.2,
    freePressScore: 58,
    logo: "/fox-news-logo.png",
    description: "Fox News Channel - Cable news and opinion",
    ownership: "Fox Corporation",
    funding: ["Advertising", "Cable subscriptions"],
    website: "https://foxnews.com",
    sponsors: [],
    stakeholders: [],
    boardMembers: [],
    metrics: { type: "tv", avgMonthlyAudience: "150M" },
    outletType: "traditional",
    retractions: [],
    lawsuits: [],
    scandals: [],
    factCheckAccuracy: 55,
    editorialIndependence: 50,
    transparency: 60,
    perspectives: "limited",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "new-york-times",
    name: "The New York Times",
    country: "United States",
    biasScore: -0.6,
    freePressScore: 85,
    logo: "/new-york-times-logo.png",
    description: "Major American newspaper",
    ownership: "The New York Times Company",
    funding: ["Subscriptions", "Advertising"],
    website: "https://nytimes.com",
    sponsors: [],
    stakeholders: [],
    boardMembers: [],
    metrics: { type: "print", avgMonthlyAudience: "100M" },
    outletType: "traditional",
    retractions: [],
    lawsuits: [],
    scandals: [],
    factCheckAccuracy: 88,
    editorialIndependence: 85,
    transparency: 82,
    perspectives: "multiple",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "bbc",
    name: "BBC News",
    country: "United Kingdom",
    biasScore: -0.2,
    freePressScore: 88,
    logo: "/bbc-news-logo.png",
    description: "British Broadcasting Corporation",
    ownership: "Public (UK Government Charter)",
    funding: ["License fees", "BBC Studios commercial"],
    website: "https://bbc.com/news",
    sponsors: [],
    stakeholders: [],
    boardMembers: [],
    metrics: { type: "mixed", avgMonthlyAudience: "400M" },
    outletType: "traditional",
    retractions: [],
    lawsuits: [],
    scandals: [],
    factCheckAccuracy: 90,
    editorialIndependence: 85,
    transparency: 88,
    perspectives: "multiple",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "reuters",
    name: "Reuters",
    country: "United Kingdom",
    biasScore: 0,
    freePressScore: 92,
    logo: "/reuters-logo-orange.jpg",
    description: "International news agency",
    ownership: "Thomson Reuters",
    funding: ["B2B subscriptions", "Licensing"],
    website: "https://reuters.com",
    sponsors: [],
    stakeholders: [],
    boardMembers: [],
    metrics: { type: "digital", avgMonthlyAudience: "200M" },
    outletType: "traditional",
    retractions: [],
    lawsuits: [],
    scandals: [],
    factCheckAccuracy: 95,
    editorialIndependence: 92,
    transparency: 90,
    perspectives: "multiple",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "ap-news",
    name: "Associated Press",
    country: "United States",
    biasScore: 0,
    freePressScore: 93,
    logo: "/associated-press-ap-logo.jpg",
    description: "American non-profit news agency",
    ownership: "Member cooperative",
    funding: ["Member fees", "Licensing"],
    website: "https://apnews.com",
    sponsors: [],
    stakeholders: [],
    boardMembers: [],
    metrics: { type: "digital", avgMonthlyAudience: "150M" },
    outletType: "traditional",
    retractions: [],
    lawsuits: [],
    scandals: [],
    factCheckAccuracy: 94,
    editorialIndependence: 93,
    transparency: 91,
    perspectives: "multiple",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "msnbc",
    name: "MSNBC",
    country: "United States",
    biasScore: -1.3,
    freePressScore: 62,
    logo: "/msnbc-logo.jpg",
    description: "American cable news channel",
    ownership: "NBCUniversal (Comcast)",
    funding: ["Advertising", "Cable subscriptions"],
    website: "https://msnbc.com",
    sponsors: [],
    stakeholders: [],
    boardMembers: [],
    metrics: { type: "tv", avgMonthlyAudience: "60M" },
    outletType: "traditional",
    retractions: [],
    lawsuits: [],
    scandals: [],
    factCheckAccuracy: 68,
    editorialIndependence: 55,
    transparency: 63,
    perspectives: "limited",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "wsj",
    name: "The Wall Street Journal",
    country: "United States",
    biasScore: 0.5,
    freePressScore: 84,
    logo: "/wall-street-journal-wsj-logo.jpg",
    description: "American business-focused newspaper",
    ownership: "News Corp (Rupert Murdoch)",
    funding: ["Subscriptions", "Advertising"],
    website: "https://wsj.com",
    sponsors: [],
    stakeholders: [],
    boardMembers: [],
    metrics: { type: "print", avgMonthlyAudience: "40M" },
    outletType: "traditional",
    retractions: [],
    lawsuits: [],
    scandals: [],
    factCheckAccuracy: 87,
    editorialIndependence: 80,
    transparency: 84,
    perspectives: "multiple",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "npr",
    name: "NPR",
    country: "United States",
    biasScore: -0.5,
    freePressScore: 86,
    logo: "/npr-national-public-radio-logo.jpg",
    description: "National Public Radio",
    ownership: "Non-profit public",
    funding: ["Donations", "Corporate sponsors", "Government grants"],
    website: "https://npr.org",
    sponsors: [],
    stakeholders: [],
    boardMembers: [],
    metrics: { type: "mixed", avgMonthlyAudience: "60M" },
    outletType: "traditional",
    retractions: [],
    lawsuits: [],
    scandals: [],
    factCheckAccuracy: 89,
    editorialIndependence: 84,
    transparency: 85,
    perspectives: "multiple",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "washington-post",
    name: "The Washington Post",
    country: "United States",
    biasScore: -0.7,
    freePressScore: 82,
    logo: "/washington-post-logo.png",
    description: "Major American newspaper",
    ownership: "Nash Holdings (Jeff Bezos)",
    funding: ["Subscriptions", "Advertising"],
    website: "https://washingtonpost.com",
    sponsors: [],
    stakeholders: [],
    boardMembers: [],
    metrics: { type: "print", avgMonthlyAudience: "90M" },
    outletType: "traditional",
    retractions: [],
    lawsuits: [],
    scandals: [],
    factCheckAccuracy: 86,
    editorialIndependence: 78,
    transparency: 81,
    perspectives: "multiple",
    lastUpdated: new Date().toISOString(),
  },
]
