"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface RefreshDataButtonProps {
  outletId: string
  sourceUrl?: string
  platform?: string
}

interface StepStatus {
  name: string
  label: string
  status: "pending" | "loading" | "success" | "error"
  error?: string
}

export function RefreshDataButton({ outletId }: RefreshDataButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [steps, setSteps] = useState<StepStatus[]>([
    { name: "ownership", label: "Ownership", status: "pending" },
    { name: "funding", label: "Funding", status: "pending" },
    { name: "legal", label: "Legal Cases", status: "pending" },
    { name: "audience", label: "Audience Data", status: "pending" },
    { name: "general", label: "General Data", status: "pending" },
    { name: "scores", label: "Recalculating Scores", status: "pending" },
  ])
  const [isComplete, setIsComplete] = useState(false)
  const { toast } = useToast()

  const resetState = () => {
    setProgress(0)
    setCurrentStep("Starting...")
    setIsComplete(false)
    setErrorMessage(null)
    setSteps([
      { name: "ownership", label: "Ownership", status: "pending" },
      { name: "funding", label: "Funding", status: "pending" },
      { name: "legal", label: "Legal Cases", status: "pending" },
      { name: "audience", label: "Audience Data", status: "pending" },
      { name: "general", label: "General Data", status: "pending" },
      { name: "scores", label: "Recalculating Scores", status: "pending" },
    ])
  }

  const handleRefresh = async () => {
    resetState()
    setShowDialog(true)
    setIsLoading(true)

    console.log("[v0] Starting refresh for outlet:", outletId)

    try {
      const response = await fetch("/api/scrape/outlet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId }),
      })

      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.log("[v0] Error response:", errorText)
        throw new Error(`Server error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log("[v0] Stream done")
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (!data || typeof data.type !== "string") {
                console.log("[v0] Skipping invalid event data:", data)
                continue
              }
              console.log("[v0] Received event:", data.type, data)

              if (data.type === "progress") {
                setProgress(data.progress)
                setCurrentStep(data.message)
                setSteps((prev) => prev.map((s) => (s.name === data.step ? { ...s, status: "loading" } : s)))
              } else if (data.type === "step_complete") {
                setSteps((prev) =>
                  prev.map((s) =>
                    s.name === data.step ? { ...s, status: data.success ? "success" : "error", error: data.error } : s,
                  ),
                )
              } else if (data.type === "complete") {
                setProgress(100)
                setIsComplete(true)
                setCurrentStep("Complete!")

                // Mark scores step as complete
                setSteps((prev) => prev.map((s) => (s.name === "scores" ? { ...s, status: "success" } : s)))

                toast({
                  title: "Data refreshed",
                  description: `Successfully updated ${data.updates?.length || 0} data categories`,
                })

                // Reload page after 2 seconds to show updated data
                setTimeout(() => {
                  window.location.reload()
                }, 2000)
              }
            } catch (e) {
              console.log("[v0] Parse error:", e, "Line:", line)
            }
          }
        }
      }
    } catch (error) {
      console.log("[v0] Refresh error:", error)
      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh data")
      setCurrentStep("Error occurred")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStepIcon = (status: StepStatus["status"]) => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />
    }
  }

  const handleDialogChange = (open: boolean) => {
    if (!open && (errorMessage || isComplete || !isLoading)) {
      setShowDialog(false)
    }
  }

  return (
    <>
      <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm" className="gap-2 bg-transparent">
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        Refresh Data
      </Button>

      <Dialog open={showDialog} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className={`h-5 w-5 ${isLoading && !isComplete && !errorMessage ? "animate-spin" : ""}`} />
              {isComplete ? "Refresh Complete" : errorMessage ? "Refresh Failed" : "Refreshing Data..."}
            </DialogTitle>
            <DialogDescription>
              {isComplete
                ? "All data has been updated. The page will reload shortly."
                : errorMessage
                  ? "An error occurred while refreshing data."
                  : "Updating all data categories for this outlet. This may take a minute."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {errorMessage && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{currentStep}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.name}
                  className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                    step.status === "loading" ? "bg-primary/5" : ""
                  }`}
                >
                  {getStepIcon(step.status)}
                  <span
                    className={`text-sm ${
                      step.status === "loading"
                        ? "font-medium"
                        : step.status === "pending"
                          ? "text-muted-foreground"
                          : ""
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.error && <span className="ml-auto text-xs text-destructive">{step.error}</span>}
                </div>
              ))}
            </div>

            {errorMessage && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
