// Type definitions for the news aggregator

export type ScrapeStatus = 'IDLE' | 'IN_PROGRESS' | 'DONE' | 'FAILED' | 'NO_SOURCE' | 'NO_NEWS';
export type JobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';
export type JobScope = 'ALL_UNIVERSITIES' | 'SINGLE_UNIVERSITY';
export type ScrapeStage = 'DISCOVER' | 'CRAWL' | 'PARSE' | 'SAVE_POSTS' | 'SAVE_MEDIA' | 'DONE';
export type MediaType = 'image' | 'video';

export interface University {
  id: string;
  region_id: string | null;
  name_uz: string;
  name_en: string | null;
  name_ru: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
  scrape_status: ScrapeStatus;
  last_scraped_at: string | null;
  last_error_message: string | null;
}

export interface NewsPost {
  id: string;
  university_id: string;
  title: string;
  slug: string;
  summary: string | null;
  content_html: string | null;
  content_text: string | null;
  published_at: string | null;
  source_url: string;
  canonical_url: string | null;
  language: string;
  cover_image_id: string | null;
  hash_fingerprint: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  university?: University;
  cover_image?: MediaAsset;
  media_assets?: MediaAsset[];
}

export interface MediaAsset {
  id: string;
  post_id: string | null;
  type: MediaType;
  original_url: string;
  stored_url: string | null;
  provider: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface ScrapeJob {
  id: string;
  scope: JobScope;
  university_id: string | null;
  status: JobStatus;
  started_at: string | null;
  finished_at: string | null;
  totals_json: {
    total_universities?: number;
    completed?: number;
    failed?: number;
    no_news?: number;
    no_source?: number;
    posts_found?: number;
    images_saved?: number;
    videos_saved?: number;
  };
  created_at: string;
  // Joined data
  university?: University;
}

export interface ScrapeJobEvent {
  id: string;
  job_id: string;
  university_id: string | null;
  timestamp: string;
  stage: ScrapeStage;
  message: string | null;
  counters_json: {
    pages_discovered?: number;
    pages_scanned?: number;
    posts_found?: number;
    posts_saved?: number;
    images_saved?: number;
    videos_saved?: number;
  };
  // Joined data
  university?: University;
}

export interface UniversityImportData {
  id: string;
  region_id?: string;
  name_uz: string;
  name_en?: string;
  name_ru?: string;
  website?: string;
  [key: string]: unknown;
}

export interface ExportFilters {
  university_id?: string;
  region_id?: string;
  from_date?: string;
  to_date?: string;
  language?: string;
}

export interface ExportedNewsPost {
  university: {
    id: string;
    name_uz: string;
    name_en: string | null;
    name_ru: string | null;
    region_id: string | null;
    website: string | null;
  };
  post: {
    title: string;
    summary: string | null;
    published_at: string | null;
    source_url: string;
    canonical_url: string | null;
    content_text: string | null;
    language: string;
  };
  media: {
    images: Array<{ stored_url: string | null; original_url: string }>;
    videos: Array<{ url: string; provider: string | null }>;
  };
}
