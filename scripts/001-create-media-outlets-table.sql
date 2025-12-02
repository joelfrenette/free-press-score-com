-- Create media_outlets table for persistent storage
CREATE TABLE IF NOT EXISTS media_outlets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  bias_score DECIMAL(3,2) DEFAULT 0,
  free_press_score INTEGER DEFAULT 0,
  logo TEXT,
  description TEXT,
  website TEXT,
  outlet_type TEXT DEFAULT 'traditional',
  platform TEXT,
  fact_check_accuracy INTEGER DEFAULT 0,
  editorial_independence INTEGER DEFAULT 0,
  transparency INTEGER DEFAULT 0,
  perspectives TEXT DEFAULT 'multiple',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Store complex nested data as JSONB
  ownership JSONB,
  funding JSONB,
  sponsors JSONB DEFAULT '[]'::jsonb,
  stakeholders JSONB DEFAULT '[]'::jsonb,
  board_members JSONB DEFAULT '[]'::jsonb,
  metrics JSONB,
  retractions JSONB DEFAULT '[]'::jsonb,
  lawsuits JSONB DEFAULT '[]'::jsonb,
  scandals JSONB DEFAULT '[]'::jsonb,
  legal_cases JSONB,
  audience_data JSONB,
  audience_size INTEGER,
  accountability JSONB,
  type TEXT,
  overall_score INTEGER,
  scores JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_media_outlets_country ON media_outlets(country);
CREATE INDEX IF NOT EXISTS idx_media_outlets_bias ON media_outlets(bias_score);
CREATE INDEX IF NOT EXISTS idx_media_outlets_name ON media_outlets(name);

-- Enable Row Level Security
ALTER TABLE media_outlets ENABLE ROW LEVEL SECURITY;

-- Allow public read access (no auth required for viewing)
CREATE POLICY "Allow public read access" ON media_outlets
  FOR SELECT USING (true);

-- Allow authenticated users to insert/update/delete (for admin)
CREATE POLICY "Allow authenticated write access" ON media_outlets
  FOR ALL USING (true);
