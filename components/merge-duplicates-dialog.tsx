"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Trash2, CheckCircle2, AlertTriangle, Copy } from "lucide-react"

interface Duplicate {
  name: string
  ids: string[]
  count: number
  matchType?: string // Added matchType to show why items matched
}

interface MergeResult {
  removed: number
  duplicatesFound: Array<{
    name: string
    kept: string
    removed: string[]
  }>
}

interface MergeDuplicatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMergeComplete: () => void
}

export function MergeDuplicatesDialog({ open, onOpenChange, onMergeComplete }: MergeDuplicatesDialogProps) {
  const [phase, setPhase] = useState<"idle" | "scanning" | "found" | "merging" | "complete">("idle")
  const [duplicates, setDuplicates] = useState<Duplicate[]>([])
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async () => {
    setPhase("scanning")
    setError(null)

    try {
      const response = await fetch("/api/outlets/duplicates", {
        cache: "no-store",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to scan for duplicates")
      }

      setDuplicates(data.duplicates || [])
      setPhase("found")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan")
      setPhase("idle")
    }
  }

  const handleMerge = async () => {
    setPhase("merging")
    setError(null)

    try {
      const response = await fetch("/api/outlets/duplicates", {
        method: "POST",
        cache: "no-store",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to merge duplicates")
      }

      setMergeResult(data)
      setPhase("complete")
      onMergeComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge")
      setPhase("found")
    }
  }

  const handleClose = () => {
    setPhase("idle")
    setDuplicates([])
    setMergeResult(null)
    setError(null)
    onOpenChange(false)
  }

  const handleTryAgain = () => {
    setPhase("idle")
    setDuplicates([])
    setMergeResult(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {phase === "complete" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : phase === "found" && duplicates.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
            {phase === "complete" ? "Duplicates Merged" : "Merge Duplicates"}
          </DialogTitle>
          <DialogDescription>
            {phase === "idle" && "Scan your database to find and remove duplicate media outlet entries."}
            {phase === "scanning" && "Scanning database for duplicate entries..."}
            {phase === "found" && duplicates.length === 0 && "No duplicates found in your database."}
            {phase === "found" &&
              duplicates.length > 0 &&
              `Found ${duplicates.length} outlet(s) with duplicate entries.`}
            {phase === "merging" && "Merging duplicate entries..."}
            {phase === "complete" && `Successfully removed ${mergeResult?.removed || 0} duplicate entries.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Idle State */}
          {phase === "idle" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                This will scan all media outlets in your database and identify entries with identical or very similar
                names.
              </p>
              <Button onClick={handleScan} size="lg">
                <Search className="mr-2 h-4 w-4" />
                Scan for Duplicates
              </Button>
            </div>
          )}

          {/* Scanning State */}
          {phase === "scanning" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Scanning database...</p>
            </div>
          )}

          {/* Found Duplicates State */}
          {phase === "found" && (
            <div className="space-y-4">
              {duplicates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                  <p className="text-lg font-medium">No Duplicates Found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your database is clean with no duplicate entries.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-900">Duplicates Detected</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Found {duplicates.reduce((sum, d) => sum + d.count - 1, 0)} duplicate entries across{" "}
                          {duplicates.length} outlet(s). Merging will keep the first entry and remove the rest.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {duplicates.map((dup, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg border p-3 bg-card">
                        <div className="flex-1">
                          <p className="font-medium">{dup.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">IDs: {dup.ids.join(", ")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {dup.matchType && (
                            <Badge variant="outline" className="text-xs">
                              {dup.matchType}
                            </Badge>
                          )}
                          <Badge variant="secondary">{dup.count} entries</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Merging State */}
          {phase === "merging" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Merging duplicates...</p>
            </div>
          )}

          {/* Complete State */}
          {phase === "complete" && mergeResult && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Merge Complete</p>
                    <p className="text-sm text-green-700 mt-1">
                      Successfully removed {mergeResult.removed} duplicate entries from your database.
                    </p>
                  </div>
                </div>
              </div>

              {mergeResult.duplicatesFound.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-sm font-medium text-muted-foreground">Merged Outlets:</p>
                  {mergeResult.duplicatesFound.map((dup, idx) => (
                    <div key={idx} className="rounded-lg border p-3 bg-card">
                      <p className="font-medium">{dup.name}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Kept: {dup.kept}
                        </Badge>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Removed: {dup.removed.length}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 mt-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {phase === "idle" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {phase === "found" && duplicates.length === 0 && <Button onClick={handleClose}>Done</Button>}

          {phase === "found" && duplicates.length > 0 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleMerge} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Merge {duplicates.reduce((sum, d) => sum + d.count - 1, 0)} Duplicates
              </Button>
            </>
          )}

          {phase === "complete" && (
            <>
              <Button variant="outline" onClick={handleTryAgain}>
                Scan Again
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
