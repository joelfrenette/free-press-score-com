'use client'

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Database, CheckCircle, XCircle, AlertCircle, Play, Lock, Search, Users, DollarSign, Scale, FileText, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface ScrapeResult {
  outletId: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface AdminDashboardClientProps {
  hasApiKey: boolean;
  totalOutlets: number;
  scrapableOutlets: Array<{
    id: string;
    name: string;
    platform?: string;
    outletType: string;
  }>;
}

export function AdminDashboardClient({ hasApiKey, totalOutlets, scrapableOutlets }: AdminDashboardClientProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (email === 'joelfrenette@gmail.com' && password === 'Japan2025!') {
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid email or password');
    }
  };

  const handleBulkOperation = async (operationType: string) => {
    setIsScraping(true);
    setActiveOperation(operationType);
    setProgress(0);
    setResults([]);

    let outletsToProcess = [];
    let endpoint = '/api/scrape';

    switch (operationType) {
      case 'discover':
        endpoint = '/api/scrape/discover';
        break;
      case 'ownership':
        endpoint = '/api/scrape/ownership';
        outletsToProcess = scrapableOutlets.slice(0, 20);
        break;
      case 'funding':
        endpoint = '/api/scrape/funding';
        outletsToProcess = scrapableOutlets.slice(0, 20);
        break;
      case 'legal':
        endpoint = '/api/scrape/legal';
        outletsToProcess = scrapableOutlets.slice(0, 20);
        break;
      case 'accountability':
        endpoint = '/api/scrape/accountability';
        outletsToProcess = scrapableOutlets.slice(0, 20);
        break;
      case 'audience':
        outletsToProcess = scrapableOutlets.slice(0, 10).map(outlet => ({
          id: outlet.id,
          url: `https://www.${outlet.platform}.com/@${outlet.name.toLowerCase().replace(/\s+/g, '')}`,
          platform: outlet.platform || 'youtube',
        }));
        break;
      case 'merge':
        endpoint = '/api/scrape/merge';
        outletsToProcess = scrapableOutlets;
        break;
      case 'logos':
        endpoint = '/api/scrape/logos';
        outletsToProcess = scrapableOutlets.slice(0, 30);
        break;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          outlets: outletsToProcess,
          operationType 
        }),
      });

      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        setResults(data.results);
        setProgress(100);
      } else if (data.error) {
        setResults([{
          outletId: 'error',
          success: false,
          error: data.error
        }]);
        setProgress(100);
      } else {
        setResults([]);
        setProgress(100);
      }
    } catch (error) {
      console.error(`[v0] Bulk ${operationType} error:`, error);
      setResults([{
        outletId: 'error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }]);
    } finally {
      setIsScraping(false);
      setActiveOperation(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <h1 className="mb-2 text-center text-2xl font-bold text-foreground">Admin Login</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Enter your credentials to access the admin dashboard
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {loginError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {loginError}
              </div>
            )}

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-6">
            <Link href="/">
              <Button variant="ghost" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const successCount = Array.isArray(results) ? results.filter(r => r.success).length : 0;
  const failCount = Array.isArray(results) ? results.filter(r => !r.success).length : 0;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage data scraping and updates for media outlets
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
          Logout
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Total Outlets</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{totalOutlets}</div>
        </Card>

        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Scrapable</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{scrapableOutlets.length}</div>
        </Card>

        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-muted-foreground">Success</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{successCount}</div>
        </Card>

        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-muted-foreground">Failed</span>
          </div>
          <div className="text-3xl font-bold text-destructive">{failCount}</div>
        </Card>
      </div>

      {/* Bulk Scraping Control */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        {/* Discover New Outlets */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Discover New Outlets</h3>
              <p className="text-sm text-muted-foreground">
                Search for new media outlets with over 1M monthly audience
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleBulkOperation('discover')}
            disabled={isScraping || !hasApiKey}
            className="w-full gap-2"
            variant="default"
          >
            {isScraping && activeOperation === 'discover' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Discover Outlets
              </>
            )}
          </Button>
        </Card>

        {/* Update Ownership */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Update Ownership</h3>
              <p className="text-sm text-muted-foreground">
                Refresh stakeholder and board member information
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleBulkOperation('ownership')}
            disabled={isScraping || !hasApiKey}
            className="w-full gap-2"
            variant="default"
          >
            {isScraping && activeOperation === 'ownership' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                Update Ownership
              </>
            )}
          </Button>
        </Card>

        {/* Update Funding */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-green-500/10 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Update Funding</h3>
              <p className="text-sm text-muted-foreground">
                Research sponsorships and financial supporters
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleBulkOperation('funding')}
            disabled={isScraping || !hasApiKey}
            className="w-full gap-2"
            variant="default"
          >
            {isScraping && activeOperation === 'funding' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4" />
                Update Funding
              </>
            )}
          </Button>
        </Card>

        {/* Research Legal Cases */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Scale className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Research Legal Cases</h3>
              <p className="text-sm text-muted-foreground">
                Find defamation suits, settlements, and court proceedings
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleBulkOperation('legal')}
            disabled={isScraping || !hasApiKey}
            className="w-full gap-2"
            variant="default"
          >
            {isScraping && activeOperation === 'legal' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Scale className="h-4 w-4" />
                Research Legal
              </>
            )}
          </Button>
        </Card>

        {/* Update Accountability */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-red-500/10 p-3">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Update Accountability</h3>
              <p className="text-sm text-muted-foreground">
                Count retractions, errata, and update scores
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleBulkOperation('accountability')}
            disabled={isScraping || !hasApiKey}
            className="w-full gap-2"
            variant="default"
          >
            {isScraping && activeOperation === 'accountability' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Counting...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Update Accountability
              </>
            )}
          </Button>
        </Card>

        {/* Update Audience Data */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Update Audience Data</h3>
              <p className="text-sm text-muted-foreground">
                Refresh follower counts and viewership metrics
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleBulkOperation('audience')}
            disabled={isScraping || !hasApiKey}
            className="w-full gap-2"
            variant="default"
          >
            {isScraping && activeOperation === 'audience' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Update Audience
              </>
            )}
          </Button>
        </Card>

        {/* Merge Duplicates */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-cyan-500/10 p-3">
              <Database className="h-6 w-6 text-cyan-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Merge Duplicates</h3>
              <p className="text-sm text-muted-foreground">
                Identify and merge duplicate media outlet entries
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleBulkOperation('merge')}
            disabled={isScraping || !hasApiKey}
            className="w-full gap-2"
            variant="default"
          >
            {isScraping && activeOperation === 'merge' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                Merge Duplicates
              </>
            )}
          </Button>
        </Card>

        {/* Update Logos */}
        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-lg bg-indigo-500/10 p-3">
              <RefreshCw className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-foreground">Update Logos</h3>
              <p className="text-sm text-muted-foreground">
                Refresh and update media outlet logos from official sources
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleBulkOperation('logos')}
            disabled={isScraping || !hasApiKey}
            className="w-full gap-2"
            variant="default"
          >
            {isScraping && activeOperation === 'logos' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Update Logos
              </>
            )}
          </Button>
        </Card>
      </div>

      {isScraping && (
        <Card className="mb-8 p-6">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-foreground">
                {activeOperation === 'discover' && 'Discovering new outlets...'}
                {activeOperation === 'ownership' && 'Updating ownership data...'}
                {activeOperation === 'funding' && 'Researching funding sources...'}
                {activeOperation === 'legal' && 'Researching legal cases...'}
                {activeOperation === 'accountability' && 'Counting retractions and errata...'}
                {activeOperation === 'audience' && 'Updating audience metrics...'}
                {activeOperation === 'merge' && 'Identifying and merging duplicates...'}
                {activeOperation === 'logos' && 'Updating media outlet logos...'}
              </span>
              <span className="text-sm font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>
      )}

      {!hasApiKey && (
        <Card className="mb-8 p-6">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="mb-1 font-semibold text-foreground">API Key Required</h3>
              <p className="text-sm text-muted-foreground">
                Please add SCRAPINGBEE_API_KEY to your environment variables in the Vars section
                to enable data scraping.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold text-foreground">Scraping Results</h2>
          <div className="space-y-2">
            {results.map((result, index) => {
              const outlet = scrapableOutlets.find(o => o.id === result.outletId);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <div className="font-medium text-foreground">{outlet?.name}</div>
                      {result.success ? (
                        <div className="text-sm text-muted-foreground">
                          Followers: {result.data?.followerCount}
                        </div>
                      ) : (
                        <div className="text-sm text-destructive">{result.error}</div>
                      )}
                    </div>
                  </div>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Back to Dashboard */}
      <div className="mt-8">
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
