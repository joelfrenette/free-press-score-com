'use client';

import { Tv, Newspaper, Mic, Youtube, Radio } from 'lucide-react';

interface MediaTypeLinkProps {
  website: string;
  outletType: 'traditional' | 'influencer';
  platform?: 'youtube' | 'podcast' | 'twitter' | 'tiktok' | 'instagram';
  metricsType?: 'tv' | 'print' | 'digital' | 'mixed' | 'podcast';
  outletName: string;
}

export function MediaTypeLink({ website, outletType, platform, metricsType, outletName }: MediaTypeLinkProps) {
  const getMediaTypeIcon = () => {
    if (outletType === 'influencer') {
      if (platform === 'youtube') return Youtube;
      if (platform === 'podcast') return Mic;
      if (platform === 'twitter') return Radio;
      if (platform === 'tiktok') return Tv;
      return Radio;
    }
    if (metricsType === 'tv') return Tv;
    if (metricsType === 'print') return Newspaper;
    if (metricsType === 'podcast') return Mic;
    return Radio; // digital/mixed
  };

  const MediaIcon = getMediaTypeIcon();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(website, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center rounded-full bg-background/80 p-2 shadow-md transition-all hover:scale-110 hover:bg-accent hover:shadow-lg"
      title={`Visit ${outletName}`}
    >
      <MediaIcon className="h-5 w-5 text-foreground" />
    </button>
  );
}
