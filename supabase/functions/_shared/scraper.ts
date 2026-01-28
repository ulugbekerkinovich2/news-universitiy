import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
import {
  extractLinks,
  findNewsListingUrls,
  findNewsLinksByText,
  extractNewsPostLinks,
  parseNewsPost,
  createHashFingerprint,
  createSlug,
} from './html-parser.ts';
import { isValidExternalUrl } from './url-validator.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Rate limiting: delay between requests (ms)
const REQUEST_DELAY = 1500;
const MAX_PAGES_PER_UNIVERSITY = 50;
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 15000;

interface ScrapeProgress {
  jobId: string;
  universityId: string;
  stage: 'DISCOVER' | 'CRAWL' | 'PARSE' | 'SAVE_POSTS' | 'SAVE_MEDIA' | 'DONE';
  pagesDiscovered: number;
  pagesScanned: number;
  postsFound: number;
  postsSaved: number;
  imagesSaved: number;
  videosSaved: number;
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<string | null> {
  // SSRF Protection: Validate URL before any fetch
  if (!isValidExternalUrl(url)) {
    console.log(`Blocked unsafe URL: ${url}`);
    return null;
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UniversityNewsBot/1.0; +https://edu.uz)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'uz,ru,en;q=0.5',
        },
      });
      
      clearTimeout(timeoutId);
      
      // Skip 404, 410 (gone), and other client errors - don't retry
      if (response.status === 404 || response.status === 410) {
        console.log(`Skipping ${url}: ${response.status} Not Found`);
        return null;
      }
      
      // Skip server errors after last retry
      if (response.status >= 500 && i === retries - 1) {
        console.log(`Skipping ${url}: Server error ${response.status}`);
        return null;
      }
      
      if (response.ok) {
        return await response.text();
      }
      
      if (response.status === 403 || response.status === 429) {
        // Rate limited or blocked, wait longer
        await sleep(REQUEST_DELAY * (i + 2));
      }
    } catch (error) {
      // Only log and retry for network errors, not for aborted requests on last attempt
      if (i < retries - 1) {
        console.error(`Fetch attempt ${i + 1} failed for ${url}:`, error);
        await sleep(REQUEST_DELAY * (i + 1));
      }
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// deno-lint-ignore no-explicit-any
async function logProgress(supabase: SupabaseClient<any>, progress: ScrapeProgress) {
  await supabase.from('scrape_job_events').insert({
    job_id: progress.jobId,
    university_id: progress.universityId,
    stage: progress.stage,
    message: `Stage: ${progress.stage}`,
    counters_json: {
      pages_discovered: progress.pagesDiscovered,
      pages_scanned: progress.pagesScanned,
      posts_found: progress.postsFound,
      posts_saved: progress.postsSaved,
      images_saved: progress.imagesSaved,
      videos_saved: progress.videosSaved,
    },
  });
}

export async function scrapeUniversity(
  jobId: string,
  universityId: string,
  websiteUrl: string
): Promise<{ success: boolean; postsFound: number; imagesSaved: number; videosSaved: number; error?: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const progress: ScrapeProgress = {
    jobId,
    universityId,
    stage: 'DISCOVER',
    pagesDiscovered: 0,
    pagesScanned: 0,
    postsFound: 0,
    postsSaved: 0,
    imagesSaved: 0,
    videosSaved: 0,
  };
  
  try {
    // Update university status
    await supabase
      .from('universities')
      .update({ scrape_status: 'IN_PROGRESS' })
      .eq('id', universityId);
    
    // Step 1: Discover news listing pages
    await logProgress(supabase, progress);
    
    const baseUrl = new URL(websiteUrl).origin;
    const homeHtml = await fetchWithRetry(websiteUrl);
    
    if (!homeHtml) {
      throw new Error('Failed to fetch university homepage');
    }
    
    // Find news listing pages from URL patterns
    const newsListingUrls = findNewsListingUrls(homeHtml, websiteUrl);
    
    // Find news links by link text (e.g. "Yangiliklar", "News")
    const newsLinksByText = findNewsLinksByText(homeHtml, websiteUrl);
    
    // Also check common news URL patterns
    const commonNewsUrls = [
      `${baseUrl}/news`,
      `${baseUrl}/news/`,
      `${baseUrl}/new`,
      `${baseUrl}/new/`,
      `${baseUrl}/yangiliklar`,
      `${baseUrl}/yangiliklar/`,
      `${baseUrl}/novosti`,
      `${baseUrl}/novosti/`,
      `${baseUrl}/posts`,
      `${baseUrl}/posts/`,
      `${baseUrl}/maqolalar`,
      `${baseUrl}/xabarlar`,
      `${baseUrl}/axborot`,
      `${baseUrl}/uz/news`,
      `${baseUrl}/uz/new`,
      `${baseUrl}/uz/yangiliklar`,
      `${baseUrl}/ru/news`,
      `${baseUrl}/ru/new`,
      `${baseUrl}/ru/novosti`,
      `${baseUrl}/en/news`,
      `${baseUrl}/en/new`,
      `${baseUrl}/uz/posts`,
      `${baseUrl}/ru/posts`,
      `${baseUrl}/en/posts`,
    ];
    
    const allNewsUrls = [...new Set([...newsListingUrls, ...newsLinksByText, ...commonNewsUrls])];
    progress.pagesDiscovered = allNewsUrls.length;
    
    // Step 2: Crawl news listing pages to find post links
    progress.stage = 'CRAWL';
    await logProgress(supabase, progress);
    
    const newsPostUrls: Set<string> = new Set();
    
    for (const listingUrl of allNewsUrls) {
      if (progress.pagesScanned >= MAX_PAGES_PER_UNIVERSITY) break;
      
      await sleep(REQUEST_DELAY);
      const listingHtml = await fetchWithRetry(listingUrl);
      
      if (listingHtml) {
        progress.pagesScanned++;
        const postLinks = extractNewsPostLinks(listingHtml, listingUrl);
        postLinks.forEach(link => newsPostUrls.add(link));
        
        // Also check for pagination
        const allLinks = extractLinks(listingHtml, listingUrl);
        const paginationLinks = allLinks.filter(link => 
          /[?&]page=\d/i.test(link) || /\/page\/\d/i.test(link)
        );
        
        // Get first 3 pagination pages
        for (const pageLink of paginationLinks.slice(0, 3)) {
          if (progress.pagesScanned >= MAX_PAGES_PER_UNIVERSITY) break;
          
          await sleep(REQUEST_DELAY);
          const pageHtml = await fetchWithRetry(pageLink);
          
          if (pageHtml) {
            progress.pagesScanned++;
            const moreLinks = extractNewsPostLinks(pageHtml, pageLink);
            moreLinks.forEach(link => newsPostUrls.add(link));
          }
        }
      }
    }
    
    // Also scan homepage for direct news links
    const homeNewsLinks = extractNewsPostLinks(homeHtml, websiteUrl);
    homeNewsLinks.forEach(link => newsPostUrls.add(link));
    
    progress.postsFound = newsPostUrls.size;
    
    if (newsPostUrls.size === 0) {
      // No news found
      await supabase
        .from('universities')
        .update({
          scrape_status: 'NO_NEWS',
          last_scraped_at: new Date().toISOString(),
        })
        .eq('id', universityId);
      
      progress.stage = 'DONE';
      await logProgress(supabase, progress);
      
      return { success: true, postsFound: 0, imagesSaved: 0, videosSaved: 0 };
    }
    
    // Step 3: Parse each news post
    progress.stage = 'PARSE';
    await logProgress(supabase, progress);
    
    const posts: Array<{
      data: ReturnType<typeof parseNewsPost>;
      url: string;
    }> = [];
    
    for (const postUrl of newsPostUrls) {
      if (progress.pagesScanned >= MAX_PAGES_PER_UNIVERSITY) break;
      
      await sleep(REQUEST_DELAY);
      const postHtml = await fetchWithRetry(postUrl);
      
      // Skip if fetch failed (404, timeout, error, etc.)
      if (!postHtml) {
        continue;
      }
      
      progress.pagesScanned++;
      const postData = parseNewsPost(postHtml, postUrl);
      
      // Skip if title is too short, generic, or looks like an error page
      if (postData.title.length <= 5 || 
          postData.title === 'Untitled' ||
          postData.title.toLowerCase().includes('404') ||
          postData.title.toLowerCase().includes('not found') ||
          postData.title.toLowerCase().includes('error') ||
          postData.contentText.length < 50) {
        continue;
      }
      
      posts.push({ data: postData, url: postUrl });
    }
    
    // Step 4: Save posts
    progress.stage = 'SAVE_POSTS';
    await logProgress(supabase, progress);
    
    for (const post of posts) {
      const { data } = post;
      
      // Create hash fingerprint for duplicate detection
      const hashFingerprint = createHashFingerprint(data.title, data.publishedAt, data.contentText);
      
      // Check for duplicates by source_url first
      const { data: existingByUrl } = await supabase
        .from('news_posts')
        .select('id')
        .eq('source_url', data.sourceUrl)
        .maybeSingle();
      
      // Also check by hash_fingerprint for same university (catches reposts with different URLs)
      const { data: existingByHash } = await supabase
        .from('news_posts')
        .select('id')
        .eq('university_id', universityId)
        .eq('hash_fingerprint', hashFingerprint)
        .maybeSingle();
      
      const existing = existingByUrl || existingByHash;
      
      if (existing) {
        // Update existing post (only if found by URL, skip if found by hash - true duplicate)
        if (existingByUrl) {
          await supabase
            .from('news_posts')
            .update({
              title: data.title,
              summary: data.summary,
              content_html: data.contentHtml,
              content_text: data.contentText,
              published_at: data.publishedAt,
              canonical_url: data.canonicalUrl,
              language: data.language,
              hash_fingerprint: hashFingerprint,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingByUrl.id);
        }
        // If found by hash but not URL, it's a duplicate - skip entirely
      } else {
        // Insert new post
        const slug = createSlug(data.title);
        
        // Make slug unique for this university
        let uniqueSlug = slug;
        let counter = 1;
        while (true) {
          const { data: slugExists } = await supabase
            .from('news_posts')
            .select('id')
            .eq('university_id', universityId)
            .eq('slug', uniqueSlug)
            .maybeSingle();
          
          if (!slugExists) break;
          uniqueSlug = `${slug}-${counter}`;
          counter++;
        }
        
        const { data: insertedPost, error: insertError } = await supabase
          .from('news_posts')
          .insert({
            university_id: universityId,
            title: data.title,
            slug: uniqueSlug,
            summary: data.summary,
            content_html: data.contentHtml,
            content_text: data.contentText,
            published_at: data.publishedAt,
            source_url: data.sourceUrl,
            canonical_url: data.canonicalUrl,
            language: data.language,
            hash_fingerprint: hashFingerprint,
          })
          .select()
          .single();
        
        if (!insertError && insertedPost) {
          progress.postsSaved++;
          
          // Step 5: Save media assets
          // Save images
          for (const imageUrl of data.images.slice(0, 10)) { // Limit to 10 images per post
            const { error: mediaError } = await supabase
              .from('media_assets')
              .insert({
                post_id: insertedPost.id,
                type: 'image',
                original_url: imageUrl,
              });
            
            if (!mediaError) {
              progress.imagesSaved++;
            }
          }
          
          // Save videos
          for (const video of data.videos) {
            const { error: videoError } = await supabase
              .from('media_assets')
              .insert({
                post_id: insertedPost.id,
                type: 'video',
                original_url: video.url,
                provider: video.provider,
              });
            
            if (!videoError) {
              progress.videosSaved++;
            }
          }
          
          // Set cover image if available
          if (data.coverImageUrl) {
            const { data: coverImage } = await supabase
              .from('media_assets')
              .select('id')
              .eq('post_id', insertedPost.id)
              .eq('original_url', data.coverImageUrl)
              .maybeSingle();
            
            if (coverImage) {
              await supabase
                .from('news_posts')
                .update({ cover_image_id: coverImage.id })
                .eq('id', insertedPost.id);
            }
          }
        }
      }
    }
    
    // Update university status
    await supabase
      .from('universities')
      .update({
        scrape_status: progress.postsSaved > 0 ? 'DONE' : 'NO_NEWS',
        last_scraped_at: new Date().toISOString(),
        last_error_message: null,
      })
      .eq('id', universityId);
    
    progress.stage = 'DONE';
    await logProgress(supabase, progress);
    
    return { 
      success: true, 
      postsFound: progress.postsSaved,
      imagesSaved: progress.imagesSaved,
      videosSaved: progress.videosSaved,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Scrape error for ${universityId}:`, errorMessage);
    
    await supabase
      .from('universities')
      .update({
        scrape_status: 'FAILED',
        last_scraped_at: new Date().toISOString(),
        last_error_message: errorMessage,
      })
      .eq('id', universityId);
    
    progress.stage = 'DONE';
    await logProgress(supabase, progress);
    
    return { success: false, postsFound: 0, imagesSaved: 0, videosSaved: 0, error: errorMessage };
  }
}
