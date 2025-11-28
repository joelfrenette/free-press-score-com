'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RefreshDataButtonProps {
  outletId: string;
  sourceUrl?: string;
  platform?: string;
}

export function RefreshDataButton({ outletId, sourceUrl, platform }: RefreshDataButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleRefresh = async () => {
    if (!sourceUrl || !platform) {
      toast({
        title: 'Cannot refresh',
        description: 'No data source configured for this outlet',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId,
          sourceUrl,
          platform,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        toast({
          title: 'Data refreshed',
          description: `Successfully updated ${platform} data`,
        });
        
        // Reset status after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        toast({
          title: 'Refresh failed',
          description: data.error || 'Could not refresh data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setStatus('error');
      toast({
        title: 'Error',
        description: 'Network error while refreshing data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {status === 'success' ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : status === 'error' ? (
        <XCircle className="h-4 w-4 text-destructive" />
      ) : (
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      )}
      {isLoading ? 'Refreshing...' : 'Refresh Data'}
    </Button>
  );
}
