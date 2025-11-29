import { put, list, del } from "@vercel/blob"
import type { MediaOutlet } from "./types"

const OUTLETS_BLOB_NAME = "media-outlets.json"

export async function saveOutletsToBlob(
  outlets: MediaOutlet[],
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const jsonData = JSON.stringify(outlets, null, 2)
    const blob = await put(OUTLETS_BLOB_NAME, jsonData, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false, // Keep consistent filename
      allowOverwrite: true, // Added to fix "blob already exists" error
    })
    console.log(`[v0] Saved ${outlets.length} outlets to Blob: ${blob.url}`)
    return { success: true, url: blob.url }
  } catch (error) {
    console.error("[v0] Error saving outlets to Blob:", error)
    return { success: false, error: String(error) }
  }
}

export async function loadOutletsFromBlob(): Promise<{ outlets: MediaOutlet[] | null; error?: string }> {
  try {
    const { blobs } = await list()
    const outletBlob = blobs.find((b) => b.pathname === OUTLETS_BLOB_NAME || b.pathname.includes("media-outlets"))

    if (!outletBlob) {
      console.log("[v0] No outlets blob found, will use seed data")
      return { outlets: null }
    }

    const response = await fetch(outletBlob.url)
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status}`)
    }

    const outlets = (await response.json()) as MediaOutlet[]
    console.log(`[v0] Loaded ${outlets.length} outlets from Blob`)
    return { outlets }
  } catch (error) {
    console.error("[v0] Error loading outlets from Blob:", error)
    return { outlets: null, error: String(error) }
  }
}

export async function deleteOutletsBlob(): Promise<{ success: boolean; error?: string }> {
  try {
    const { blobs } = await list()
    const outletBlob = blobs.find((b) => b.pathname === OUTLETS_BLOB_NAME || b.pathname.includes("media-outlets"))

    if (outletBlob) {
      await del(outletBlob.url)
      console.log("[v0] Deleted outlets blob")
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error deleting outlets blob:", error)
    return { success: false, error: String(error) }
  }
}
