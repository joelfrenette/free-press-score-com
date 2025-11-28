import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mediaOutlets } from '@/lib/mock-data';
import { RefreshCw, Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { checkScrapingBeeApiKey } from '@/lib/admin-actions';
import { AdminDashboardClient } from '@/components/admin-dashboard-client';

export default async function AdminPage() {
  const hasApiKey = await checkScrapingBeeApiKey();

  const scrapableOutlets = mediaOutlets.filter(
    outlet => outlet.website || outlet.platform
  );

  return (
    <main className="min-h-screen bg-background">
      <AdminDashboardClient 
        hasApiKey={hasApiKey}
        totalOutlets={mediaOutlets.length}
        scrapableOutlets={scrapableOutlets}
      />
    </main>
  );
}
