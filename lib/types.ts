export interface MediaOutlet {
  id: string;
  name: string;
  country: string;
  biasScore: number; // -2 (far left) to +2 (far right), 0 is center
  freePressScore: number; // 0-100
  logo: string;
  description: string;
  ownership: string;
  funding: string[];
  website: string; // Added website field for linking to source
  sponsors: Sponsor[];
  stakeholders: Stakeholder[];
  boardMembers: BoardMember[];
  metrics: IndustryMetrics;
  outletType: 'traditional' | 'influencer';
  platform?: 'podcast' | 'youtube' | 'tiktok' | 'twitter' | 'multi-platform';
  retractions: Retraction[];
  lawsuits: Lawsuit[];
  scandals: Scandal[];
  factCheckAccuracy: number; // 0-100
  editorialIndependence: number; // 0-100
  transparency: number; // 0-100
  perspectives: 'single' | 'limited' | 'multiple';
  lastUpdated: string;
}

export interface IndustryMetrics {
  type: 'tv' | 'print' | 'digital' | 'mixed' | 'podcast' | 'social';
  avgMonthlyAudience: string; // Standardized metric across all outlet types
  digitalSubscribers?: string; // Optional additional metric
  totalFollowers?: string; // For social media influencers
  avgViewsPerVideo?: string; // For YouTube/TikTok
  engagementRate?: string; // For social media
}

export interface Retraction {
  date: string;
  title: string;
  description: string;
}

export interface Lawsuit {
  date: string;
  type: 'defamation' | 'misinformation' | 'other';
  status: 'active' | 'settled' | 'dismissed';
  description: string;
  amount?: number;
}

export interface Scandal {
  date: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface Sponsor {
  name: string;
  type: 'advertiser' | 'investor' | 'donor' | 'parent-company' | 'government';
  amount?: string; // Optional financial amount
  relationship: string; // Description of the relationship
}

export interface Stakeholder {
  name: string;
  stake: string; // Percentage or description of stake
  entity?: string; // Company or fund they represent
  politicalLean: 'far-left' | 'left' | 'center' | 'right' | 'far-right' | 'unknown';
  description: string;
}

export interface BoardMember {
  name: string;
  position: string;
  background: string;
  politicalLean: 'far-left' | 'left' | 'center' | 'right' | 'far-right' | 'unknown';
  description: string;
}

export const COUNTRIES = [
  'United States',
  'Canada',
  'Australia',
  'United Kingdom',
  'France',
  'Germany',
  'Russia',
  'Middle East',
  'China',
  'India',
] as const;

export type Country = typeof COUNTRIES[number];

export const BIAS_CATEGORIES = {
  'far-left': { min: -2, max: -1.5, label: 'Far Left' },
  'left': { min: -1.49, max: -0.5, label: 'Left' },
  'center': { min: -0.49, max: 0.49, label: 'Center' },
  'right': { min: 0.5, max: 1.49, label: 'Right' },
  'far-right': { min: 1.5, max: 2, label: 'Far Right' },
} as const;
