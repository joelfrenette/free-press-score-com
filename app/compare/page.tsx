'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { mediaOutlets } from '@/lib/mock-data';
import { ArrowRight, TrendingUp, CheckCircle, Eye, FileText, Scale, Building2 } from 'lucide-react';

function getBiasLabel(score: number): string {
  if (score <= -6) return 'Far Left';
  if (score <= -3) return 'Left';
  if (score <= 3) return 'Center';
  if (score <= 6) return 'Right';
  return 'Far Right';
}

function getBiasColor(score: number): string {
  if (score <= -6) return 'text-blue-700 bg-blue-100 dark:bg-blue-900/30';
  if (score <= -3) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
  if (score <= 3) return 'text-neutral-700 bg-neutral-100 dark:bg-neutral-800';
  if (score <= 6) return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20';
  return 'text-rose-700 bg-rose-100 dark:bg-rose-900/30';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

export default function ComparePage() {
  const [outlet1Id, setOutlet1Id] = useState<string>('');
  const [outlet2Id, setOutlet2Id] = useState<string>('');
  const [outlet3Id, setOutlet3Id] = useState<string>('');

  const selectedOutlets = useMemo(() => {
    const outlets = [];
    if (outlet1Id) outlets.push(mediaOutlets.find(o => o.id === outlet1Id));
    if (outlet2Id) outlets.push(mediaOutlets.find(o => o.id === outlet2Id));
    if (outlet3Id && outlet3Id !== 'none') outlets.push(mediaOutlets.find(o => o.id === outlet3Id));
    return outlets.filter(Boolean);
  }, [outlet1Id, outlet2Id, outlet3Id]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-4 text-3xl font-bold text-foreground">Compare Media Outlets</h1>
          <p className="text-muted-foreground">
            Select up to 3 media outlets to compare their bias scores, accountability metrics, and press freedom ratings side by side.
          </p>
        </div>

        {/* Selection */}
        <Card className="mb-8 p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Select Outlets</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="outlet1" className="mb-2 block text-sm font-medium text-muted-foreground">
                Outlet 1
              </Label>
              <Select value={outlet1Id} onValueChange={setOutlet1Id}>
                <SelectTrigger id="outlet1">
                  <SelectValue placeholder="Select first outlet" />
                </SelectTrigger>
                <SelectContent>
                  {mediaOutlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name} ({outlet.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="outlet2" className="mb-2 block text-sm font-medium text-muted-foreground">
                Outlet 2
              </Label>
              <Select value={outlet2Id} onValueChange={setOutlet2Id}>
                <SelectTrigger id="outlet2">
                  <SelectValue placeholder="Select second outlet" />
                </SelectTrigger>
                <SelectContent>
                  {mediaOutlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name} ({outlet.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="outlet3" className="mb-2 block text-sm font-medium text-muted-foreground">
                Outlet 3 (Optional)
              </Label>
              <Select value={outlet3Id} onValueChange={setOutlet3Id}>
                <SelectTrigger id="outlet3">
                  <SelectValue placeholder="Select third outlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {mediaOutlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name} ({outlet.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Comparison Table */}
        {selectedOutlets.length > 0 && (
          <div className="space-y-6">
            {/* Headers */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedOutlets.length}, 1fr)` }}>
              <div />
              {selectedOutlets.map(outlet => (
                <Card key={outlet!.id} className="p-4">
                  <div className="mb-3 flex h-16 items-center justify-center overflow-hidden rounded bg-white">
                    <Image
                      src={outlet!.logo || '/placeholder.svg'}
                      alt={`${outlet!.name} logo`}
                      width={100}
                      height={50}
                      className="object-contain"
                    />
                  </div>
                  <h3 className="mb-1 text-center font-semibold text-foreground">{outlet!.name}</h3>
                  <p className="mb-2 text-center text-xs text-muted-foreground">{outlet!.country}</p>
                  <Link href={`/outlet/${outlet!.id}`}>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      View Details
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>

            {/* Free Press Score */}
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Free Press Score</h3>
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedOutlets.length}, 1fr)` }}>
                <div className="flex items-center text-sm text-muted-foreground">Overall Rating</div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id} className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(outlet!.freePressScore)}`}>
                      {outlet!.freePressScore}
                    </div>
                    <div className="text-xs text-muted-foreground">out of 100</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Score Breakdown */}
            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-foreground">Score Breakdown</h3>
              
              {/* Fact-Check Accuracy */}
              <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedOutlets.length}, 1fr)` }}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Fact-Check Accuracy</span>
                </div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id}>
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <span className={`text-2xl font-bold ${getScoreColor(outlet!.factCheckAccuracy)}`}>
                        {outlet!.factCheckAccuracy}
                      </span>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                    <Progress value={outlet!.factCheckAccuracy} className="h-2" />
                  </div>
                ))}
              </div>

              {/* Editorial Independence */}
              <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedOutlets.length}, 1fr)` }}>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Editorial Independence</span>
                </div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id}>
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <span className={`text-2xl font-bold ${getScoreColor(outlet!.editorialIndependence)}`}>
                        {outlet!.editorialIndependence}
                      </span>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                    <Progress value={outlet!.editorialIndependence} className="h-2" />
                  </div>
                ))}
              </div>

              {/* Transparency */}
              <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedOutlets.length}, 1fr)` }}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Transparency</span>
                </div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id}>
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <span className={`text-2xl font-bold ${getScoreColor(outlet!.transparency)}`}>
                        {outlet!.transparency}
                      </span>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                    <Progress value={outlet!.transparency} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>

            {/* Bias Analysis */}
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Bias Analysis</h3>
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedOutlets.length}, 1fr)` }}>
                <div className="flex items-center text-sm text-muted-foreground">Political Lean</div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id} className="text-center">
                    <Badge variant="secondary" className={`mb-2 ${getBiasColor(outlet!.biasScore)}`}>
                      {getBiasLabel(outlet!.biasScore)}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {outlet!.biasScore > 0 ? '+' : ''}{outlet!.biasScore.toFixed(1)}
                    </div>
                  </div>
                ))}

                <div className="flex items-center text-sm text-muted-foreground">Perspectives</div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id} className="text-center">
                    <Badge variant={outlet!.perspectives === 'multiple' ? 'default' : 'secondary'}>
                      {outlet!.perspectives === 'multiple'
                        ? 'Multiple'
                        : outlet!.perspectives === 'limited'
                        ? 'Limited'
                        : 'Single'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Ownership */}
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Ownership & Funding</h3>
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedOutlets.length}, 1fr)` }}>
                <div className="flex items-center text-sm text-muted-foreground">Ownership</div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id} className="text-sm text-foreground">
                    {outlet!.ownership}
                  </div>
                ))}

                <div className="flex items-center text-sm text-muted-foreground">Funding Sources</div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id} className="flex flex-wrap gap-1">
                    {outlet!.funding.map((source, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                ))}
              </div>
            </Card>

            {/* Accountability */}
            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-foreground">Accountability Metrics</h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedOutlets.length}, 1fr)` }}>
                <div className="flex items-center text-sm text-muted-foreground">Retractions</div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id} className="text-center">
                    <div className="text-2xl font-bold text-foreground">{outlet!.retractions?.length || 0}</div>
                  </div>
                ))}

                <div className="flex items-center text-sm text-muted-foreground">Legal Cases</div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id} className="text-center">
                    <div className="text-2xl font-bold text-foreground">{outlet!.lawsuits?.length || 0}</div>
                  </div>
                ))}

                <div className="flex items-center text-sm text-muted-foreground">Scandals</div>
                {selectedOutlets.map(outlet => (
                  <div key={outlet!.id} className="text-center">
                    <div className="text-2xl font-bold text-foreground">{outlet!.scandals?.length || 0}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {selectedOutlets.length === 0 && (
          <Card className="p-12 text-center">
            <Scale className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">No Outlets Selected</h3>
            <p className="text-muted-foreground">
              Select at least one outlet above to start comparing
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
