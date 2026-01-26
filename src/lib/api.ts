import { supabase } from "@/integrations/supabase/client";
import type { 
  University, 
  NewsPost, 
  MediaAsset,
  ScrapeJob, 
  ScrapeJobEvent, 
  UniversityImportData,
  ExportFilters,
  ExportedNewsPost,
  ScrapeStatus,
  JobStatus
} from "@/types/database";

// Universities API
export async function getUniversities(params?: {
  search?: string;
  region_id?: string;
  status?: ScrapeStatus;
  page?: number;
  limit?: number;
}): Promise<{ data: University[]; count: number }> {
  const { search, region_id, status, page = 1, limit = 20 } = params || {};
  
  let query = supabase
    .from('universities')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(`name_uz.ilike.%${search}%,name_en.ilike.%${search}%,name_ru.ilike.%${search}%`);
  }

  if (region_id) {
    query = query.eq('region_id', region_id);
  }

  if (status) {
    query = query.eq('scrape_status', status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query
    .order('name_uz', { ascending: true })
    .range(from, to);

  if (error) throw error;

  return { data: (data as University[]) || [], count: count || 0 };
}

export async function getUniversity(id: string): Promise<University | null> {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as University;
}

export async function importUniversities(universities: UniversityImportData[]): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  for (const uni of universities) {
    if (!uni.id || !uni.name_uz) {
      errors.push(`Invalid university data: missing id or name_uz`);
      continue;
    }

    const scrapeStatus: ScrapeStatus = !uni.website || uni.website.trim() === '' ? 'NO_SOURCE' : 'IDLE';

    const { error } = await supabase
      .from('universities')
      .upsert({
        id: uni.id,
        region_id: uni.region_id || null,
        name_uz: uni.name_uz,
        name_en: uni.name_en || null,
        name_ru: uni.name_ru || null,
        website: uni.website || null,
        scrape_status: scrapeStatus,
      }, { onConflict: 'id' });

    if (error) {
      errors.push(`Failed to import ${uni.id}: ${error.message}`);
    } else {
      imported++;
    }
  }

  return { imported, errors };
}

// News Posts API
export async function getNewsPosts(params?: {
  university_id?: string;
  search?: string;
  language?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: NewsPost[]; count: number }> {
  const { university_id, search, language, from_date, to_date, page = 1, limit = 20 } = params || {};

  let query = supabase
    .from('news_posts')
    .select(`
      *,
      university:universities(*),
      cover_image:media_assets!fk_cover_image(id, original_url, stored_url)
    `, { count: 'exact' });

  if (university_id) {
    query = query.eq('university_id', university_id);
  }

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  if (language && language !== 'all') {
    query = query.eq('language', language);
  }

  if (from_date) {
    query = query.gte('published_at', from_date);
  }

  if (to_date) {
    query = query.lte('published_at', to_date);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) throw error;

  return { data: (data as NewsPost[]) || [], count: count || 0 };
}

export async function getNewsPost(id: string): Promise<NewsPost | null> {
  const { data, error } = await supabase
    .from('news_posts')
    .select(`
      *,
      university:universities(*),
      media_assets:media_assets!media_assets_post_id_fkey(*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as NewsPost;
}

// Delete a news post and its media assets
export async function deleteNewsPost(id: string): Promise<void> {
  // First delete related media assets
  const { error: mediaError } = await supabase
    .from('media_assets')
    .delete()
    .eq('post_id', id);

  if (mediaError) throw mediaError;

  // Then delete the post
  const { error } = await supabase
    .from('news_posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Media Assets API
export async function getMediaAssets(postId: string): Promise<MediaAsset[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('post_id', postId);

  if (error) throw error;
  return (data as MediaAsset[]) || [];
}

// Scrape Jobs API
export async function getScrapeJobs(params?: {
  status?: JobStatus;
  page?: number;
  limit?: number;
}): Promise<{ data: ScrapeJob[]; count: number }> {
  const { status, page = 1, limit = 20 } = params || {};

  let query = supabase
    .from('scrape_jobs')
    .select(`
      *,
      university:universities(*)
    `, { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return { data: (data as ScrapeJob[]) || [], count: count || 0 };
}

export async function getActiveJobs(): Promise<ScrapeJob[]> {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select(`
      *,
      university:universities(*)
    `)
    .in('status', ['QUEUED', 'RUNNING'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as ScrapeJob[]) || [];
}

export async function createScrapeJob(scope: 'ALL_UNIVERSITIES' | 'SINGLE_UNIVERSITY', universityId?: string): Promise<ScrapeJob> {
  // Call the edge function to start the scrape job
  const { data, error } = await supabase.functions.invoke('start-scrape-job', {
    body: { scope, universityId },
  });

  if (error) {
    throw new Error(error.message || 'Failed to start scrape job');
  }

  // Return the created job
  const { data: job } = await supabase
    .from('scrape_jobs')
    .select('*')
    .eq('id', data.jobId)
    .single();

  return job as ScrapeJob;
}

export async function cancelScrapeJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('scrape_jobs')
    .update({ status: 'CANCELLED', finished_at: new Date().toISOString() })
    .eq('id', jobId);

  if (error) throw error;
}

export async function getScrapeJobEvents(jobId: string): Promise<ScrapeJobEvent[]> {
  const { data, error } = await supabase
    .from('scrape_job_events')
    .select(`
      *,
      university:universities(id, name_uz)
    `)
    .eq('job_id', jobId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return (data as ScrapeJobEvent[]) || [];
}

// Export API
export async function exportNewsPosts(filters: ExportFilters): Promise<ExportedNewsPost[]> {
  let query = supabase
    .from('news_posts')
    .select(`
      *,
      university:universities(*),
      media_assets:media_assets!media_assets_post_id_fkey(*)
    `);

  if (filters.university_id) {
    query = query.eq('university_id', filters.university_id);
  }

  if (filters.region_id) {
    query = query.eq('university.region_id', filters.region_id);
  }

  if (filters.from_date) {
    query = query.gte('published_at', filters.from_date);
  }

  if (filters.to_date) {
    query = query.lte('published_at', filters.to_date);
  }

  if (filters.language && filters.language !== 'all') {
    query = query.eq('language', filters.language);
  }

  const { data, error } = await query.order('published_at', { ascending: false });

  if (error) throw error;

  const posts = data as unknown as NewsPost[];

  return posts.map(post => ({
    university: {
      id: post.university?.id || post.university_id,
      name_uz: post.university?.name_uz || '',
      name_en: post.university?.name_en || null,
      name_ru: post.university?.name_ru || null,
      region_id: post.university?.region_id || null,
      website: post.university?.website || null,
    },
    post: {
      title: post.title,
      summary: post.summary,
      published_at: post.published_at,
      source_url: post.source_url,
      canonical_url: post.canonical_url,
      content_text: post.content_text,
      language: post.language,
    },
    media: {
      images: (post.media_assets || [])
        .filter(m => m.type === 'image')
        .map(m => ({ stored_url: m.stored_url, original_url: m.original_url })),
      videos: (post.media_assets || [])
        .filter(m => m.type === 'video')
        .map(m => ({ url: m.original_url, provider: m.provider })),
    },
  }));
}

// Statistics
export async function getStats(): Promise<{
  totalUniversities: number;
  totalPosts: number;
  byStatus: Record<string, number>;
}> {
  const { count: totalUniversities } = await supabase
    .from('universities')
    .select('*', { count: 'exact', head: true });

  const { count: totalPosts } = await supabase
    .from('news_posts')
    .select('*', { count: 'exact', head: true });

  const { data: statusData } = await supabase
    .from('universities')
    .select('scrape_status');

  const byStatus: Record<string, number> = {};
  (statusData || []).forEach(u => {
    const status = (u as { scrape_status: string }).scrape_status;
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  return {
    totalUniversities: totalUniversities || 0,
    totalPosts: totalPosts || 0,
    byStatus,
  };
}

// Get unique regions
export async function getRegions(): Promise<string[]> {
  const { data, error } = await supabase
    .from('universities')
    .select('region_id')
    .not('region_id', 'is', null);

  if (error) throw error;

  const regions = [...new Set((data as { region_id: string }[]).map(d => d.region_id))];
  return regions.filter(Boolean).sort();
}
