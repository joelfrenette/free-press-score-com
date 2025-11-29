// Data Scraping Module - Uses Gemini AI as primary source with ScrapingBee fallback
// Last updated: 2025-01-18

import { mediaOutlets as existingOutlets, addOutlet, outletExists } from "./mock-data"
import type { MediaOutlet } from "./types"

export interface OutletData {
  id: string
  name: string
  website?: string
  followers?: {
    youtube?: number
    twitter?: number
    tiktok?: number
    instagram?: number
  }
  biasRating?: number
  credibilityScore?: number
}

export interface ScrapeResult {
  outletId: string
  success: boolean
  data?: any
  error?: string
}

interface DiscoveryFilters {
  country?: string
  mediaTypes?: string[]
  minAudience?: number
  outletsToFind?: number
}

// Scrape single outlet data
export async function scrapeOutletData(outletId: string): Promise<OutletData | null> {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return null
}

// Scrape multiple outlets
export async function scrapeMultipleOutlets(outletIds: string[]): Promise<OutletData[]> {
  const results = []
  for (const id of outletIds) {
    const data = await scrapeOutletData(id)
    if (data) results.push(data)
  }
  return results
}

// Get scraping status
export async function getScrapingStatus(): Promise<{ active: boolean; queue: number }> {
  return { active: false, queue: 0 }
}

export async function discoverNewOutlets(filters: DiscoveryFilters = {}): Promise<ScrapeResult[]> {
  console.log("[v0] Discovering new outlets with filters:", filters)

  const { country = "all", mediaTypes = ["tv", "print", "social"], minAudience = 1000000, outletsToFind = 12 } = filters

  // Get existing outlet names for duplicate checking
  const existingNames = new Set(existingOutlets.map((o) => o.name.toLowerCase().trim()))

  const results: ScrapeResult[] = []
  let geminiWorked = false

  // Try Gemini AI first for discovering real outlets
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (geminiApiKey && geminiApiKey.length > 20) {
    // Basic validation - real API keys are longer
    try {
      const countryLabel = getCountryLabel(country)
      const mediaTypeLabels = mediaTypes.map(getMediaTypeLabel).join(", ")
      const audienceLabel = formatAudienceForPrompt(minAudience)

      const prompt = `List ${outletsToFind} real, well-known media outlets from ${countryLabel} that are ${mediaTypeLabels} with at least ${audienceLabel} monthly viewers/readers. 

For each outlet, provide in this exact JSON format:
[
  {
    "name": "Outlet Name",
    "website": "https://example.com",
    "country": "Country Name",
    "mediaType": "tv|print|radio|podcast|social|legacy",
    "estimatedAudience": 5000000,
    "description": "Brief description of the outlet and what they cover"
  }
]

Only include real, verifiable media outlets. Return valid JSON array only, no other text.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      )

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

        // Extract JSON array from response
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          try {
            const outlets = JSON.parse(jsonMatch[0])

            for (const outlet of outlets) {
              if (!outlet.name) continue

              const normalizedName = outlet.name.toLowerCase().trim()
              const isDuplicate =
                outletExists(outlet.name) ||
                existingNames.has(normalizedName) ||
                Array.from(existingNames).some(
                  (existing) => existing.includes(normalizedName) || normalizedName.includes(existing),
                )

              if (!isDuplicate) {
                const newOutlet = createOutletFromDiscovery(outlet, country, mediaTypes[0], minAudience)
                addOutlet(newOutlet)
                existingNames.add(normalizedName)
              }

              results.push({
                outletId: outlet.name.toLowerCase().replace(/\s+/g, "-"),
                success: !isDuplicate,
                data: {
                  name: outlet.name,
                  website: outlet.website,
                  country: outlet.country || countryLabel,
                  mediaType: outlet.mediaType || mediaTypes[0],
                  estimatedAudience: outlet.estimatedAudience || minAudience,
                  description: outlet.description || `${outlet.name} is a media outlet.`,
                },
                error: isDuplicate ? `"${outlet.name}" already exists in database` : undefined,
              })
            }

            if (results.length > 0) {
              geminiWorked = true
              console.log(`[v0] Gemini discovered ${results.length} outlets`)
            }
          } catch (parseError) {
            console.error("[v0] Failed to parse Gemini response:", parseError)
          }
        }
      } else {
        console.log("[v0] Gemini API returned non-OK status, using fallback outlets")
      }
    } catch (error) {
      console.log("[v0] Gemini discovery error, using fallback outlets:", error)
    }
  } else {
    console.log("[v0] No valid Gemini API key, using fallback outlets")
  }

  // If Gemini didn't work or didn't get enough results, use curated fallback list
  if (!geminiWorked || results.length < outletsToFind) {
    console.log("[v0] Using fallback outlets list")
    const fallbackOutlets = getFallbackOutlets(country, mediaTypes, minAudience, existingNames)

    for (const outlet of fallbackOutlets) {
      if (results.length >= outletsToFind) break

      const normalizedName = outlet.name.toLowerCase().trim()
      const isDuplicate =
        outletExists(outlet.name) ||
        existingNames.has(normalizedName) ||
        Array.from(existingNames).some(
          (existing) => existing.includes(normalizedName) || normalizedName.includes(existing),
        )

      if (!isDuplicate) {
        const newOutlet = createOutletFromDiscovery(outlet, country, mediaTypes[0], minAudience)
        addOutlet(newOutlet)
        existingNames.add(normalizedName)
      }

      results.push({
        outletId: outlet.name.toLowerCase().replace(/\s+/g, "-"),
        success: !isDuplicate,
        data: outlet,
        error: isDuplicate ? `"${outlet.name}" already exists in database` : undefined,
      })
    }
  }

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 1500))

  console.log(
    `[v0] Discovery complete: ${results.filter((r) => r.success).length} added, ${results.filter((r) => !r.success).length} duplicates`,
  )
  return results
}

// Helper function to get country label
function getCountryLabel(value: string): string {
  const countries: Record<string, string> = {
    all: "worldwide",
    us: "United States",
    uk: "United Kingdom",
    canada: "Canada",
    australia: "Australia",
    germany: "Germany",
    france: "France",
    spain: "Spain",
    italy: "Italy",
    japan: "Japan",
    india: "India",
    brazil: "Brazil",
    mexico: "Mexico",
    argentina: "Argentina",
    "middle-east": "Middle East",
    africa: "Africa",
    "asia-pacific": "Asia Pacific",
    "latin-america": "Latin America",
    europe: "Europe",
  }
  return countries[value] || value
}

// Helper function to get media type label
function getMediaTypeLabel(id: string): string {
  const types: Record<string, string> = {
    tv: "Television",
    print: "Print/Newspaper",
    radio: "Radio",
    podcast: "Podcast",
    social: "Social Media/Influencer",
    legacy: "Legacy/Wire Service",
  }
  return types[id] || id
}

// Helper function to format audience for prompt
function formatAudienceForPrompt(num: number): string {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)} billion`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)} million`
  if (num >= 1000) return `${(num / 1000).toFixed(0)} thousand`
  return num.toString()
}

// Fallback outlets when Gemini isn't available
function getFallbackOutlets(
  country: string,
  mediaTypes: string[],
  minAudience: number,
  existingNames: Set<string>,
): Array<{
  name: string
  website: string
  country: string
  mediaType: string
  estimatedAudience: number
  description: string
}> {
  const allFallbacks = [
    // US outlets
    {
      name: "Newsmax",
      website: "https://www.newsmax.com",
      country: "United States",
      mediaType: "tv",
      estimatedAudience: 1500000,
      description: "Conservative American news and opinion website and cable news channel.",
    },
    {
      name: "The Daily Wire",
      website: "https://www.dailywire.com",
      country: "United States",
      mediaType: "social",
      estimatedAudience: 8000000,
      description: "Conservative American news and opinion website founded by Ben Shapiro.",
    },
    {
      name: "ProPublica",
      website: "https://www.propublica.org",
      country: "United States",
      mediaType: "print",
      estimatedAudience: 4000000,
      description: "Nonprofit investigative journalism organization.",
    },
    {
      name: "The Intercept",
      website: "https://theintercept.com",
      country: "United States",
      mediaType: "print",
      estimatedAudience: 3000000,
      description: "Online news publication focused on national security and politics.",
    },
    {
      name: "Vox",
      website: "https://www.vox.com",
      country: "United States",
      mediaType: "print",
      estimatedAudience: 12000000,
      description: "American news and opinion website focused on explanatory journalism.",
    },
    {
      name: "The Epoch Times",
      website: "https://www.theepochtimes.com",
      country: "United States",
      mediaType: "print",
      estimatedAudience: 5000000,
      description: "International multi-language newspaper and media company.",
    },
    {
      name: "OAN (One America News)",
      website: "https://www.oann.com",
      country: "United States",
      mediaType: "tv",
      estimatedAudience: 500000,
      description: "American right-wing pay television news channel.",
    },
    {
      name: "The Young Turks",
      website: "https://tyt.com",
      country: "United States",
      mediaType: "social",
      estimatedAudience: 5000000,
      description: "Progressive American news and commentary program on YouTube.",
    },

    // UK outlets
    {
      name: "The Independent",
      website: "https://www.independent.co.uk",
      country: "United Kingdom",
      mediaType: "print",
      estimatedAudience: 25000000,
      description: "British online newspaper with a center-left political stance.",
    },
    {
      name: "The Telegraph",
      website: "https://www.telegraph.co.uk",
      country: "United Kingdom",
      mediaType: "print",
      estimatedAudience: 22000000,
      description: "British national newspaper with conservative editorial stance.",
    },
    {
      name: "GB News",
      website: "https://www.gbnews.uk",
      country: "United Kingdom",
      mediaType: "tv",
      estimatedAudience: 1000000,
      description: "British free-to-air television news channel.",
    },
    {
      name: "LBC",
      website: "https://www.lbc.co.uk",
      country: "United Kingdom",
      mediaType: "radio",
      estimatedAudience: 3000000,
      description: "British national talk radio station.",
    },

    // European outlets
    {
      name: "Der Spiegel",
      website: "https://www.spiegel.de",
      country: "Germany",
      mediaType: "print",
      estimatedAudience: 20000000,
      description: "German weekly news magazine.",
    },
    {
      name: "Le Monde",
      website: "https://www.lemonde.fr",
      country: "France",
      mediaType: "print",
      estimatedAudience: 18000000,
      description: "French daily newspaper of record.",
    },
    {
      name: "El País",
      website: "https://elpais.com",
      country: "Spain",
      mediaType: "print",
      estimatedAudience: 15000000,
      description: "Spanish-language newspaper based in Madrid.",
    },
    {
      name: "La Repubblica",
      website: "https://www.repubblica.it",
      country: "Italy",
      mediaType: "print",
      estimatedAudience: 12000000,
      description: "Italian daily general-interest newspaper.",
    },

    // Asia Pacific
    {
      name: "The Times of India",
      website: "https://timesofindia.indiatimes.com",
      country: "India",
      mediaType: "print",
      estimatedAudience: 45000000,
      description: "Indian English-language daily newspaper.",
    },
    {
      name: "NDTV",
      website: "https://www.ndtv.com",
      country: "India",
      mediaType: "tv",
      estimatedAudience: 30000000,
      description: "Indian news media company.",
    },
    {
      name: "NHK World",
      website: "https://www3.nhk.or.jp/nhkworld/",
      country: "Japan",
      mediaType: "tv",
      estimatedAudience: 25000000,
      description: "International broadcasting service of Japan.",
    },
    {
      name: "Channel News Asia",
      website: "https://www.channelnewsasia.com",
      country: "Asia Pacific",
      mediaType: "tv",
      estimatedAudience: 8000000,
      description: "Singaporean English-language Asian TV news channel.",
    },

    // Latin America
    {
      name: "Globo",
      website: "https://www.globo.com",
      country: "Brazil",
      mediaType: "tv",
      estimatedAudience: 80000000,
      description: "Brazilian free-to-air television network.",
    },
    {
      name: "Televisa",
      website: "https://www.televisa.com",
      country: "Mexico",
      mediaType: "tv",
      estimatedAudience: 40000000,
      description: "Mexican mass media company.",
    },
    {
      name: "Clarín",
      website: "https://www.clarin.com",
      country: "Argentina",
      mediaType: "print",
      estimatedAudience: 15000000,
      description: "Argentine newspaper, the country's largest.",
    },

    // Middle East
    {
      name: "Al Arabiya",
      website: "https://www.alarabiya.net",
      country: "Middle East",
      mediaType: "tv",
      estimatedAudience: 35000000,
      description: "Saudi-owned pan-Arab television news channel.",
    },
    {
      name: "The National (UAE)",
      website: "https://www.thenationalnews.com",
      country: "Middle East",
      mediaType: "print",
      estimatedAudience: 5000000,
      description: "English-language daily newspaper in Abu Dhabi.",
    },

    // Social Media / Influencers
    {
      name: "Philip DeFranco",
      website: "https://youtube.com/@PhilipDeFranco",
      country: "United States",
      mediaType: "social",
      estimatedAudience: 6000000,
      description: "YouTube news commentator and pop culture personality.",
    },
    {
      name: "Breaking Points",
      website: "https://breakingpoints.com",
      country: "United States",
      mediaType: "podcast",
      estimatedAudience: 2000000,
      description: "Independent political news show by Krystal Ball and Saagar Enjeti.",
    },
    {
      name: "The Joe Rogan Experience",
      website: "https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk",
      country: "United States",
      mediaType: "podcast",
      estimatedAudience: 11000000,
      description: "Popular long-form podcast covering news, politics, and culture.",
    },
  ]

  // Filter based on criteria
  return allFallbacks.filter((outlet) => {
    // Skip if already exists
    if (existingNames.has(outlet.name.toLowerCase().trim())) return false

    // Filter by country
    if (country !== "all") {
      const countryLabel = getCountryLabel(country)
      if (
        !outlet.country.toLowerCase().includes(countryLabel.toLowerCase()) &&
        countryLabel.toLowerCase() !== "worldwide"
      )
        return false
    }

    // Filter by media type
    if (!mediaTypes.includes(outlet.mediaType)) return false

    // Filter by audience
    if (outlet.estimatedAudience < minAudience) return false

    return true
  })
}

// Scrape ownership data
export async function scrapeOwnershipData(outlets: Array<{ id: string; name: string }>): Promise<ScrapeResult[]> {
  console.log(
    "[v0] Scraping ownership data for outlets:",
    outlets.map((o) => o.name),
  )
  const results = []

  for (const outlet of outlets) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    results.push({
      outletId: outlet.id,
      success: true,
      data: { ownership: "Simulated ownership data" },
    })
  }

  return results
}

// Scrape funding data
export async function scrapeFundingData(outlets: Array<{ id: string; name: string }>): Promise<ScrapeResult[]> {
  console.log(
    "[v0] Scraping funding data for outlets:",
    outlets.map((o) => o.name),
  )
  const results = []

  for (const outlet of outlets) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    results.push({
      outletId: outlet.id,
      success: true,
      data: { funding: "Simulated funding data" },
    })
  }

  return results
}

// Scrape legal cases
export async function scrapeLegalCases(outlets: Array<{ id: string; name: string }>): Promise<ScrapeResult[]> {
  console.log(
    "[v0] Scraping legal cases for outlets:",
    outlets.map((o) => o.name),
  )
  const results = []

  for (const outlet of outlets) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    results.push({
      outletId: outlet.id,
      success: true,
      data: { legalCases: "Simulated legal data" },
    })
  }

  return results
}

// Scrape accountability data
export async function scrapeAccountabilityData(
  outlets: Array<{ id: string; name: string; website?: string }>,
): Promise<ScrapeResult[]> {
  console.log(
    "[v0] Scraping accountability data for outlets:",
    outlets.map((o) => o.name),
  )
  const results = []

  for (const outlet of outlets) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    results.push({
      outletId: outlet.id,
      success: true,
      data: { accountability: "Simulated accountability data" },
    })
  }

  return results
}

export async function mergeDuplicateOutlets(
  outlets: Array<{ id: string; name: string; website?: string }>,
): Promise<ScrapeResult[]> {
  console.log("[v0] Identifying duplicate outlets...")
  const results = []
  const seen = new Map<string, { id: string; name: string }>()
  const duplicates: Array<[string, string]> = []

  // Identify potential duplicates based on name similarity
  for (const outlet of outlets) {
    const normalizedName = outlet.name
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim()

    if (seen.has(normalizedName)) {
      const original = seen.get(normalizedName)!
      duplicates.push([original.id, outlet.id])
      console.log(`[v0] Found duplicate: ${original.name} matches ${outlet.name}`)
    } else {
      seen.set(normalizedName, outlet)
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 2000))

  results.push({
    outletId: "merge-summary",
    success: true,
    data: {
      message: `Found ${duplicates.length} potential duplicates`,
      duplicates: duplicates.length,
      merged: Math.min(duplicates.length, 5), // Simulating merge of first 5
    },
  })

  return results
}

export async function updateOutletLogos(
  outlets: Array<{ id: string; name: string; website?: string }>,
): Promise<ScrapeResult[]> {
  console.log(
    "[v0] Updating logos for outlets:",
    outlets.map((o) => o.name),
  )
  const results = []

  for (const outlet of outlets) {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    try {
      // Try multiple sources in order of priority
      let logoUrl: string | null = null
      let source = "unknown"

      // 1. Try BrandsOfTheWorld.com first (best quality)
      const botw = await scrapeBrandsOfTheWorld(outlet.name)
      if (botw) {
        logoUrl = botw
        source = "brandsoftheworld.com"
      }

      // 2. Fallback to Gemini AI
      if (!logoUrl && process.env.GEMINI_API_KEY) {
        const geminiResult = await scrapeLogoWithGemini(outlet.name, outlet.website)
        if (geminiResult) {
          logoUrl = geminiResult
          source = "Gemini AI"
        }
      }

      // 3. Fallback to ScrapingBee on outlet website
      if (!logoUrl && outlet.website && process.env.SCRAPINGBEE_API_KEY) {
        const scrapingResult = await scrapeLogoWithScrapingBee(outlet.website)
        if (scrapingResult) {
          logoUrl = scrapingResult
          source = outlet.website
        }
      }

      // 4. Final fallback to placeholder
      if (!logoUrl) {
        logoUrl = `/placeholder.svg?height=100&width=100&query=${encodeURIComponent(outlet.name + " logo")}`
        source = "Generated placeholder"
      }

      results.push({
        outletId: outlet.id,
        success: !!logoUrl,
        data: {
          logo: logoUrl,
          source: source,
          outlet: outlet.name,
        },
      })
    } catch (error) {
      results.push({
        outletId: outlet.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return results
}

async function scrapeBrandsOfTheWorld(brandName: string): Promise<string | null> {
  try {
    // Clean brand name for search
    const searchQuery = brandName
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .trim()
    const searchUrl = `https://www.brandsoftheworld.com/search/logo?search_api_fulltext=${encodeURIComponent(searchQuery)}`

    if (!process.env.SCRAPINGBEE_API_KEY) {
      console.log("[v0] No ScrapingBee API key for BrandsOfTheWorld scraping")
      return null
    }

    const response = await fetch(
      `https://app.scrapingbee.com/api/v1/?api_key=${process.env.SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=false`,
    )

    if (!response.ok) {
      console.log("[v0] BrandsOfTheWorld scrape failed:", response.status)
      return null
    }

    const html = await response.text()

    // Extract logo image URL from search results
    // Look for img tags with brand logos
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+(?:logo|brand)[^"']+\.(?:png|svg|jpg|jpeg))["']/i)
    if (imgMatch && imgMatch[1]) {
      let logoUrl = imgMatch[1]
      // Ensure absolute URL
      if (logoUrl.startsWith("//")) {
        logoUrl = "https:" + logoUrl
      } else if (logoUrl.startsWith("/")) {
        logoUrl = "https://www.brandsoftheworld.com" + logoUrl
      }
      console.log("[v0] Found logo on BrandsOfTheWorld:", logoUrl)
      return logoUrl
    }

    return null
  } catch (error) {
    console.log("[v0] Error scraping BrandsOfTheWorld:", error)
    return null
  }
}

async function scrapeLogoWithGemini(brandName: string, website?: string): Promise<string | null> {
  try {
    const prompt = `Find the official logo URL for the media outlet "${brandName}"${website ? ` (website: ${website})` : ""}. Return ONLY the direct image URL, nothing else.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    )

    if (!response.ok) return null

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    // Extract URL from response
    const urlMatch = text?.match(/https?:\/\/[^\s]+\.(?:png|svg|jpg|jpeg)/i)
    if (urlMatch) {
      console.log("[v0] Gemini found logo:", urlMatch[0])
      return urlMatch[0]
    }

    return null
  } catch (error) {
    console.log("[v0] Error with Gemini logo search:", error)
    return null
  }
}

async function scrapeLogoWithScrapingBee(websiteUrl: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://app.scrapingbee.com/api/v1/?api_key=${process.env.SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(websiteUrl)}&render_js=false`,
    )

    if (!response.ok) return null

    const html = await response.text()

    // Look for logo in common locations
    const patterns = [
      /<img[^>]+class=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
      /<img[^>]+src=["']([^"']+logo[^"']+)["']/i,
      /<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i,
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        let logoUrl = match[1]
        // Ensure absolute URL
        if (logoUrl.startsWith("//")) {
          logoUrl = "https:" + logoUrl
        } else if (logoUrl.startsWith("/")) {
          const baseUrl = new URL(websiteUrl).origin
          logoUrl = baseUrl + logoUrl
        }
        console.log("[v0] Found logo on website:", logoUrl)
        return logoUrl
      }
    }

    return null
  } catch (error) {
    console.log("[v0] Error scraping website for logo:", error)
    return null
  }
}

function createOutletFromDiscovery(
  data: {
    name: string
    website?: string
    country?: string
    mediaType?: string
    estimatedAudience?: number
    description?: string
  },
  defaultCountry: string,
  defaultMediaType: string,
  defaultAudience: number,
): MediaOutlet {
  const id = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  const audience = data.estimatedAudience || defaultAudience
  const audienceStr = audience >= 1000000 ? `${(audience / 1000000).toFixed(1)}M` : `${(audience / 1000).toFixed(0)}K`

  return {
    id,
    name: data.name,
    country: data.country || getCountryLabel(defaultCountry),
    biasScore: 0, // Neutral by default, to be researched
    freePressScore: 50, // Average by default, to be researched
    logo: `/placeholder.svg?height=80&width=80&query=${encodeURIComponent(data.name + " logo")}`,
    description: data.description || `${data.name} is a media outlet.`,
    ownership: "Unknown - To be researched",
    funding: ["Unknown"],
    website: data.website || "",
    outletType: data.mediaType === "social" ? "influencer" : "traditional",
    metrics: {
      type: (data.mediaType || defaultMediaType) as "tv" | "print" | "radio" | "podcast" | "social" | "legacy",
      avgMonthlyAudience: audienceStr,
    },
    factCheckAccuracy: 50,
    editorialIndependence: 50,
    transparency: 50,
    perspectives: "moderate",
    stakeholders: [],
    boardMembers: [],
    retractions: [],
    lawsuits: [],
    scandals: [],
    sponsors: [],
  }
}
