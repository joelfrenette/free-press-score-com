import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Github, Twitter } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">About Free Press Score</h1>
            <p className="text-lg text-muted-foreground">
              Empowering informed media consumption through transparency
            </p>
          </div>

          <Card className="mb-8 p-8">
            <h2 className="mb-4 text-2xl font-bold text-foreground">Our Mission</h2>
            <p className="mb-4 text-muted-foreground">
              Free Press Score was created to address a critical need in today's media landscape: helping people understand the bias, credibility, and accountability of news sources. In an era of information overload and declining trust in media, we believe transparency is essential.
            </p>
            <p className="mb-4 text-muted-foreground">
              We aggregate data from multiple independent fact-checking organizations, media watchdog groups, and academic researchers to provide comprehensive, data-driven assessments of media outlets worldwide.
            </p>
            <p className="text-muted-foreground">
              Our platform is designed to promote media literacy, not to tell you which sources to trust. We encourage readers to consume news from multiple perspectives and to think critically about all media sources.
            </p>
          </Card>

          <Card className="mb-8 p-8">
            <h2 className="mb-4 text-2xl font-bold text-foreground">What We Believe</h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="mb-2 font-semibold text-foreground">Transparency Over Neutrality</h3>
                <p className="text-sm text-muted-foreground">
                  Perfect neutrality is impossible. We believe in being transparent about our methodology and data sources rather than claiming absolute objectivity.
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="mb-2 font-semibold text-foreground">Diverse Perspectives Matter</h3>
                <p className="text-sm text-muted-foreground">
                  Understanding different viewpoints is essential for democratic discourse. We map the media landscape to help readers find quality sources across the political spectrum.
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="mb-2 font-semibold text-foreground">Accountability Matters</h3>
                <p className="text-sm text-muted-foreground">
                  Media outlets should be held accountable for errors, ethical lapses, and failures of transparency. We track corrections, retractions, and legal actions.
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="mb-2 font-semibold text-foreground">Independence Is Key</h3>
                <p className="text-sm text-muted-foreground">
                  Editorial independence from political, corporate, and government influence is crucial for trustworthy journalism.
                </p>
              </div>
            </div>
          </Card>

          <Card className="mb-8 p-8">
            <h2 className="mb-4 text-2xl font-bold text-foreground">How to Use This Site</h2>
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-accent">1.</span>
                <span>Browse the dashboard to see media outlets organized by country and political lean</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-accent">2.</span>
                <span>Click on any outlet to view detailed scores, bias analysis, and accountability metrics</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-accent">3.</span>
                <span>Use the Compare tool to examine multiple outlets side-by-side</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-accent">4.</span>
                <span>Read our Methodology page to understand how scores are calculated</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-accent">5.</span>
                <span>Use this information to diversify your media diet and think critically about sources</span>
              </li>
            </ol>
          </Card>

          <Card className="mb-8 p-8">
            <h2 className="mb-4 text-2xl font-bold text-foreground">Updates & Data Freshness</h2>
            <p className="mb-4 text-muted-foreground">
              We update our assessments on a rolling basis as new information becomes available. Major updates include:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Quarterly reviews of all outlet scores and bias assessments</li>
              <li>Immediate updates when major legal actions or scandals occur</li>
              <li>Monthly tracking of retractions and corrections</li>
              <li>Annual comprehensive methodology reviews</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Last major update: January 2025
            </p>
          </Card>

          <Card className="border-accent/50 bg-accent/5 p-8 text-center">
            <h2 className="mb-4 text-2xl font-bold text-foreground">Get in Touch</h2>
            <p className="mb-6 text-muted-foreground">
              Have questions, suggestions, or concerns about our ratings? We'd love to hear from you.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                Email Us
              </Button>
              <Button variant="outline" className="gap-2">
                <Twitter className="h-4 w-4" />
                Follow on Twitter
              </Button>
              <Button variant="outline" className="gap-2">
                <Github className="h-4 w-4" />
                View on GitHub
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
