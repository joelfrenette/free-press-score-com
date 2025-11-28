import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Eye, FileText, Scale, AlertCircle, TrendingUp } from 'lucide-react';

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">Methodology</h1>
            <p className="text-lg text-muted-foreground">
              Understanding how we assess media bias and press freedom
            </p>
          </div>

          {/* Free Press Score */}
          <Card className="mb-8 p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-accent" />
              <h2 className="text-2xl font-bold text-foreground">Free Press Score (0-100)</h2>
            </div>
            <p className="mb-4 text-muted-foreground">
              Our Free Press Score is a composite metric that aggregates three key dimensions of media quality and independence. Each dimension is weighted equally in the final calculation.
            </p>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-foreground">Fact-Check Accuracy (33%)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Measures the outlet's track record of factual reporting based on independent fact-checking organizations including PolitiFact, FactCheck.org, and Snopes. We analyze the percentage of stories that contain verifiable facts, the rate of corrections issued, and ratings from third-party fact-checkers.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-foreground">Editorial Independence (33%)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Assesses the degree of separation between ownership, advertisers, and editorial decisions. We examine ownership structure, funding sources, documented instances of editorial interference, and the presence of independent editorial boards. State-controlled media receives lower scores.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-foreground">Transparency (33%)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Evaluates how openly the outlet discloses its ownership, funding, conflicts of interest, and editorial processes. We look for clear disclosure of sponsored content, accessibility of corrections and retractions, and transparency about methodology and sources.
                </p>
              </div>
            </div>
          </Card>

          {/* Bias Score */}
          <Card className="mb-8 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Scale className="h-6 w-6 text-accent" />
              <h2 className="text-2xl font-bold text-foreground">Bias Score (-2 to +2)</h2>
            </div>
            <p className="mb-4 text-muted-foreground">
              Our bias assessment measures the political lean of editorial content and news coverage on a five-point scale. This is not a judgment of quality, but rather an assessment of ideological positioning.
            </p>
            
            <div className="mb-6">
              <div className="mb-2 h-8 w-full overflow-hidden rounded-lg bg-gradient-to-r from-[var(--far-left)] via-[var(--center-bias)] to-[var(--far-right)]" />
              <div className="flex justify-between text-sm">
                <Badge variant="outline" className="bg-[var(--far-left)]/10 text-[var(--far-left)]">
                  -2.0 to -1.5<br/>Far Left
                </Badge>
                <Badge variant="outline" className="bg-[var(--left-bias)]/10 text-[var(--left-bias)]">
                  -1.5 to -0.5<br/>Left
                </Badge>
                <Badge variant="outline" className="bg-[var(--center-bias)]/10 text-[var(--center-bias)]">
                  -0.5 to 0.5<br/>Center
                </Badge>
                <Badge variant="outline" className="bg-[var(--right-bias)]/10 text-[var(--right-bias)]">
                  0.5 to 1.5<br/>Right
                </Badge>
                <Badge variant="outline" className="bg-[var(--far-right)]/10 text-[var(--far-right)]">
                  1.5 to 2.0<br/>Far Right
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Assessment Methodology</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span><strong>Content Analysis:</strong> We analyze word choice, story selection, source usage, and framing across hundreds of articles</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span><strong>Source Attribution:</strong> Examination of which sources are quoted and how frequently different perspectives are presented</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span><strong>Editorial Positioning:</strong> Review of opinion pieces, editorial board positions, and public statements</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span><strong>Third-Party Assessments:</strong> We incorporate ratings from AllSides, Media Bias/Fact Check, and academic media studies</span>
                </li>
              </ul>
            </div>
          </Card>

          {/* Accountability Metrics */}
          <Card className="mb-8 p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-accent" />
              <h2 className="text-2xl font-bold text-foreground">Accountability Metrics</h2>
            </div>
            <p className="mb-4 text-muted-foreground">
              We track concrete actions that demonstrate accountability and transparency, including:
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <FileText className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Retractions & Corrections</h3>
                  <p className="text-sm text-muted-foreground">
                    Documented instances where the outlet acknowledged and corrected errors in their reporting
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <Scale className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Legal Cases</h3>
                  <p className="text-sm text-muted-foreground">
                    Active and settled lawsuits for defamation, misinformation, or privacy violations
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <AlertCircle className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Controversies & Scandals</h3>
                  <p className="text-sm text-muted-foreground">
                    Major incidents involving journalistic ethics, editorial interference, or public trust
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Data Sources */}
          <Card className="mb-8 p-6">
            <h2 className="mb-4 text-2xl font-bold text-foreground">Data Sources</h2>
            <p className="mb-4 text-muted-foreground">
              Our assessments are compiled from multiple independent sources including:
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="font-medium text-foreground">AllSides Media Bias Ratings</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="font-medium text-foreground">Media Bias/Fact Check</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="font-medium text-foreground">Reporters Without Borders</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="font-medium text-foreground">Freedom House</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="font-medium text-foreground">PolitiFact</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="font-medium text-foreground">FactCheck.org</p>
              </div>
            </div>
          </Card>

          {/* Disclaimer */}
          <Card className="border-accent/50 bg-accent/5 p-6">
            <h3 className="mb-2 font-semibold text-foreground">Important Disclaimer</h3>
            <p className="text-sm text-muted-foreground">
              Our ratings represent an aggregation of available data and third-party assessments. Media bias analysis is inherently subjective, and reasonable people may disagree with specific ratings. We encourage users to read from multiple sources across the political spectrum and to consult original sources when possible. Our goal is to promote media literacy and informed news consumption, not to serve as the sole arbiter of media quality.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
