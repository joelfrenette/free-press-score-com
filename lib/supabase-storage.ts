import type { MediaOutlet } from "./types"

// Convert MediaOutlet to database row format
export function outletToDbRow(outlet: MediaOutlet): Record<string, unknown> {
  return {
    id: outlet.id,
    name: outlet.name,
    country: outlet.country || null,
    bias_score: outlet.biasScore ?? null,
    free_press_score: outlet.freePressScore ?? null,
    logo: outlet.logo || null,
    description: outlet.description || null,
    website: outlet.website || null,
    outlet_type: outlet.outletType || null,
    platform: outlet.platform || null,
    fact_check_accuracy: outlet.factCheckAccuracy ?? null,
    editorial_independence: outlet.editorialIndependence ?? null,
    transparency: outlet.transparency ?? null,
    perspectives: outlet.perspectives || null,
    last_updated: outlet.lastUpdated || new Date().toISOString(),
    ownership: outlet.ownership
      ? typeof outlet.ownership === "string"
        ? { details: outlet.ownership }
        : outlet.ownership
      : null,
    funding: outlet.funding ? (Array.isArray(outlet.funding) ? { sources: outlet.funding } : outlet.funding) : null,
    sponsors: outlet.sponsors || null,
    stakeholders: outlet.stakeholders || null,
    board_members: outlet.boardMembers || null,
    metrics: outlet.metrics || null,
    retractions: outlet.retractions || null,
    lawsuits: outlet.lawsuits || null,
    scandals: outlet.scandals || null,
    legal_cases: outlet.legalCases || null,
    audience_data: outlet.audienceData || null,
    audience_size: outlet.audienceSize ?? null,
    accountability: outlet.accountability || null,
    type: outlet.type || null,
    overall_score: outlet.overallScore ?? null,
    scores: outlet.scores || null,
    updated_at: new Date().toISOString(),
  }
}

// Convert database row to MediaOutlet format
export function dbRowToOutlet(row: Record<string, unknown>): MediaOutlet {
  const ownership = row.ownership as Record<string, unknown> | null
  const funding = row.funding as Record<string, unknown> | null

  return {
    id: row.id as string,
    name: row.name as string,
    country: row.country as string,
    biasScore: Number(row.bias_score) || 0,
    freePressScore: Number(row.free_press_score) || 0,
    logo: (row.logo as string) || "",
    description: (row.description as string) || "",
    website: (row.website as string) || "",
    outletType: (row.outlet_type as "traditional" | "influencer") || "traditional",
    platform: row.platform as MediaOutlet["platform"],
    factCheckAccuracy: Number(row.fact_check_accuracy) || 0,
    editorialIndependence: Number(row.editorial_independence) || 0,
    transparency: Number(row.transparency) || 0,
    perspectives: (row.perspectives as "single" | "limited" | "multiple") || "multiple",
    lastUpdated: (row.last_updated as string) || new Date().toISOString(),
    ownership: ownership?.details
      ? typeof ownership.details === "string"
        ? ownership.details
        : ownership
      : ownership || "",
    funding: funding?.sources ? (Array.isArray(funding.sources) ? funding.sources : funding) : funding || [],
    sponsors: (row.sponsors as MediaOutlet["sponsors"]) || [],
    stakeholders: (row.stakeholders as MediaOutlet["stakeholders"]) || [],
    boardMembers: (row.board_members as MediaOutlet["boardMembers"]) || [],
    metrics: (row.metrics as MediaOutlet["metrics"]) || { type: "digital", avgMonthlyAudience: "Unknown" },
    retractions: (row.retractions as MediaOutlet["retractions"]) || [],
    lawsuits: (row.lawsuits as MediaOutlet["lawsuits"]) || [],
    scandals: (row.scandals as MediaOutlet["scandals"]) || [],
    legalCases: row.legal_cases as MediaOutlet["legalCases"],
    audienceData: row.audience_data as MediaOutlet["audienceData"],
    audienceSize: row.audience_size as number | undefined,
    accountability: row.accountability as MediaOutlet["accountability"],
    type: row.type as MediaOutlet["type"],
    overallScore: row.overall_score as number | undefined,
    scores: row.scores as MediaOutlet["scores"],
  }
}

// Load all outlets from Supabase
export async function loadOutletsFromSupabase(): Promise<MediaOutlet[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/media_outlets?select=*`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("[Supabase] Failed to load outlets:", response.status, response.statusText)
      return []
    }

    const rows = await response.json()
    console.log(`[Supabase] Loaded ${rows.length} outlets from database`)
    return rows.map(dbRowToOutlet)
  } catch (error) {
    console.error("[Supabase] Error loading outlets:", error)
    return []
  }
}

// Save a single outlet to Supabase (upsert)
export async function saveOutletToSupabase(outlet: MediaOutlet): Promise<boolean> {
  try {
    const row = outletToDbRow(outlet)

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/media_outlets`, {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(row),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Supabase] Failed to save outlet:", response.status, errorText)
      return false
    }

    console.log(`[Supabase] Saved outlet: ${outlet.name}`)
    return true
  } catch (error) {
    console.error("[Supabase] Error saving outlet:", error)
    return false
  }
}

// Save multiple outlets to Supabase (batch upsert)
export async function saveOutletsToSupabase(outlets: MediaOutlet[]): Promise<boolean> {
  try {
    const rows = outlets.map(outletToDbRow)

    // Use upsert with on_conflict to properly update existing rows
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/media_outlets`, {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Supabase] Failed to save outlets:", response.status, errorText)
      return false
    }

    console.log(`[Supabase] Saved ${outlets.length} outlets to database`)
    return true
  } catch (error) {
    console.error("[Supabase] Error saving outlets:", error)
    return false
  }
}

// Delete an outlet from Supabase
export async function deleteOutletFromSupabase(outletId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/media_outlets?id=eq.${encodeURIComponent(outletId)}`,
      {
        method: "DELETE",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      },
    )

    if (!response.ok) {
      console.error("[Supabase] Failed to delete outlet:", response.status)
      return false
    }

    console.log(`[Supabase] Deleted outlet: ${outletId}`)
    return true
  } catch (error) {
    console.error("[Supabase] Error deleting outlet:", error)
    return false
  }
}

// Update a single outlet field in Supabase (more efficient for single field updates like logos)
export async function updateOutletInSupabase(outletId: string, updates: Partial<MediaOutlet>): Promise<boolean> {
  try {
    // Convert camelCase to snake_case for database
    const dbUpdates: Record<string, unknown> = {}

    if (updates.logo !== undefined) dbUpdates.logo = updates.logo
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.biasScore !== undefined) dbUpdates.bias_score = updates.biasScore
    if (updates.freePressScore !== undefined) dbUpdates.free_press_score = updates.freePressScore
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.website !== undefined) dbUpdates.website = updates.website
    if (updates.ownership !== undefined) dbUpdates.ownership = updates.ownership
    if (updates.funding !== undefined) dbUpdates.funding = updates.funding
    if (updates.factCheckAccuracy !== undefined) dbUpdates.fact_check_accuracy = updates.factCheckAccuracy
    if (updates.editorialIndependence !== undefined) dbUpdates.editorial_independence = updates.editorialIndependence
    if (updates.transparency !== undefined) dbUpdates.transparency = updates.transparency
    if (updates.lastUpdated !== undefined) dbUpdates.last_updated = updates.lastUpdated
    if (updates.metrics !== undefined) dbUpdates.metrics = updates.metrics
    if (updates.audienceData !== undefined) dbUpdates.audience_data = updates.audienceData
    if (updates.legalCases !== undefined) dbUpdates.legal_cases = updates.legalCases
    if (updates.accountability !== undefined) dbUpdates.accountability = updates.accountability

    // Always update the updated_at timestamp
    dbUpdates.updated_at = new Date().toISOString()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/media_outlets?id=eq.${encodeURIComponent(outletId)}`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(dbUpdates),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Supabase] Failed to update outlet:", response.status, errorText)
      return false
    }

    console.log(`[Supabase] Updated outlet: ${outletId}`)
    return true
  } catch (error) {
    console.error("[Supabase] Error updating outlet:", error)
    return false
  }
}
