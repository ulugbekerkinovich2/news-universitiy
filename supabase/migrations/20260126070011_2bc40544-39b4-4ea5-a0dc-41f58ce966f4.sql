-- Create enums for status tracking
CREATE TYPE scrape_status AS ENUM ('IDLE', 'IN_PROGRESS', 'DONE', 'FAILED', 'NO_SOURCE', 'NO_NEWS');
CREATE TYPE job_status AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED');
CREATE TYPE job_scope AS ENUM ('ALL_UNIVERSITIES', 'SINGLE_UNIVERSITY');
CREATE TYPE scrape_stage AS ENUM ('DISCOVER', 'CRAWL', 'PARSE', 'SAVE_POSTS', 'SAVE_MEDIA', 'DONE');
CREATE TYPE media_type AS ENUM ('image', 'video');

-- Universities table
CREATE TABLE public.universities (
  id TEXT PRIMARY KEY,
  region_id TEXT,
  name_uz TEXT NOT NULL,
  name_en TEXT,
  name_ru TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scrape_status scrape_status NOT NULL DEFAULT 'IDLE',
  last_scraped_at TIMESTAMPTZ,
  last_error_message TEXT
);

-- Create index for faster queries
CREATE INDEX idx_universities_region ON public.universities(region_id);
CREATE INDEX idx_universities_scrape_status ON public.universities(scrape_status);

-- News posts table
CREATE TABLE public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id TEXT NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  content_html TEXT,
  content_text TEXT,
  published_at TIMESTAMPTZ,
  source_url TEXT NOT NULL,
  canonical_url TEXT,
  language TEXT DEFAULT 'unknown',
  cover_image_id UUID,
  hash_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(university_id, slug),
  UNIQUE(source_url)
);

-- Create indexes for news_posts
CREATE INDEX idx_news_posts_university ON public.news_posts(university_id);
CREATE INDEX idx_news_posts_published_at ON public.news_posts(published_at DESC);
CREATE INDEX idx_news_posts_language ON public.news_posts(language);
CREATE INDEX idx_news_posts_hash ON public.news_posts(hash_fingerprint);

-- Media assets table
CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.news_posts(id) ON DELETE CASCADE,
  type media_type NOT NULL DEFAULT 'image',
  original_url TEXT NOT NULL,
  stored_url TEXT,
  provider TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(original_url)
);

CREATE INDEX idx_media_assets_post ON public.media_assets(post_id);

-- Add foreign key for cover image after media_assets exists
ALTER TABLE public.news_posts 
ADD CONSTRAINT fk_cover_image 
FOREIGN KEY (cover_image_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

-- Scrape jobs table
CREATE TABLE public.scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope job_scope NOT NULL DEFAULT 'SINGLE_UNIVERSITY',
  university_id TEXT REFERENCES public.universities(id) ON DELETE CASCADE,
  status job_status NOT NULL DEFAULT 'QUEUED',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  totals_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scrape_jobs_status ON public.scrape_jobs(status);
CREATE INDEX idx_scrape_jobs_university ON public.scrape_jobs(university_id);

-- Scrape job events table for real-time progress
CREATE TABLE public.scrape_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.scrape_jobs(id) ON DELETE CASCADE,
  university_id TEXT REFERENCES public.universities(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  stage scrape_stage NOT NULL,
  message TEXT,
  counters_json JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_scrape_job_events_job ON public.scrape_job_events(job_id);
CREATE INDEX idx_scrape_job_events_timestamp ON public.scrape_job_events(timestamp DESC);

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.scrape_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scrape_job_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.universities;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_universities_updated_at
  BEFORE UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_posts_updated_at
  BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies (public read access, no auth required as per spec)
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_job_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access" ON public.universities FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.universities FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.universities FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.universities FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.news_posts FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.news_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.news_posts FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.news_posts FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.media_assets FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.media_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.media_assets FOR UPDATE USING (true);

CREATE POLICY "Public read access" ON public.scrape_jobs FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.scrape_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.scrape_jobs FOR UPDATE USING (true);

CREATE POLICY "Public read access" ON public.scrape_job_events FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.scrape_job_events FOR INSERT WITH CHECK (true);