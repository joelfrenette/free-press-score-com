'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mediaOutlets } from '@/lib/mock-data';
import { getBiasLabel, getBiasColor } from '@/lib/utils';
import { Search, TrendingUp } from 'lucide-react';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const filteredOutlets = useMemo(() => {
    if (!query) return mediaOutlets;

    const lowerQuery = query.toLowerCase();
    return mediaOutlets.filter(
      (outlet) =>
        outlet.name.toLowerCase().includes(lowerQuery) ||
        outlet.country.toLowerCase().includes(lowerQuery) ||
        outlet.description.toLowerCase().includes(lowerQuery) ||
        getBiasLabel(outlet.biasScore).toLowerCase().includes(lowerQuery)
    );
  }, [query]);

  const handleSelectOutlet = (id: string) => {
    router.push(`/outlet/${id}`);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Media Outlets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, country, or bias..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[400px]">
            {filteredOutlets.length > 0 ? (
              <div className="space-y-2">
                {filteredOutlets.map((outlet) => (
                  <button
                    key={outlet.id}
                    onClick={() => handleSelectOutlet(outlet.id)}
                    className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{outlet.name}</h3>
                        <p className="text-sm text-muted-foreground">{outlet.country}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground">
                          {outlet.freePressScore}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`${getBiasColor(outlet.biasScore)} text-xs`}>
                        {getBiasLabel(outlet.biasScore)}
                      </Badge>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {outlet.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-[400px] items-center justify-center text-center">
                <div>
                  <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No outlets found</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
