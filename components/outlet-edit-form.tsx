"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { MediaOutlet } from "@/lib/media-outlet-data"
import { ArrowLeft, Save } from "lucide-react"

interface OutletEditFormProps {
  outlet: MediaOutlet
}

export function OutletEditForm({ outlet }: OutletEditFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState(outlet)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // TODO: Implement save to database
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
    router.push(`/outlet/${outlet.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Basic Information */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-bold">Basic Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Outlet Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website || ""}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="ownership">Ownership</Label>
            <Input
              id="ownership"
              value={formData.ownership}
              onChange={(e) => setFormData({ ...formData, ownership: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Scores */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-bold">Scores</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="freePressScore">Free Press Score (0-100)</Label>
            <Input
              id="freePressScore"
              type="number"
              min="0"
              max="100"
              value={formData.freePressScore}
              onChange={(e) => setFormData({ ...formData, freePressScore: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="biasScore">Bias Score (-2 to 2)</Label>
            <Input
              id="biasScore"
              type="number"
              step="0.1"
              min="-2"
              max="2"
              value={formData.biasScore}
              onChange={(e) => setFormData({ ...formData, biasScore: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="factCheckAccuracy">Fact-Check Accuracy (0-100)</Label>
            <Input
              id="factCheckAccuracy"
              type="number"
              min="0"
              max="100"
              value={formData.factCheckAccuracy}
              onChange={(e) => setFormData({ ...formData, factCheckAccuracy: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="editorialIndependence">Editorial Independence (0-100)</Label>
            <Input
              id="editorialIndependence"
              type="number"
              min="0"
              max="100"
              value={formData.editorialIndependence}
              onChange={(e) => setFormData({ ...formData, editorialIndependence: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="transparency">Transparency (0-100)</Label>
            <Input
              id="transparency"
              type="number"
              min="0"
              max="100"
              value={formData.transparency}
              onChange={(e) => setFormData({ ...formData, transparency: Number(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      {/* Funding Sources */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-bold">Funding Sources</h2>
        <div>
          <Label htmlFor="funding">Funding (comma-separated)</Label>
          <Input
            id="funding"
            value={formData.funding.join(", ")}
            onChange={(e) => setFormData({ ...formData, funding: e.target.value.split(",").map((s) => s.trim()) })}
          />
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
