// Base URL of the FastAPI backend
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

import type { 
  University, 
  NewsPost, 
  MediaAsset, 
  ScrapeJob, 
  ScrapeJobEvent, 
  ScrapeStatus, 
  JobStatus 
} from "@/types/database";

export type { ScrapeStatus, JobStatus, University, MediaAsset, NewsPost, ScrapeJob, ScrapeJobEvent };

export interface UniversityImportData {
  id: string;
  name_uz: string;
  name_en?: string;
  name_ru?: string;
  region_id?: string;
  website?: string;
}

export interface DashboardInit {
  stats: {
    totalUniversities: number;
    totalPosts: number;
    byStatus: Record<string, number>;
  };
  regions: string[];
  universities: {
    data: University[];
    count: number;
  };
}

// ── Dashboard API ────────────────────────────────────────────────────────────

export async function getDashboardInit(): Promise<DashboardInit> {
  return request("/dashboard/init");
}

// ── Universities API ─────────────────────────────────────────────────────────

export async function getUniversities(params?: {
  search?: string;
  region_id?: string;
  status?: ScrapeStatus;
  page?: number;
  limit?: number;
}): Promise<{ data: University[]; count: number }> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.region_id) q.set("region_id", params.region_id);
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return request(`/universities?${q}`);
}

export async function getUniversity(id: string): Promise<University | null> {
  return request<University>(`/universities/${id}`).catch(() => null);
}

export async function importUniversities(universities: UniversityImportData[]): Promise<{ imported: number; errors: string[] }> {
  let imported = 0;
  const errors: string[] = [];
  for (const uni of universities) {
    try {
      await request("/universities", {
        method: "POST",
        body: JSON.stringify(uni),
      });
      imported++;
    } catch (e) {
      errors.push(`${uni.id}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }
  return { imported, errors };
}

export async function updateUniversityLogoFromWebsite(universityId: string, websiteUrl: string): Promise<void> {
  const url = new URL(websiteUrl);
  const logoUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
  await request(`/universities/${universityId}`, {
    method: "PUT",
    body: JSON.stringify({ logo_url: logoUrl }),
  });
}

export async function uploadUniversityLogo(universityId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  // We manually use fetch because our standard request wrapper might enforce JSON body headers
  const token = localStorage.getItem("token");
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
  
  const response = await fetch(`${API_BASE}/universities/${universityId}/logo`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Fayl yuklashda xatolik yuz berdi");
  }
}

export async function updateAllUniversityLogos(): Promise<{ updated: number; errors: string[] }> {
  const { data } = await getUniversities({ limit: 1000 });
  let updated = 0;
  const errors: string[] = [];
  for (const uni of data) {
    if (uni.website) {
      try {
        await updateUniversityLogoFromWebsite(uni.id, uni.website);
        updated++;
      } catch (e) {
        errors.push(`${uni.id}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }
  }
  return { updated, errors };
}

export async function getRegions(): Promise<string[]> {
  return request<string[]>("/universities/regions/list");
}

// ── News API ─────────────────────────────────────────────────────────────────

export async function getNewsPosts(params?: {
  university_id?: string;
  university_mt_id?: number;
  slug?: string;
  region_id?: string;
  search?: string;
  language?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: NewsPost[]; count: number }> {
  const q = new URLSearchParams();
  if (params?.university_id) q.set("university_id", params.university_id);
  if (params?.university_mt_id !== undefined) q.set("university_mt_id", String(params.university_mt_id));
  if (params?.slug) q.set("slug", params.slug);
  if (params?.region_id) q.set("region_id", params.region_id);
  if (params?.search) q.set("search", params.search);
  if (params?.language) q.set("language", params.language);
  if (params?.from_date) q.set("from_date", params.from_date);
  if (params?.to_date) q.set("to_date", params.to_date);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return request(`/news?${q}`);
}

export async function getNewsReviewQueue(params?: {
  moderation_status?: string;
  has_image?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ data: NewsPost[]; count: number }> {
  const q = new URLSearchParams();
  q.set("moderation_status", params?.moderation_status || "PENDING");
  if (params?.has_image !== undefined) q.set("has_image", String(params.has_image));
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return request(`/news/review/queue?${q}`);
}

export async function reviewNewsPost(
  id: string,
  moderation_status: "PENDING" | "APPROVED" | "REJECTED" | "TRASH",
  moderation_notes?: string,
): Promise<NewsPost> {
  return request(`/news/${id}/review`, {
    method: "PUT",
    body: JSON.stringify({ moderation_status, moderation_notes }),
  });
}

export async function getNewsPost(id: string): Promise<NewsPost | null> {
  return request<NewsPost>(`/news/${id}`).catch(() => null);
}

export async function deleteNewsPost(id: string): Promise<void> {
  await request(`/news/${id}`, { method: "DELETE" });
}

export async function getMediaAssets(_postId: string): Promise<MediaAsset[]> {
  // Media assets are returned inline in the news post response
  return [];
}

// ── Scrape Jobs API ───────────────────────────────────────────────────────────

export async function getScrapeJobs(params?: {
  status?: JobStatus;
  page?: number;
  limit?: number;
}): Promise<{ data: ScrapeJob[]; count: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return request(`/jobs?${q}`);
}

export async function getActiveJobs(): Promise<ScrapeJob[]> {
  return request<ScrapeJob[]>("/jobs/active");
}

export async function createScrapeJob(
  scope: "ALL_UNIVERSITIES" | "SINGLE_UNIVERSITY",
  universityId?: string,
  statusFilters?: string[]
): Promise<ScrapeJob> {
  return request<ScrapeJob>("/jobs", {
    method: "POST",
    body: JSON.stringify({ scope, university_id: universityId, status_filters: statusFilters }),
  });
}

export async function scrapeFailedUniversities(): Promise<{ queued: number }> {
  const result = await createScrapeJob("ALL_UNIVERSITIES", undefined, ["FAILED"]);
  return { queued: result.totals_json?.queued || 0 };
}

export async function cancelScrapeJob(jobId: string): Promise<void> {
  await request(`/jobs/${jobId}/cancel`, { method: "PUT" });
}

export async function resetStuckUniversities(): Promise<{ updated: number }> {
  // No-op: handled server-side when cancelling jobs
  return { updated: 0 };
}

export async function getScrapeJobEvents(jobId: string): Promise<ScrapeJobEvent[]> {
  return request<ScrapeJobEvent[]>(`/jobs/${jobId}/events`);
}

export async function getLastScheduledScrape(): Promise<ScrapeJob | null> {
  const { data } = await getScrapeJobs({ limit: 1 });
  return data[0] ?? null;
}

export async function triggerScheduledScrape(): Promise<void> {
  await createScrapeJob("ALL_UNIVERSITIES");
}

// ── Stats API ─────────────────────────────────────────────────────────────────

export async function getStats(): Promise<{
  totalUniversities: number;
  totalPosts: number;
  byStatus: Record<string, number>;
}> {
  return request<{ totalUniversities: number; totalPosts: number; byStatus: Record<string, number> }>("/stats");
}

export async function getTopUniversitiesByNews(limit = 10): Promise<Array<{
  university_id: string;
  name: string;
  count: number;
}>> {
  return request(`/stats/top-universities?limit=${limit}`);
}

export async function getScrapingStatsByRegion(): Promise<any[]> {
  // Derived client-side from scraping status distribution
  return [];
}

export async function getScrapingStatusDistribution(): Promise<Array<{
  status: string;
  count: number;
  percentage: number;
}>> {
  return request("/stats/scraping-status-distribution");
}

export async function getNewsPostsByTimePeriod(
  _period: "daily" | "weekly" | "monthly" = "daily",
  _limit = 14
): Promise<Array<{ date: string; count: number }>> {
  // Placeholder — can be added to backend later
  return [];
}

export async function getLanguageDistribution(): Promise<Array<{
  language: string;
  count: number;
  percentage: number;
}>> {
  return request("/stats/language-distribution");
}

export async function getMediaStats(): Promise<{
  totalImages: number;
  totalVideos: number;
  postsWithMedia: number;
  avgImagesPerPost: number;
}> {
  return request("/stats/media");
}

export async function getScrapingPerformanceStats(): Promise<{
  avgPostsPerUniversity: number;
  successRate: number;
  totalScrapedUniversities: number;
  universitiesWithNews: number;
}> {
  const stats = await getStats();
  const total = stats.totalUniversities || 0;
  const done = stats.byStatus?.DONE || 0;
  const successRate = total > 0 ? Math.round((done / total) * 100) : 0;
  return {
    avgPostsPerUniversity: done > 0 ? Math.round(stats.totalPosts / done * 10) / 10 : 0,
    successRate,
    totalScrapedUniversities: (stats.byStatus?.DONE || 0) + (stats.byStatus?.FAILED || 0) + (stats.byStatus?.NO_NEWS || 0),
    universitiesWithNews: done,
  };
}

export async function getRecentScrapeJobsSummary(): Promise<{
  last24h: { total: number; successful: number; failed: number };
  last7d: { total: number; successful: number; failed: number };
  last30d: { total: number; successful: number; failed: number };
}> {
  const { data: jobs } = await getScrapeJobs({ limit: 100 });
  const now = Date.now();
  const summarize = (sinceMs: number) => {
    const filtered = jobs.filter(j => new Date(j.created_at).getTime() >= now - sinceMs);
    return {
      total: filtered.length,
      successful: filtered.filter(j => j.status === "DONE").length,
      failed: filtered.filter(j => j.status === "FAILED").length,
    };
  };
  return {
    last24h: summarize(24 * 3600 * 1000),
    last7d: summarize(7 * 24 * 3600 * 1000),
    last30d: summarize(30 * 24 * 3600 * 1000),
  };
}

// ── Export API ────────────────────────────────────────────────────────────────

export interface ExportFilters {
  university_id?: string;
  region_id?: string;
  from_date?: string;
  to_date?: string;
  language?: string;
}

export interface ExportedNewsPost {
  university: { id: string; name_uz: string; name_en?: string | null; name_ru?: string | null; region_id?: string | null; website?: string | null };
  post: { title: string; summary?: string | null; published_at?: string | null; source_url: string; canonical_url?: string | null; content_text?: string | null; language?: string | null };
  media: { images: Array<{ stored_url?: string | null; original_url: string }>; videos: Array<{ url: string; provider?: string | null }> };
}

export async function exportNewsPosts(filters: ExportFilters): Promise<ExportedNewsPost[]> {
  const { data: posts } = await getNewsPosts({ ...filters, limit: 1000 });
  return posts.map(post => ({
    university: {
      id: post.university?.id || post.university_id,
      name_uz: post.university?.name_uz || "",
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
      images: (post.media_assets || []).filter(m => m.type === "image").map(m => ({ stored_url: m.stored_url, original_url: m.original_url })),
      videos: (post.media_assets || []).filter(m => m.type === "video").map(m => ({ url: m.original_url, provider: m.provider })),
    },
  }));
}
