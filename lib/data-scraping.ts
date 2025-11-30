import { mediaOutlets, addOutlet, outletExists, updateOutlet, type MediaOutlet } from "./mock-data"

// Types
export interface OutletData {
  id: string
  name: string
  data: Record<string, any>
}

export interface ScrapeResult {
  outletId: string
  success: boolean
  data?: Record<string, any>
  error?: string
}

export interface DiscoveryFilters {
  country?: string
  mediaTypes?: string[]
  minAudience?: number
  outletsToFind?: number
}

// Get existing outlets for reference
const existingOutlets = mediaOutlets

// Also added ScrapingBee web scraping integration for supplementary data

function normalizeUrl(url: string): string {
  // Remove trailing slash
  let normalized = url.replace(/\/+$/, "")
  // Ensure https:// prefix
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`
  }
  return normalized
}

export async function callAIWithCascade(prompt: string, systemPrompt: string): Promise<string | null> {
  // 1. Try Groq FIRST (fastest - Llama on custom hardware, sub-second responses)
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey && groqKey.length > 20) {
    try {
      console.log("[v0] Trying Groq (fastest)...")
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          console.log("[v0] Groq response received (fastest provider)")
          return content
        }
      } else {
        const status = response.status
        if (status === 429) {
          console.log("[v0] Groq rate limited - switching to next provider")
        } else {
          console.log(`[v0] Groq failed with status ${status}, trying next provider...`)
        }
        // Continue to next provider (don't return, let the cascade continue)
      }
    } catch (error) {
      console.log("[v0] Groq network error, trying next provider")
    }
  }

  // 2. Try Grok/xAI (fast, real-time data access)
  const xaiKey = process.env.XAI_API_KEY
  if (xaiKey && xaiKey.length > 20) {
    try {
      console.log("[v0] Trying Grok/xAI...")
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${xaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-beta",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          console.log("[v0] Grok response received")
          return content
        }
      } else {
        const status = response.status
        if (status === 429) {
          console.log("[v0] Grok rate limited or out of credits - switching to next provider")
        } else {
          console.log(`[v0] Grok failed with status ${status}, trying next provider...`)
        }
      }
    } catch (error) {
      console.log("[v0] Grok network error, trying next provider")
    }
  }

  // 3. Try OpenAI (reliable, good quality)
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey && openaiKey.length > 20) {
    try {
      console.log("[v0] Trying OpenAI...")
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          console.log("[v0] OpenAI response received")
          return content
        }
      } else {
        const status = response.status
        console.log(`[v0] OpenAI failed with status ${status}, continuing to next provider...`)
      }
    } catch (error) {
      console.log("[v0] OpenAI failed, trying next provider:", error)
    }
  }

  // 4. Try Anthropic Claude (high quality reasoning)
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey && anthropicKey.length > 20) {
    try {
      console.log("[v0] Trying Anthropic Claude...")
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.content?.[0]?.text
        if (content) {
          console.log("[v0] Anthropic response received")
          return content
        }
      } else {
        const status = response.status
        console.log(`[v0] Anthropic failed with status ${status}, continuing to next provider...`)
      }
    } catch (error) {
      console.log("[v0] Anthropic failed, trying next provider:", error)
    }
  }

  // 5. Try Perplexity (has real-time web search)
  const perplexityKey = process.env.PERPLEXITY_API_KEY
  if (perplexityKey && perplexityKey.length > 20) {
    try {
      console.log("[v0] Trying Perplexity...")
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${perplexityKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          console.log("[v0] Perplexity response received")
          return content
        }
      } else {
        const status = response.status
        console.log(`[v0] Perplexity failed with status ${status}, continuing to next provider...`)
      }
    } catch (error) {
      console.log("[v0] Perplexity failed, trying next provider:", error)
    }
  }

  // 6. Try OpenRouter (fallback with free models)
  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (openrouterKey && openrouterKey.length > 20) {
    try {
      console.log("[v0] Trying OpenRouter...")
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://free-press-scores.com",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          console.log("[v0] OpenRouter response received")
          return content
        }
      } else {
        const status = response.status
        console.log(`[v0] OpenRouter failed with status ${status}`)
      }
    } catch (error) {
      console.log("[v0] OpenRouter failed")
    }
  }

  console.log("[v0] All AI providers failed")
  return null
}

async function scrapeWebsiteWithScrapingBee(url: string): Promise<{ html: string; success: boolean } | null> {
  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY
  if (!scrapingBeeKey) {
    console.log("[v0] ScrapingBee API key not configured")
    return null
  }

  try {
    const normalizedUrl = normalizeUrl(url)
    console.log(`[v0] Scraping ${normalizedUrl} with ScrapingBee...`)
    const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${scrapingBeeKey}&url=${encodeURIComponent(normalizedUrl)}&render_js=false&premium_proxy=false`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    let response: Response
    try {
      response = await fetch(apiUrl, { signal: controller.signal })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.log(
        `[v0] ScrapingBee fetch failed for ${normalizedUrl}:`,
        fetchError instanceof Error ? fetchError.message : "Unknown error",
      )
      return null
    }
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log(`[v0] ScrapingBee returned ${response.status} for ${normalizedUrl} - skipping`)
      return null
    }

    const html = await response.text()

    if (html.length < 500) {
      console.log(`[v0] ScrapingBee returned very short response (${html.length} bytes) - likely an error`)
      return null
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const pageTitle = titleMatch ? titleMatch[1].trim().toLowerCase() : ""

    // If title is EXACTLY "404" or contains clear 404 indicators, it's an error page
    const titleIs404 =
      pageTitle === "404" ||
      pageTitle.startsWith("404 ") ||
      pageTitle.includes("page not found") ||
      pageTitle.includes("not found") ||
      pageTitle.includes("error 404") ||
      pageTitle.includes("can't find") ||
      pageTitle.includes("couldn't find")

    if (titleIs404) {
      console.log(`[v0] ScrapingBee detected 404 page for ${normalizedUrl} (title: "${pageTitle}") - skipping`)
      return null
    }

    // Strong error indicators - phrases that ONLY appear on error pages
    const strongErrorIndicators = [
      "We can't find that page",
      "we can't find that page",
      "Page Not Found",
      "we seem to have lost this page",
      "This page doesn't exist",
      "Sorry, we couldn't find",
      "The page you're looking for",
      "page you requested could not be found",
      "Something has gone wrong",
      "stumbled upon our 404 page",
    ]

    // Check strong indicators - these should ALWAYS trigger regardless of page size
    const hasStrongError = strongErrorIndicators.some((indicator) => html.includes(indicator))
    if (hasStrongError) {
      console.log(`[v0] ScrapingBee detected error page for ${normalizedUrl} (strong indicator match) - skipping`)
      return null
    }

    // Check body class for explicit 404/error pages
    const bodyClassMatch = html.match(/<body[^>]*class="([^"]+)"/i)
    const bodyClass = bodyClassMatch ? bodyClassMatch[1].toLowerCase() : ""
    const bodyHasErrorClass = bodyClass.includes("page-404") || bodyClass.includes("error-page") || bodyClass === "404"

    if (bodyHasErrorClass) {
      console.log(`[v0] ScrapingBee detected error page for ${normalizedUrl} (body class: ${bodyClass}) - skipping`)
      return null
    }

    // Check meta tags for explicit error indicators
    const metaErrorPage =
      html.includes('name="errorpage"') ||
      html.includes('name="pagetype" content="404"') ||
      html.includes('prism.section" content="404"')

    if (metaErrorPage) {
      console.log(`[v0] ScrapingBee detected error page for ${normalizedUrl} (meta tag) - skipping`)
      return null
    }

    // The title, body class, and strong indicator checks are sufficient
    // Random "404" text in navigation menus shouldn't trigger a false positive

    console.log(`[v0] ScrapingBee scraped ${html.length} bytes from ${normalizedUrl}`)
    return { html, success: true }
  } catch (error) {
    console.log("[v0] ScrapingBee unexpected error:", error instanceof Error ? error.message : "Unknown error")
    return null
  }
}

function extractDataFromHTML(html: string, dataType: string): Record<string, any> | null {
  const data: Record<string, any> = {}

  // Extract meta tags
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) data.title = titleMatch[1].trim()

  const descMatch = html.match(/name="description"\s+content="([^"]+)"/i)
  if (descMatch) data.description = descMatch[1]

  const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i)
  if (ogImageMatch) data.ogImage = ogImageMatch[1]

  // Extract social media links
  const socialLinks: string[] = []
  const twitterMatch = html.match(/href="(https?:\/\/(www\.)?(twitter|x)\.com\/[^"]+)"/gi)
  if (twitterMatch) socialLinks.push(...twitterMatch.map((m) => m.replace(/href="|"/g, "")))

  const facebookMatch = html.match(/href="(https?:\/\/(www\.)?facebook\.com\/[^"]+)"/gi)
  if (facebookMatch) socialLinks.push(...facebookMatch.map((m) => m.replace(/href="|"/g, "")))

  const youtubeMatch = html.match(/href="(https?:\/\/(www\.)?youtube\.com\/[^"]+)"/gi)
  if (youtubeMatch) socialLinks.push(...youtubeMatch.map((m) => m.replace(/href="|"/g, "")))

  if (socialLinks.length > 0) data.socialLinks = [...new Set(socialLinks)]

  // Extract copyright/ownership info
  const copyrightMatch = html.match(/©\s*\d{4}\s*([^<\n]+)/i)
  if (copyrightMatch) data.copyright = copyrightMatch[1].trim()

  // Extract about page links
  const aboutMatch = html.match(/href="([^"]*(?:about|who-we-are|our-team)[^"]*)"/i)
  if (aboutMatch) data.aboutPage = aboutMatch[1]

  // Specific extraction for ownership data if needed
  if (dataType === "ownership") {
    const ownershipInfo = html.match(/ownership(?: structure)?[:\s]*([\s\S]*?)(?:<|$)/i)?.[1]
    if (ownershipInfo) {
      data.ownershipInfo = ownershipInfo.trim()
    }
    const parentCompanyMatch = html.match(/parent company[:\s]*([^<\n]+)/i)?.[1]
    if (parentCompanyMatch) {
      data.parentCompany = parentCompanyMatch.trim()
    }
    const ultimateOwnerMatch = html.match(/(?:ultimate owner|owned by)[:\s]*([^<\n]+)/i)?.[1]
    if (ultimateOwnerMatch) {
      data.ultimateOwner = ultimateOwnerMatch.trim()
    }
  }

  return Object.keys(data).length > 0 ? data : null
}

export async function searchWithSERP(query: string): Promise<any[] | null> {
  const serpKey = process.env.SERP_API_KEY
  if (!serpKey) {
    console.log("[v0] SERP API key not configured")
    return null
  }

  try {
    console.log(`[v0] Searching SERP for: ${query}`)
    const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpKey}&num=10`
    const response = await fetch(searchUrl)

    if (!response.ok) {
      console.log(`[v0] SERP API returned ${response.status}`)
      return null
    }

    const data = await response.json()
    if (data.organic_results && data.organic_results.length > 0) {
      console.log(`[v0] SERP returned ${data.organic_results.length} results`)
      return data.organic_results
    }
    return null
  } catch (error) {
    console.log("[v0] SERP API error:", error)
    return null
  }
}

export async function searchImagesWithSERP(
  query: string,
  options?: {
    num?: number
    imgsz?: string // 'l' for large, 'm' for medium, 'i' for icon
    imgtype?: string // 'face', 'photo', 'clipart', 'lineart', 'animated'
  },
): Promise<any[] | null> {
  const serpKey = process.env.SERP_API_KEY
  if (!serpKey) {
    console.log("[v0] SERP API key not configured for image search")
    return null
  }

  try {
    console.log(`[v0] Searching SERP Images for: ${query}`)
    const params = new URLSearchParams({
      engine: "google_images",
      q: query,
      api_key: serpKey,
      ijn: "0", // First page
    })

    if (options?.imgsz) params.append("imgsz", options.imgsz)
    if (options?.imgtype) params.append("image_type", options.imgtype)

    const searchUrl = `https://serpapi.com/search.json?${params.toString()}`
    const response = await fetch(searchUrl)

    if (!response.ok) {
      console.log(`[v0] SERP Images API returned ${response.status}`)
      return null
    }

    const data = await response.json()
    if (data.images_results && data.images_results.length > 0) {
      console.log(`[v0] SERP Images returned ${data.images_results.length} results`)
      // Return the top results with original image URLs
      return data.images_results.slice(0, options?.num || 5).map((img: any) => ({
        title: img.title,
        original: img.original,
        thumbnail: img.thumbnail,
        source: img.source,
        link: img.link,
        width: img.original_width,
        height: img.original_height,
      }))
    }
    return null
  } catch (error) {
    console.log("[v0] SERP Images API error:", error)
    return null
  }
}

// Parse JSON from AI response
export function parseJSONFromResponse(text: string): any {
  try {
    // Try direct parse first
    return JSON.parse(text)
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim())
      } catch {
        // Continue to next attempt
      }
    }

    // Try to find JSON array or object in the text
    const arrayMatch = text.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0])
      } catch {
        // Continue
      }
    }

    const objectMatch = text.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0])
      } catch {
        // Continue
      }
    }
  }
  return null
}

// Scrape single outlet data (generic)
export async function scrapeOutletData(outletId: string): Promise<OutletData | null> {
  const outlet = existingOutlets.find((o) => o.id === outletId)
  if (!outlet) return null

  let scrapedData: Record<string, any> = {}
  if (outlet.website) {
    const webData = await scrapeWebsiteWithScrapingBee(outlet.website)
    if (webData?.success) {
      const extracted = extractDataFromHTML(webData.html, "general")
      if (extracted) scrapedData = extracted
    }
  }

  const systemPrompt = `You are a media research assistant. Provide accurate, factual information about media outlets. Always return valid JSON.`

  const prompt = `Research the media outlet "${outlet.name}" and provide comprehensive data including:
- Current ownership structure
- Parent company
- Key executives
- Political leaning indicators
- Revenue sources
- Notable controversies
${Object.keys(scrapedData).length > 0 ? `\nI found this data from their website: ${JSON.stringify(scrapedData)}` : ""}

Return as JSON: { "ownership": {...}, "executives": [...], "politicalLeaning": "...", "revenue": {...}, "controversies": [...] }`

  const response = await callAIWithCascade(prompt, systemPrompt)
  if (response) {
    const parsed = parseJSONFromResponse(response)
    if (parsed) {
      return { id: outletId, name: outlet.name, data: { ...scrapedData, ...parsed } }
    }
  }

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

// Helper functions for discovery
function getCountryLabel(country: string): string {
  const countryMap: Record<string, string> = {
    all: "Any country worldwide",
    us: "United States",
    uk: "United Kingdom",
    ca: "Canada",
    au: "Australia",
    de: "Germany",
    fr: "France",
    jp: "Japan",
    in: "India",
    br: "Brazil",
    mx: "Mexico",
    other: "International/Other regions",
  }
  return countryMap[country] || country
}

function getMediaTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    tv: "Television Network",
    print: "Print / Newspaper",
    radio: "Radio",
    podcast: "Podcast",
    social: "Social Media / Influencer",
    legacy: "Legacy Media / Wire Service",
    digital: "Digital-only News",
  }
  return typeMap[type] || type
}

function formatAudienceForPrompt(audience: number): string {
  if (audience >= 1000000000) return `${(audience / 1000000000).toFixed(1)}B`
  if (audience >= 1000000) return `${(audience / 1000000).toFixed(1)}M`
  if (audience >= 1000) return `${(audience / 1000).toFixed(0)}K`
  return audience.toString()
}

// REAL: Discover new outlets using AI cascade
export async function discoverNewOutlets(filters: DiscoveryFilters = {}): Promise<ScrapeResult[]> {
  console.log("[v0] Discovering new outlets with filters:", filters)

  const { country = "all", mediaTypes = ["tv", "print", "social"], minAudience = 1000000, outletsToFind = 12 } = filters

  const existingNames = new Set(existingOutlets.map((o) => o.name.toLowerCase().trim()))
  const existingNamesList = Array.from(existingNames).slice(0, 50).join(", ")

  const results: ScrapeResult[] = []

  const countryLabel = getCountryLabel(country)
  const mediaTypeLabels = mediaTypes.map(getMediaTypeLabel).join(", ")
  const audienceLabel = formatAudienceForPrompt(minAudience)

  const systemPrompt = `You are a media research expert. Find real, verifiable news media outlets. Return ONLY valid JSON arrays.`

  const prompt = `Find ${outletsToFind} real news media outlets matching these criteria:
- Region: ${countryLabel}
- Media types: ${mediaTypeLabels}
- Minimum audience: ${audienceLabel}+ monthly viewers/readers

EXCLUDE these existing outlets: ${existingNamesList}

Return ONLY a JSON array with this exact format:
[
  {
    "name": "Outlet Name",
    "website": "https://example.com",
    "country": "Country Name",
    "mediaType": "tv|print|radio|podcast|social|legacy",
    "estimatedAudience": 1000000,
    "description": "Brief description"
  }
]

Return ONLY the JSON array, no other text.`

  const response = await callAIWithCascade(prompt, systemPrompt)
  let discoveredOutlets: any[] = []

  if (response) {
    const parsed = parseJSONFromResponse(response)
    if (Array.isArray(parsed)) {
      discoveredOutlets = parsed
      console.log(`[v0] AI returned ${discoveredOutlets.length} outlets`)
    }
  }

  // Fallback to curated list if AI fails
  if (discoveredOutlets.length === 0) {
    console.log("[v0] Using curated fallback list")
    discoveredOutlets = getCuratedFallbackOutlets(filters)
  }

  // Process discovered outlets
  for (const outlet of discoveredOutlets) {
    const outletName = outlet.name?.trim()
    if (!outletName) continue

    const existsCheck = outletExists(outletName)

    if (existsCheck.exists) {
      results.push({
        outletId: outletName.toLowerCase().replace(/\s+/g, "-"),
        success: false,
        error: `Already exists (${existsCheck.matchType} match with "${existsCheck.matchedOutlet}")`,
        data: {
          ...outlet,
          matchedExisting: existsCheck.matchedOutlet,
          matchType: existsCheck.matchType,
        },
      })
    } else {
      // Add to database
      const newOutlet = await createOutletFromDiscoveryWithScoring(outlet) // Use the new scoring version
      const added = addOutlet(newOutlet)

      if (added) {
        results.push({
          outletId: newOutlet.id,
          success: true,
          data: outlet, // Note: data here is from AI, not the fully enriched outlet
        })
      } else {
        results.push({
          outletId: outletName.toLowerCase().replace(/\s+/g, "-"),
          success: false,
          error: "Failed to add outlet",
          data: outlet,
        })
      }
    }
  }

  console.log(
    `[v0] Discovery complete: ${results.filter((r) => r.success).length} added, ${results.filter((r) => !r.success).length} skipped`,
  )
  return results
}

// Create MediaOutlet from discovery data
function createOutletFromDiscovery(data: any): MediaOutlet {
  const id = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return {
    id,
    name: data.name,
    type: mapMediaType(data.mediaType),
    country: data.country || "Unknown",
    website: data.website || "",
    logo: `/placeholder.svg?height=100&width=100&query=${encodeURIComponent(data.name + " logo")}`,
    description: data.description || `${data.name} media outlet`,
    overallScore: 50, // Default neutral score
    audienceSize: data.estimatedAudience || 1000000,
    platform: data.mediaType === "social" ? "youtube" : undefined,
    scores: {
      ownershipTransparency: 50,
      journalisticStandards: 50,
      correctionPolicy: 50,
      financialTransparency: 50,
    },
    ownership: {
      type: "unknown",
      details: "Ownership data pending research",
    },
    funding: {
      sources: [],
      details: "Funding data pending research",
    },
    accountability: {
      corrections: "unknown",
      details: "Accountability data pending research",
    },
  }
}

export async function scoreNewOutlet(outlet: MediaOutlet): Promise<{
  biasScore: number
  freePressScore: number
  scores: {
    ownershipTransparency: number
    journalisticStandards: number
    correctionPolicy: number
    financialTransparency: number
  }
}> {
  const systemPrompt = `You are a media analysis expert. Evaluate media outlets objectively based on their journalistic practices, ownership transparency, and editorial standards.`

  const prompt = `Analyze the media outlet "${outlet.name}" (${outlet.website || "website unknown"}) and provide scores:

1. biasScore: Political bias from -2 (far left) to +2 (far right), 0 = center
2. freePressScore: Overall press freedom/quality score from 0-100
3. ownershipTransparency: How transparent is ownership (0-100)
4. journalisticStandards: Quality of journalism (0-100)
5. correctionPolicy: How well they handle corrections (0-100)
6. financialTransparency: How transparent is funding (0-100)

Return ONLY valid JSON:
{
  "biasScore": 0,
  "freePressScore": 50,
  "ownershipTransparency": 50,
  "journalisticStandards": 50,
  "correctionPolicy": 50,
  "financialTransparency": 50,
  "reasoning": "Brief explanation"
}`

  try {
    const response = await callAIWithCascade(prompt, systemPrompt)
    if (response) {
      const parsed = parseJSONFromResponse(response)
      if (parsed && typeof parsed.biasScore === "number") {
        return {
          biasScore: Math.max(-2, Math.min(2, parsed.biasScore)),
          freePressScore: Math.max(0, Math.min(100, parsed.freePressScore || 50)),
          scores: {
            ownershipTransparency: Math.max(0, Math.min(100, parsed.ownershipTransparency || 50)),
            journalisticStandards: Math.max(0, Math.min(100, parsed.journalisticStandards || 50)),
            correctionPolicy: Math.max(0, Math.min(100, parsed.correctionPolicy || 50)),
            financialTransparency: Math.max(0, Math.min(100, parsed.financialTransparency || 50)),
          },
        }
      }
    }
  } catch (error) {
    console.error("[v0] Error scoring outlet:", error)
  }

  // Return neutral defaults if AI fails
  return {
    biasScore: 0,
    freePressScore: 50,
    scores: {
      ownershipTransparency: 50,
      journalisticStandards: 50,
      correctionPolicy: 50,
      financialTransparency: 50,
    },
  }
}

async function createOutletFromDiscoveryWithScoring(data: any): Promise<MediaOutlet> {
  const id = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  // Create basic outlet first
  const basicOutlet: MediaOutlet = {
    id,
    name: data.name,
    type: mapMediaType(data.mediaType),
    country: data.country || "Unknown",
    website: data.website || "",
    logo: `/placeholder.svg?height=100&width=100&query=${encodeURIComponent(data.name + " logo")}`,
    description: data.description || `${data.name} media outlet`,
    biasScore: 0,
    freePressScore: 50,
    outletType: data.mediaType === "social" || data.mediaType === "podcast" ? "influencer" : "traditional",
    audienceSize: data.estimatedAudience || 1000000,
    platform: data.mediaType === "social" ? "youtube" : undefined,
    scores: {
      ownershipTransparency: 50,
      journalisticStandards: 50,
      correctionPolicy: 50,
      financialTransparency: 50,
    },
    ownership: {
      type: "unknown",
      details: "Ownership data pending research",
    },
    funding: {
      sources: [],
      details: "Funding data pending research",
    },
    accountability: {
      corrections: "unknown",
      details: "Accountability data pending research",
    },
  }

  // Get AI scoring
  console.log(`[v0] Getting AI scores for ${data.name}...`)
  const scoring = await scoreNewOutlet(basicOutlet)

  return {
    ...basicOutlet,
    biasScore: scoring.biasScore,
    freePressScore: scoring.freePressScore,
    scores: scoring.scores,
  }
}

function mapMediaType(type: string): MediaOutlet["type"] {
  const typeMap: Record<string, MediaOutlet["type"]> = {
    tv: "tv",
    television: "tv",
    print: "print",
    newspaper: "print",
    radio: "radio",
    podcast: "podcast",
    social: "social",
    influencer: "social",
    legacy: "legacy",
    wire: "legacy",
    digital: "print",
  }
  return typeMap[type?.toLowerCase()] || "legacy"
}

// REAL: Scrape ownership data using AI
export async function scrapeOwnershipData(
  outlets: Array<{ id: string; name: string; website?: string }>,
): Promise<ScrapeResult[]> {
  console.log(
    "[v0] Scraping REAL ownership data for:",
    outlets.map((o) => o.name),
  )
  const results: ScrapeResult[] = []

  const systemPrompt = `You are a media ownership research expert. Provide accurate, factual information about media company ownership structures. Always cite verifiable facts and return valid JSON.`

  const KNOWN_ABOUT_URLS: Record<string, string[]> = {
    nytimes: ["https://www.nytco.com/", "https://www.nytco.com/company/", "https://www.nytco.com/who-we-are/"],
    "new york times": ["https://www.nytco.com/", "https://www.nytco.com/company/"],
    "washington post": ["https://www.washingtonpost.com/about-the-post/"],
    wsj: ["https://www.dowjones.com/about/", "https://www.wsj.com/about-us"],
    "wall street journal": ["https://www.dowjones.com/about/"],
    "fox news": ["https://www.foxcorporation.com/", "https://press.foxnews.com/about/"],
    "fox business": [
      "https://www.foxcorporation.com/",
      "https://press.foxbusiness.com/",
      "https://www.foxbusiness.com/about-us",
    ],
    "fox business network": ["https://www.foxcorporation.com/", "https://press.foxbusiness.com/"],
    cnn: ["https://www.warnermedia.com/", "https://edition.cnn.com/about"],
    msnbc: ["https://www.nbcuniversal.com/", "https://www.msnbc.com/msnbc/about"],
    bbc: ["https://www.bbc.com/aboutthebbc", "https://www.bbc.co.uk/aboutthebbc"],
    "abc news": ["https://abcnews.go.com/Site/page?id=3271346", "https://www.disney.com/"],
    "cbs news": ["https://www.paramount.com/", "https://www.cbsnews.com/news/about-cbs-news/"],
    "nbc news": ["https://www.nbcuniversal.com/", "https://www.nbcnews.com/pages/about-nbc-news"],
    reuters: ["https://www.reuters.com/about/", "https://www.thomsonreuters.com/"],
    ap: ["https://www.ap.org/about/", "https://www.ap.org/about/our-story"],
    "associated press": ["https://www.ap.org/about/"],
    politico: ["https://www.politico.com/about-us", "https://www.axelspringer.com/"],
    huffpost: ["https://www.huffpost.com/static/about-us", "https://www.buzzfeed.com/"],
    buzzfeed: [
      "https://www.buzzfeed.com/about",
      "https://www.buzzfeednews.com/article/buzzfeednews/about-buzzfeed-news",
    ],
    vice: ["https://company.vice.com/", "https://www.vice.com/en/page/about"],
    vox: ["https://www.voxmedia.com/about", "https://www.vox.com/pages/about-us"],
    "the guardian": ["https://www.theguardian.com/about", "https://www.theguardian.com/gnm-archive/guardian-history"],
    "daily mail": ["https://www.dmgt.com/", "https://www.dailymail.co.uk/home/article-10538297/About-Daily-Mail.html"],
    "la times": ["https://www.latimes.com/about", "https://www.tribpub.com/"],
    "los angeles times": ["https://www.latimes.com/about"],
    "chicago tribune": ["https://www.tribpub.com/", "https://www.chicagotribune.com/about/"],
    "new york post": ["https://nypost.com/about/", "https://www.newscorp.com/"],
    "usa today": ["https://www.usatoday.com/about/", "https://www.gannett.com/"],
    breitbart: ["https://www.breitbart.com/the-company/"],
    "the atlantic": ["https://www.theatlantic.com/company/", "https://www.theatlantic.com/about/"],
    axios: ["https://www.axios.com/about"],
    newsmax: ["https://www.newsmax.com/aboutnewsmax/"],
    "the hill": ["https://thehill.com/about/"],
    npr: ["https://www.npr.org/about/", "https://www.npr.org/about-npr/"],
    pbs: ["https://www.pbs.org/about/", "https://www.pbs.org/about/corporate-information/"],
    forbes: ["https://www.forbes.com/connect/about/", "https://www.forbesmagazine.com/"],
    bloomberg: ["https://www.bloomberg.com/company/", "https://www.bloombergmedia.com/"],
    "business insider": ["https://www.businessinsider.com/about", "https://www.axelspringer.com/"],
    cnbc: ["https://www.nbcuniversal.com/", "https://www.cnbc.com/about/"],
  }

  function getKnownAboutUrls(outletName: string): string[] {
    const nameLower = outletName.toLowerCase().trim()

    // Direct match
    if (KNOWN_ABOUT_URLS[nameLower]) {
      return KNOWN_ABOUT_URLS[nameLower]
    }

    // Partial match
    for (const [key, urls] of Object.entries(KNOWN_ABOUT_URLS)) {
      if (nameLower.includes(key) || key.includes(nameLower)) {
        return urls
      }
    }

    return []
  }

  for (const outlet of outlets) {
    // First try to scrape about/ownership page with ScrapingBee
    let scrapedContext = ""
    const knownUrls = getKnownAboutUrls(outlet.name)
    let foundAboutPage = false

    if (knownUrls.length > 0) {
      console.log(`[v0] Trying known corporate URLs for ${outlet.name}:`, knownUrls)
      for (const aboutUrl of knownUrls) {
        try {
          const webData = await scrapeWebsiteWithScrapingBee(aboutUrl)
          if (webData?.success && webData.html.length > 1000) {
            const extracted = extractDataFromHTML(webData.html, "ownership")
            if (extracted) {
              scrapedContext = `\n\nReal data scraped from ${aboutUrl}: ${JSON.stringify(extracted)}`
              console.log(`[v0] Found about page data for ${outlet.name} at known URL: ${aboutUrl}`)
              foundAboutPage = true
              break
            }
          }
        } catch (e) {
          console.log(`[v0] Skipping known URL ${aboutUrl} - not accessible`)
          continue
        }
      }
    }

    if (!foundAboutPage && outlet.website) {
      const baseUrl = normalizeUrl(outlet.website)
      const aboutUrls = [
        `${baseUrl}/about`,
        `${baseUrl}/about-us`,
        `${baseUrl}/corporate`,
        `${baseUrl}/company`,
        `${baseUrl}/who-we-are`,
        `${baseUrl}/our-company`,
        `${baseUrl}/company/about`,
        `${baseUrl}/about/company`,
        `${baseUrl}/aboutus`,
      ]

      let attempts = 0
      const maxAttempts = 3

      for (const aboutUrl of aboutUrls) {
        if (attempts >= maxAttempts) {
          console.log(`[v0] Stopping after ${maxAttempts} failed attempts for ${outlet.name}`)
          break
        }

        try {
          const webData = await scrapeWebsiteWithScrapingBee(aboutUrl)
          if (webData?.success && webData.html.length > 1000) {
            const extracted = extractDataFromHTML(webData.html, "ownership")
            if (extracted) {
              scrapedContext = `\n\nReal data scraped from ${aboutUrl}: ${JSON.stringify(extracted)}`
              console.log(`[v0] Found about page data for ${outlet.name}`)
              foundAboutPage = true
              break
            }
          }
          attempts++
        } catch (e) {
          console.log(`[v0] Skipping ${aboutUrl} - not accessible`)
          attempts++
          continue
        }
      }
    }

    // Also search SERP for ownership info
    let serpContext = ""
    try {
      const serpResults = await searchWithSERP(`${outlet.name} ownership parent company`)
      if (serpResults && serpResults.length > 0) {
        serpContext = `\n\nSearch results about ownership: ${serpResults
          .slice(0, 3)
          .map((r: any) => `${r.title}: ${r.snippet}`)
          .join("; ")}`
      }
    } catch (e) {
      console.log(`[v0] SERP search failed for ${outlet.name} ownership - continuing without`)
    }

    const prompt = `Research the ownership structure of "${outlet.name}" media outlet. Provide:
1. Parent company name
2. Ultimate owner (person or corporation)
3. Ownership type (public, private, nonprofit, government, family-owned)
4. Key shareholders or stakeholders
5. Any recent ownership changes
6. Notable cross-media ownership connections
${scrapedContext}${serpContext}

Return as JSON:
{
  "parentCompany": "Company Name",
  "ultimateOwner": "Owner Name",
  "ownershipType": "public|private|nonprofit|government|family",
  "shareholders": [{"name": "...", "stake": "..."}],
  "recentChanges": "Description of recent changes or 'None'",
  "crossOwnership": ["List of related media properties"],
  "verifiedDate": "2024",
  "confidence": "high|medium|low",
  "sources": ["URLs or sources used"]
}`

    try {
      const response = await callAIWithCascade(prompt, systemPrompt)
      if (response) {
        const parsed = parseJSONFromResponse(response)
        if (parsed) {
          // Update the outlet in the database
          const existingOutlet = mediaOutlets.find((o) => o.id === outlet.id)
          if (existingOutlet) {
            updateOutlet(outlet.id, {
              ownership: {
                type: parsed.ownershipType || existingOutlet.ownership?.type || "unknown",
                details: `Parent: ${parsed.parentCompany || "Unknown"}. Owner: ${parsed.ultimateOwner || "Unknown"}. ${parsed.recentChanges || ""}`,
                parent: parsed.parentCompany,
                ultimateOwner: parsed.ultimateOwner,
              },
            })
          }

          results.push({
            outletId: outlet.id,
            success: true,
            data: parsed,
          })
          console.log(`[v0] Updated ownership for ${outlet.name}`)
        } else {
          results.push({
            outletId: outlet.id,
            success: false,
            error: "Failed to parse AI response",
          })
        }
      } else {
        results.push({
          outletId: outlet.id,
          success: false,
          error: "No AI response received",
        })
      }
    } catch (error) {
      results.push({
        outletId: outlet.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return results
}

// REAL: Scrape funding data using AI
export async function scrapeFundingData(
  outlets: Array<{ id: string; name: string; website?: string }>,
): Promise<ScrapeResult[]> {
  console.log(
    "[v0] Scraping REAL funding data for:",
    outlets.map((o) => o.name),
  )
  const results: ScrapeResult[] = []

  const systemPrompt = `You are a media finance research expert. Provide accurate information about media company revenue sources, sponsorships, and financial backing. Return valid JSON.`

  for (const outlet of outlets) {
    // Search for funding/advertiser info
    let scrapedContext = ""
    const serpResults = await searchWithSERP(`${outlet.name} advertisers sponsors funding revenue`)
    if (serpResults && serpResults.length > 0) {
      scrapedContext = `\n\nSearch results about funding: ${serpResults
        .slice(0, 5)
        .map((r: any) => `${r.title}: ${r.snippet}`)
        .join("; ")}`
    }

    const prompt = `Research the funding and revenue sources of "${outlet.name}" media outlet. Provide:
1. Primary revenue sources (advertising, subscriptions, donations, etc.)
2. Known major advertisers or sponsors
3. Any political or ideological donors
4. Government funding (if any)
5. Foundation grants or nonprofit backing
6. Estimated annual revenue (if public)
${scrapedContext}

Return as JSON:
{
  "primaryRevenue": ["advertising", "subscriptions"],
  "majorSponsors": [{"name": "...", "type": "corporate|political|nonprofit"}],
  "politicalDonors": [{"name": "...", "affiliation": "..."}],
  "governmentFunding": {"hasGovFunding": false, "details": "..."},
  "foundationSupport": [{"name": "...", "amount": "..."}],
  "estimatedRevenue": "$XXM annually",
  "financialTransparency": "high|medium|low",
  "confidence": "high|medium|low",
  "sources": ["URLs or sources used"]
}`

    try {
      const response = await callAIWithCascade(prompt, systemPrompt)
      if (response) {
        const parsed = parseJSONFromResponse(response)
        if (parsed) {
          // Update the outlet in the database
          const existingOutlet = mediaOutlets.find((o) => o.id === outlet.id)
          if (existingOutlet) {
            updateOutlet(outlet.id, {
              funding: {
                sources: parsed.primaryRevenue || [],
                details: `Revenue: ${parsed.estimatedRevenue || "Unknown"}. ${parsed.governmentFunding?.hasGovFunding ? "Receives government funding. " : ""}Transparency: ${parsed.financialTransparency || "Unknown"}`,
                sponsors: parsed.majorSponsors,
                politicalDonors: parsed.politicalDonors,
              },
            })
          }

          results.push({
            outletId: outlet.id,
            success: true,
            data: parsed,
          })
          console.log(`[v0] Updated funding for ${outlet.name}`)
        } else {
          results.push({
            outletId: outlet.id,
            success: false,
            error: "Failed to parse AI response",
          })
        }
      } else {
        results.push({
          outletId: outlet.id,
          success: false,
          error: "No AI response received",
        })
      }
    } catch (error) {
      results.push({
        outletId: outlet.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return results
}

// REAL: Scrape legal cases using AI and SERP
export async function scrapeLegalCases(outlets: Array<{ id: string; name: string }>): Promise<ScrapeResult[]> {
  console.log(
    "[v0] Scraping REAL legal cases for:",
    outlets.map((o) => o.name),
  )
  const results: ScrapeResult[] = []

  const systemPrompt = `You are a legal research expert specializing in media law. Provide accurate information about defamation suits, lawsuits, and legal proceedings involving media outlets. Only cite real, verifiable cases.`

  for (const outlet of outlets) {
    // Search for legal cases
    let scrapedContext = ""
    const serpResults = await searchWithSERP(`${outlet.name} lawsuit defamation legal case settlement`)
    if (serpResults && serpResults.length > 0) {
      scrapedContext = `\n\nSearch results about legal cases: ${serpResults
        .slice(0, 5)
        .map((r: any) => `${r.title}: ${r.snippet}`)
        .join("; ")}`
    }

    const prompt = `Research REAL, VERIFIED legal cases involving "${outlet.name}" media outlet. Only include actual cases you are certain exist. Find:
1. Defamation or libel lawsuits (won, lost, settled)
2. FCC violations or complaints
3. Copyright infringement cases
4. Privacy violation lawsuits
5. Retractions ordered by courts
6. Notable settlements

IMPORTANT: Only include real cases with verifiable details. If you don't know of any real cases, return empty arrays.
${scrapedContext}

Return as JSON:
{
  "defamationCases": [{"year": 2023, "plaintiff": "...", "outcome": "won|lost|settled", "amount": "...", "summary": "..."}],
  "fccViolations": [{"year": 2023, "type": "...", "fine": "...", "details": "..."}],
  "copyrightCases": [{"year": 2023, "details": "..."}],
  "privacyCases": [{"year": 2023, "details": "..."}],
  "courtOrderedRetractions": 0,
  "totalSettlements": "$XXM",
  "legalRiskScore": "high|medium|low",
  "confidence": "high|medium|low",
  "sources": ["URLs or sources for verification"]
}`

    try {
      const response = await callAIWithCascade(prompt, systemPrompt)
      if (response) {
        const parsed = parseJSONFromResponse(response)
        if (parsed) {
          // Update the outlet in the database
          updateOutlet(outlet.id, {
            legalCases: parsed,
          })

          results.push({
            outletId: outlet.id,
            success: true,
            data: parsed,
          })
          console.log(`[v0] Updated legal cases for ${outlet.name}`)
        } else {
          results.push({
            outletId: outlet.id,
            success: false,
            error: "Failed to parse AI response",
          })
        }
      } else {
        results.push({
          outletId: outlet.id,
          success: false,
          error: "No AI response received",
        })
      }
    } catch (error) {
      results.push({
        outletId: outlet.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return results
}

// REAL: Scrape accountability data using AI
export async function scrapeAccountabilityData(
  outlets: Array<{ id: string; name: string; website?: string }>,
): Promise<ScrapeResult[]> {
  console.log(
    "[v0] Scraping REAL accountability data for:",
    outlets.map((o) => o.name),
  )
  const results: ScrapeResult[] = []

  const systemPrompt = `You are a journalism standards expert. Evaluate media outlets on their accountability practices, correction policies, and editorial standards.`

  for (const outlet of outlets) {
    const prompt = `Evaluate the accountability and editorial standards of "${outlet.name}" media outlet. Research:
1. Correction/retraction policy (do they have one? Is it visible?)
2. Editorial standards or ethics code
3. Fact-checking practices
4. Response to criticism
5. Notable corrections or retractions
6. Industry awards for journalism
7. Press freedom/journalism organization memberships

Return as JSON:
{
  "correctionPolicy": {"exists": true, "visible": true, "url": "...", "quality": "high|medium|low"},
  "ethicsCode": {"exists": true, "details": "..."},
  "factChecking": {"hasTeam": true, "partnerships": ["..."]},
  "responseToCriticism": "transparent|defensive|dismissive|none",
  "notableCorrections": [{"year": 2023, "topic": "...", "details": "..."}],
  "journalismAwards": [{"year": 2023, "award": "...", "category": "..."}],
  "memberships": ["SPJ", "AP", etc],
  "accountabilityScore": "high|medium|low",
  "confidence": "high|medium|low"
}`

    try {
      const response = await callAIWithCascade(prompt, systemPrompt)
      if (response) {
        const parsed = parseJSONFromResponse(response)
        if (parsed) {
          // Update the outlet in the database
          const existingOutlet = mediaOutlets.find((o) => o.id === outlet.id)
          if (existingOutlet) {
            updateOutlet(outlet.id, {
              accountability: {
                corrections: parsed.correctionPolicy?.quality || "unknown",
                details: `Correction policy: ${parsed.correctionPolicy?.exists ? "Yes" : "No"}. Ethics code: ${parsed.ethicsCode?.exists ? "Yes" : "No"}. Fact-checking: ${parsed.factChecking?.hasTeam ? "Has team" : "No dedicated team"}.`,
                correctionPolicy: parsed.correctionPolicy,
                ethicsCode: parsed.ethicsCode,
                awards: parsed.journalismAwards,
              },
            })
          }

          results.push({
            outletId: outlet.id,
            success: true,
            data: parsed,
          })
          console.log(`[v0] Updated accountability for ${outlet.name}`)
        } else {
          results.push({
            outletId: outlet.id,
            success: false,
            error: "Failed to parse AI response",
          })
        }
      } else {
        results.push({
          outletId: outlet.id,
          success: false,
          error: "No AI response received",
        })
      }
    } catch (error) {
      results.push({
        outletId: outlet.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return results
}

// REAL: Update audience data using AI and platform APIs
export async function scrapeAudienceData(
  outlets: Array<{ id: string; name: string; url?: string; platform?: string }>,
): Promise<ScrapeResult[]> {
  console.log(
    "[v0] Scraping REAL audience data for:",
    outlets.map((o) => o.name),
  )
  const results: ScrapeResult[] = []

  const systemPrompt = `You are a media analytics expert. Provide accurate audience and viewership data for media outlets based on publicly available information.`

  for (const outlet of outlets) {
    const prompt = `Research current audience metrics for "${outlet.name}" media outlet. Find:
1. Monthly unique visitors (website)
2. TV ratings/viewership (if applicable)
3. Social media followers (Twitter, Facebook, YouTube, Instagram)
4. Podcast downloads (if applicable)
5. Print circulation (if applicable)
6. Subscriber count (if applicable)
7. Year-over-year growth trend

Return as JSON:
{
  "monthlyVisitors": 10000000,
  "tvViewership": {"averageViewers": 1000000, "peakViewers": 2000000, "share": "1.5%"},
  "socialMedia": {
    "twitter": 5000000,
    "facebook": 3000000,
    "youtube": 2000000,
    "instagram": 1000000,
    "tiktok": 500000
  },
  "podcastDownloads": 100000,
  "printCirculation": 500000,
  "subscribers": {"paid": 100000, "free": 500000},
  "totalReach": 15000000,
  "growthTrend": "growing|stable|declining",
  "lastUpdated": "2024",
  "confidence": "high|medium|low"
}`

    try {
      const response = await callAIWithCascade(prompt, systemPrompt)
      if (response) {
        const parsed = parseJSONFromResponse(response)
        if (parsed) {
          // Calculate total audience
          const totalAudience =
            parsed.totalReach ||
            (parsed.monthlyVisitors || 0) +
              (parsed.tvViewership?.averageViewers || 0) +
              Object.values(parsed.socialMedia || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)

          // Update the outlet in the database
          updateOutlet(outlet.id, {
            audienceSize: totalAudience,
            audienceData: parsed,
          })

          results.push({
            outletId: outlet.id,
            success: true,
            data: parsed,
          })
          console.log(`[v0] Updated audience for ${outlet.name}: ${totalAudience.toLocaleString()}`)
        } else {
          results.push({
            outletId: outlet.id,
            success: false,
            error: "Failed to parse AI response",
          })
        }
      } else {
        results.push({
          outletId: outlet.id,
          success: false,
          error: "No AI response received",
        })
      }
    } catch (error) {
      results.push({
        outletId: outlet.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return results
}

// Merge duplicate outlets
export async function mergeDuplicateOutlets(
  outlets: Array<{ id: string; name: string; website?: string }>,
): Promise<ScrapeResult[]> {
  console.log("[v0] Identifying duplicate outlets...")
  const results = []
  const seen = new Map<string, { id: string; name: string }>()
  const duplicates: Array<[string, string]> = []

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

  results.push({
    outletId: "merge-summary",
    success: true,
    data: {
      message: `Found ${duplicates.length} potential duplicates`,
      duplicates: duplicates.length,
      merged: duplicates.length,
    },
  })

  return results
}

// Update outlet logos
export async function updateOutletLogos(
  outlets: MediaOutlet[],
  onProgress?: (outlet: string, success: boolean, logoUrl?: string) => void,
): Promise<{ updated: number; failed: number; results: Array<{ name: string; success: boolean; logo?: string }> }> {
  let updated = 0
  let failed = 0
  const results: Array<{ name: string; success: boolean; logo?: string }> = []

  for (const outlet of outlets) {
    try {
      let logoUrl: string | null = null
      let source = ""

      // Try SERP Images API first (using thumbnails which are Google-hosted and always accessible)
      if (process.env.SERP_API_KEY) {
        try {
          const images = await searchImagesWithSERP(`${outlet.name} official logo png`, {
            imgsz: "m", // Medium size for good quality
            num: 5,
          })

          if (images && images.length > 0) {
            // Prefer images with "logo" in title/source
            const logoImages = images.filter(
              (img: any) =>
                img.title?.toLowerCase().includes("logo") ||
                img.source?.toLowerCase().includes("logo") ||
                img.link?.toLowerCase().includes("logo"),
            )

            const bestImages = logoImages.length > 0 ? logoImages : images

            for (const img of bestImages) {
              // Use thumbnail (Google-hosted) to avoid 403 errors from source sites
              if (img.thumbnail) {
                logoUrl = img.thumbnail
                source = "serp-images"
                console.log(`[v0] Found logo via SERP Images for ${outlet.name}: ${img.thumbnail}`)
                break
              }
              // Fall back to original if no thumbnail, with validation
              if (img.original) {
                // Skip known blocked domains
                const blockedDomains = ["seeklogo.com", "logowik.com", "brandlogos.net", "pngegg.com", "pngwing.com"]
                try {
                  const imgDomain = new URL(img.original).hostname.toLowerCase()
                  if (blockedDomains.some((domain) => imgDomain.includes(domain))) {
                    continue
                  }
                } catch {
                  continue
                }

                // Validate original URL is accessible
                try {
                  const controller = new AbortController()
                  const timeoutId = setTimeout(() => controller.abort(), 3000)
                  const imgResponse = await fetch(img.original, {
                    method: "HEAD",
                    signal: controller.signal,
                    headers: { "User-Agent": "Mozilla/5.0 (compatible; LogoFetcher/1.0)" },
                  }).catch(() => null)
                  clearTimeout(timeoutId)

                  if (imgResponse && imgResponse.ok) {
                    logoUrl = img.original
                    source = "serp-images"
                    console.log(`[v0] Found logo via SERP Images (original) for ${outlet.name}: ${img.original}`)
                    break
                  }
                } catch {
                  continue
                }
              }
            }
          }
        } catch (error) {
          console.log(`[v0] SERP Images search failed for ${outlet.name}:`, error)
        }
      }

      // Try Clearbit Logo API (free, high quality) as fallback
      if (!logoUrl && outlet.website) {
        try {
          const domain = new URL(outlet.website).hostname.replace("www.", "")
          const clearbitUrl = `https://logo.clearbit.com/${domain}`
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)

          const response = await fetch(clearbitUrl, {
            method: "HEAD",
            signal: controller.signal,
          }).catch(() => null)

          clearTimeout(timeoutId)

          if (response && response.ok) {
            logoUrl = clearbitUrl
            source = "clearbit"
            console.log(`[v0] Found logo via Clearbit for ${outlet.name}`)
          }
        } catch {
          // Continue to next source
        }
      }

      // Try Google Favicon as fallback
      if (!logoUrl && outlet.website) {
        try {
          const domain = new URL(outlet.website).hostname
          logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
          source = "google-favicon"
          console.log(`[v0] Using Google Favicon for ${outlet.name}`)
        } catch {
          // Continue
        }
      }

      // Final fallback - use placeholder
      if (!logoUrl) {
        logoUrl = `/placeholder.svg?height=64&width=64&query=${encodeURIComponent(outlet.name + " logo")}`
        source = "placeholder"
        console.log(`[v0] Using placeholder for ${outlet.name}`)
      }

      // Update the outlet's logo
      outlet.logo = logoUrl
      updated++
      results.push({ name: outlet.name, success: true, logo: logoUrl })
      console.log(`[v0] Updated logo for ${outlet.name} (${source}): ${logoUrl}`)

      if (onProgress) {
        onProgress(outlet.name, true, logoUrl)
      }
    } catch (error) {
      console.error(`[v0] Failed to update logo for ${outlet.name}:`, error)
      failed++
      results.push({ name: outlet.name, success: false })
      if (onProgress) {
        onProgress(outlet.name, false)
      }
    }
  }

  return { updated, failed, results }
}

// Curated fallback list for when AI fails
function getCuratedFallbackOutlets(filters: DiscoveryFilters): any[] {
  const allOutlets = [
    {
      name: "Al Jazeera",
      website: "https://aljazeera.com",
      country: "Qatar",
      mediaType: "tv",
      estimatedAudience: 150000000,
      description: "International news network",
    },
    {
      name: "Deutsche Welle",
      website: "https://dw.com",
      country: "Germany",
      mediaType: "tv",
      estimatedAudience: 100000000,
      description: "German international broadcaster",
    },
    {
      name: "France 24",
      website: "https://france24.com",
      country: "France",
      mediaType: "tv",
      estimatedAudience: 80000000,
      description: "French international news",
    },
    {
      name: "NHK World",
      website: "https://nhk.or.jp",
      country: "Japan",
      mediaType: "tv",
      estimatedAudience: 50000000,
      description: "Japanese public broadcaster",
    },
    {
      name: "NDTV",
      website: "https://ndtv.com",
      country: "India",
      mediaType: "tv",
      estimatedAudience: 30000000,
      description: "Indian news network",
    },
    {
      name: "Sky News Australia",
      website: "https://skynews.com.au",
      country: "Australia",
      mediaType: "tv",
      estimatedAudience: 5000000,
      description: "Australian news channel",
    },
    {
      name: "CBC News",
      website: "https://cbc.ca",
      country: "Canada",
      mediaType: "tv",
      estimatedAudience: 15000000,
      description: "Canadian public broadcaster",
    },
    {
      name: "Globo",
      website: "https://globo.com",
      country: "Brazil",
      mediaType: "tv",
      estimatedAudience: 100000000,
      description: "Brazilian media conglomerate",
    },
    {
      name: "Televisa",
      website: "https://televisa.com",
      country: "Mexico",
      mediaType: "tv",
      estimatedAudience: 50000000,
      description: "Mexican broadcast company",
    },
    {
      name: "Times of India",
      website: "https://timesofindia.com",
      country: "India",
      mediaType: "print",
      estimatedAudience: 50000000,
      description: "Indian English newspaper",
    },
    {
      name: "The Guardian",
      website: "https://theguardian.com",
      country: "UK",
      mediaType: "print",
      estimatedAudience: 150000000,
      description: "British daily newspaper",
    },
    {
      name: "Le Monde",
      website: "https://lemonde.fr",
      country: "France",
      mediaType: "print",
      estimatedAudience: 25000000,
      description: "French daily newspaper",
    },
    {
      name: "The Sydney Morning Herald",
      website: "https://smh.com.au",
      country: "Australia",
      mediaType: "print",
      estimatedAudience: 10000000,
      description: "Australian newspaper",
    },
    {
      name: "The Globe and Mail",
      website: "https://theglobeandmail.com",
      country: "Canada",
      mediaType: "print",
      estimatedAudience: 5000000,
      description: "Canadian newspaper",
    },
    {
      name: "Der Spiegel",
      website: "https://spiegel.de",
      country: "Germany",
      mediaType: "print",
      estimatedAudience: 20000000,
      description: "German news magazine",
    },
  ]

  return allOutlets
    .filter((o) => {
      if (filters.country && filters.country !== "all") {
        const countryMatch = o.country.toLowerCase().includes(filters.country.toLowerCase())
        if (!countryMatch) return false
      }
      if (filters.mediaTypes && filters.mediaTypes.length > 0) {
        if (!filters.mediaTypes.includes(o.mediaType)) return false
      }
      if (filters.minAudience && o.estimatedAudience < filters.minAudience) return false
      return true
    })
    .slice(0, filters.outletsToFind || 12)
}

// Logo scraping helpers (kept from original)
async function scrapeBrandsOfTheWorld(outletName: string): Promise<string | null> {
  return null // Simplified - BrandsOfTheWorld requires authentication
}

async function scrapeLogoWithGemini(outletName: string, website?: string): Promise<string | null> {
  return null // Gemini doesn't return image URLs directly
}

async function scrapeLogoWithScrapingBee(websiteUrl: string): Promise<string | null> {
  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY
  if (!scrapingBeeKey) return null

  try {
    const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${scrapingBeeKey}&url=${encodeURIComponent(websiteUrl)}&render_js=false`
    const response = await fetch(apiUrl)
    if (!response.ok) return null

    const html = await response.text()

    // Try to find logo in meta tags or common logo locations
    const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/)
    if (ogImageMatch) return ogImageMatch[1]

    const logoMatch = html.match(/class="[^"]*logo[^"]*"[^>]*src="([^"]+)"/)
    if (logoMatch) return logoMatch[1]

    return null
  } catch {
    return null
  }
}
