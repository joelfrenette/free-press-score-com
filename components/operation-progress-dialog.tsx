"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Users,
  DollarSign,
  Scale,
  FileText,
  TrendingUp,
  ImageIcon,
  Copy,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProgressUpdate {
  outletId: string
  outletName: string
  status: "pending" | "processing" | "success" | "error" | "skipped"
  message?: string
  data?: any
  timestamp?: number
}

interface OperationProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operationType: string
  totalOutlets: number
  onComplete?: () => void
}

const operationConfig: Record<string, { title: string; icon: React.ReactNode; description: string }> = {
  ownership: {
    title: "Update Ownership Data",
    icon: <Users className="h-5 w-5" />,
    description: "Researching parent companies, shareholders, and ownership structures...",
  },
  funding: {
    title: "Update Funding Sources",
    icon: <DollarSign className="h-5 w-5" />,
    description: "Researching revenue sources, sponsors, and financial supporters...",
  },
  legal: {
    title: "Research Legal Cases",
    icon: <Scale className="h-5 w-5" />,
    description: "Finding defamation suits, settlements, and court proceedings...",
  },
  accountability: {
    title: "Update Accountability Metrics",
    icon: <FileText className="h-5 w-5" />,
    description: "Evaluating correction policies, ethics codes, and fact-checking...",
  },
  audience: {
    title: "Update Audience Data",
    icon: <TrendingUp className="h-5 w-5" />,
    description: "Researching viewership, follower counts, and reach metrics...",
  },
  logos: {
    title: "Update Logos",
    icon: <ImageIcon className="h-5 w-5" />,
    description: "Fetching logos from Clearbit, Google, and media sources...",
  },
  merge: {
    title: "Merge Duplicates",
    icon: <Copy className="h-5 w-5" />,
    description: "Finding and merging duplicate media outlets...",
  },
  discover: {
    title: "Discover New Outlets",
    icon: <Search className="h-5 w-5" />,
    description: "Searching for new media outlets using AI...",
  },
}

export function OperationProgressDialog({
  open,
  onOpenChange,
  operationType,
  totalOutlets,
  onComplete,
}: OperationProgressDialogProps) {
  const [updates, setUpdates] = useState<ProgressUpdate[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [aiProvider, setAiProvider] = useState<string | null>(null)

  const config = operationConfig[operationType] || {
    title: "Processing",
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    description: "Processing outlets...",
  }

  const progress = totalOutlets > 0 ? Math.round((currentIndex / totalOutlets) * 100) : 0
  const successCount = updates.filter((u) => u.status === "success").length
  const errorCount = updates.filter((u) => u.status === "error").length
  const skippedCount = updates.filter((u) => u.status === "skipped").length

  const handleClose = () => {
    if (isComplete) {
      setUpdates([])
      setIsComplete(false)
      setCurrentIndex(0)
      setAiProvider(null)
      onOpenChange(false)
      onComplete?.()
    }
  }

  const addUpdate = (update: ProgressUpdate) => {
    setUpdates((prev) => {
      const existing = prev.findIndex((u) => u.outletId === update.outletId)
      if (existing >= 0) {
        const newUpdates = [...prev]
        newUpdates[existing] = { ...update, timestamp: Date.now() }
        return newUpdates
      }
      return [...prev, { ...update, timestamp: Date.now() }]
    })
  }

  // Expose methods for parent component to call
  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setUpdates([])
      setIsComplete(false)
      setCurrentIndex(0)
      setAiProvider(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!isComplete ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : config.icon}
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isComplete ? "Complete" : `Processing ${currentIndex} of ${totalOutlets}`}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />

            {aiProvider && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  AI Provider: {aiProvider}
                </Badge>
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold">{totalOutlets}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-600">{successCount}</div>
              <div className="text-xs text-muted-foreground">Success</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-red-600">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-yellow-600">{skippedCount}</div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
          </div>

          {/* Live Updates Log */}
          <div className="flex-1 min-h-0">
            <h4 className="text-sm font-medium mb-2">Live Updates</h4>
            <ScrollArea className="h-[250px] border rounded-lg">
              <div className="p-3 space-y-2">
                {updates.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Starting operation...</p>
                  </div>
                ) : (
                  updates
                    .slice()
                    .reverse()
                    .map((update, index) => (
                      <div
                        key={`${update.outletId}-${index}`}
                        className={cn(
                          "flex items-start gap-2 p-2 rounded-md text-sm",
                          update.status === "processing" && "bg-blue-500/10",
                          update.status === "success" && "bg-green-500/10",
                          update.status === "error" && "bg-red-500/10",
                          update.status === "skipped" && "bg-yellow-500/10",
                          update.status === "pending" && "bg-muted/50",
                        )}
                      >
                        {update.status === "processing" && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500 mt-0.5 shrink-0" />
                        )}
                        {update.status === "success" && (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        )}
                        {update.status === "error" && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                        {update.status === "skipped" && (
                          <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                        )}
                        {update.status === "pending" && (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{update.outletName}</div>
                          {update.message && (
                            <div className="text-xs text-muted-foreground truncate">{update.message}</div>
                          )}
                          {update.data && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {typeof update.data === "object" ? (
                                <div className="space-y-0.5">
                                  {Object.entries(update.data)
                                    .slice(0, 3)
                                    .map(([key, value]) => (
                                      <div key={key} className="truncate">
                                        <span className="font-medium">{key}:</span> {String(value).substring(0, 50)}
                                        {String(value).length > 50 && "..."}
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                String(update.data).substring(0, 100)
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            {isComplete ? (
              <Button onClick={handleClose}>Done</Button>
            ) : (
              <Button variant="outline" disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Export a hook to control the dialog from parent
export function useOperationProgress() {
  const [isOpen, setIsOpen] = useState(false)
  const [operationType, setOperationType] = useState("")
  const [totalOutlets, setTotalOutlets] = useState(0)
  const [updates, setUpdates] = useState<ProgressUpdate[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [aiProvider, setAiProvider] = useState<string | null>(null)

  const start = (type: string, total: number) => {
    setOperationType(type)
    setTotalOutlets(total)
    setUpdates([])
    setCurrentIndex(0)
    setIsComplete(false)
    setAiProvider(null)
    setIsOpen(true)
  }

  const addUpdate = (update: ProgressUpdate) => {
    setUpdates((prev) => {
      const existing = prev.findIndex((u) => u.outletId === update.outletId)
      if (existing >= 0) {
        const newUpdates = [...prev]
        newUpdates[existing] = { ...update, timestamp: Date.now() }
        return newUpdates
      }
      return [...prev, { ...update, timestamp: Date.now() }]
    })
    if (update.status !== "pending" && update.status !== "processing") {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const setProvider = (provider: string) => {
    setAiProvider(provider)
  }

  const complete = () => {
    setIsComplete(true)
    setCurrentIndex(totalOutlets)
  }

  const close = () => {
    setIsOpen(false)
    setUpdates([])
    setCurrentIndex(0)
    setIsComplete(false)
    setAiProvider(null)
  }

  return {
    isOpen,
    setIsOpen,
    operationType,
    totalOutlets,
    updates,
    currentIndex,
    isComplete,
    aiProvider,
    start,
    addUpdate,
    setProvider,
    complete,
    close,
  }
}
