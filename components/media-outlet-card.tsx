import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MediaOutlet } from '@/lib/types';
import { getBiasLabel, getBiasColor, getBiasBgColor, getScoreColor } from '@/lib/utils';
import { TrendingUp, AlertCircle, Users, Tv, Newspaper, Globe, Mic, Youtube, Twitter } from 'lucide-react';

interface MediaOutletCardProps {
  outlet: MediaOutlet;
}

function getMediaTypeIcon(outlet: MediaOutlet) {
  if (outlet.outletType === 'influencer') {
    if (outlet.platform === 'youtube') return <Youtube className="h-4 w-4" />;
    if (outlet.platform === 'podcast') return <Mic className="h-4 w-4" />;
    if (outlet.platform === 'twitter') return <Twitter className="h-4 w-4" />;
    if (outlet.platform === 'tiktok') return <Globe className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  }
  
  if (outlet.metrics.type === 'tv') return <Tv className="h-4 w-4" />;
  if (outlet.metrics.type === 'print') return <Newspaper className="h-4 w-4" />;
  if (outlet.metrics.type === 'podcast') return <Mic className="h-4 w-4" />;
  return <Globe className="h-4 w-4" />;
}

export function MediaOutletCard({ outlet }: MediaOutletCardProps) {
  const hasIssues = outlet.lawsuits.length > 0 || outlet.scandals.length > 0;

  const handleVisitWebsite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(outlet.website, '_blank', 'noopener,noreferrer');
  };

  return (
    <Link href={`/outlet/${outlet.id}`}>
      <Card className={`group relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] ${getBiasBgColor(outlet.biasScore)} border`}>
        <div className="p-4">
          <div className="mb-3 flex items-start justify-between">
            <div className="relative h-12 w-24 overflow-hidden rounded bg-white">
              <Image
                src={outlet.logo || "/placeholder.svg"}
                alt={`${outlet.name} logo`}
                fill
                className="object-contain p-1"
              />
            </div>
            <div className="flex items-center gap-1">
              {hasIssues && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <button
                onClick={handleVisitWebsite}
                className="flex items-center justify-center rounded-full bg-background/80 p-1.5 shadow-sm transition-all hover:bg-background hover:scale-110"
                title={`Visit ${outlet.name}`}
                type="button"
              >
                {getMediaTypeIcon(outlet)}
              </button>
            </div>
          </div>

          <h3 className="mb-1 font-semibold text-foreground group-hover:text-accent">
            {outlet.name}
          </h3>

          <div className="mb-3 flex items-center gap-2">
            <Badge variant="secondary" className={`${getBiasColor(outlet.biasScore)} text-xs`}>
              {getBiasLabel(outlet.biasScore)}
            </Badge>
            <span className="text-xs text-muted-foreground">{outlet.country}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className={`text-sm font-bold ${getScoreColor(outlet.freePressScore)}`}>
                {outlet.freePressScore}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>

          <div className="mt-2 flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Avg. Monthly:</span>
            <span className="text-xs font-semibold text-foreground">{outlet.metrics.avgMonthlyAudience}</span>
          </div>

          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {outlet.description}
          </p>
        </div>
      </Card>
    </Link>
  );
}
