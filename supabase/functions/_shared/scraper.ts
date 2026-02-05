import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
import {
  extractLinks,
  findNewsListingUrls,
  findNewsLinksByText,
  extractNewsPostLinks,
  parseNewsPost,
  createHashFingerprint,
  createSlug,
  generateLanguageVariants,
  extractLanguageSwitcherLinks,
  isNewsUrl,
} from './html-parser.ts';
import { isValidExternalUrl } from './url-validator.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Optimized settings for faster scraping
const REQUEST_DELAY = 800; // Faster with AI assistance
const CONCURRENT_REQUESTS = 5; // Increased for parallel language fetching
const MAX_PAGES_PER_UNIVERSITY = 80; // Increased with AI filtering
const MAX_POSTS_TO_PARSE = 200; // Increased for multi-language
const MAX_RETRIES = 2; // Reduced from 3
const REQUEST_TIMEOUT = 12000; // Reduced from 15000
const LANGUAGES = ['uz', 'ru', 'en'] as const;
const AI_ENABLED = !!LOVABLE_API_KEY;

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

// Batch fetch with concurrency control
async function fetchBatch<T>(
  items: T[],
  fetchFn: (item: T) => Promise<string | null>,
  concurrency: number
): Promise<Map<T, string | null>> {
  const results = new Map<T, string | null>();
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const promises = batch.map(async (item) => {
      const result = await fetchFn(item);
      return { item, result };
    });
    
    const batchResults = await Promise.all(promises);
    for (const { item, result } of batchResults) {
      results.set(item, result);
    }
    
    // Delay between batches
    if (i + concurrency < items.length) {
      await sleep(REQUEST_DELAY);
    }
  }
  
  return results;
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
          'Accept-Encoding': 'gzip, deflate',
        },
      });
      
      clearTimeout(timeoutId);
      
      // Skip 404, 410 (gone), and other client errors - don't retry
      if (response.status === 404 || response.status === 410) {
        return null;
      }
      
      // Skip server errors after last retry
      if (response.status >= 500 && i === retries - 1) {
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

// AI-powered link classification
async function classifyLinksWithAI(
  links: string[],
  baseUrl: string
): Promise<{ newsLinks: string[]; confidence: Record<string, number> }> {
  if (!LOVABLE_API_KEY || links.length === 0) {
    return { newsLinks: links, confidence: {} };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-scrape-helper`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'classify_links',
        links: links.slice(0, 100), // Limit batch size
        baseUrl,
      }),
    });

    if (!response.ok) {
      console.log('AI classification failed, using fallback');
      return { newsLinks: links, confidence: {} };
    }

    return await response.json();
  } catch (error) {
    console.error('AI classification error:', error);
    return { newsLinks: links, confidence: {} };
  }
}

// AI-powered content extraction
async function extractContentWithAI(
  html: string,
  url: string
): Promise<{
  title: string;
  content: string;
  summary: string;
  publishedAt: string | null;
  language: string;
} | null> {
  if (!LOVABLE_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-scrape-helper`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'extract_content',
        html: html.slice(0, 50000), // Limit HTML size
        url,
      }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('AI extraction error:', error);
    return null;
  }
}

// Batch classify HTML snippets with AI
async function batchClassifyWithAI(
  snippets: Array<{ url: string; snippet: string }>
): Promise<Array<{ url: string; isNews: boolean; title: string | null }>> {
  if (!LOVABLE_API_KEY || snippets.length === 0) {
    return snippets.map(s => ({ url: s.url, isNews: true, title: null }));
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-scrape-helper`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'batch_classify',
        htmlSnippets: snippets,
      }),
    });

    if (!response.ok) {
      return snippets.map(s => ({ url: s.url, isNews: true, title: null }));
    }

    return await response.json();
  } catch (error) {
    console.error('AI batch classify error:', error);
    return snippets.map(s => ({ url: s.url, isNews: true, title: null }));
  }
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
    
    // Also check common news URL patterns - expanded list
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
      `${baseUrl}/faoliyat`,
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
      `${baseUrl}/category/yangiliklar`,
      `${baseUrl}/category/news`,
      `${baseUrl}/category/novosti`,
      `${baseUrl}/blog`,
      `${baseUrl}/articles`,
      // Also check if the provided URL itself has page variants
      `${websiteUrl}`,
      `${websiteUrl}?page=2`,
      `${websiteUrl}/page/2`,
    ];
    
    const allNewsUrls = [...new Set([...newsListingUrls, ...newsLinksByText, ...commonNewsUrls])];
    progress.pagesDiscovered = allNewsUrls.length;
    
    // Step 2: Crawl news listing pages to find post links (with parallel fetching)
    progress.stage = 'CRAWL';
    await logProgress(supabase, progress);
    
    const newsPostUrls: Set<string> = new Set();
    const urlsToFetch = allNewsUrls.slice(0, MAX_PAGES_PER_UNIVERSITY);
    
    // Fetch listing pages in batches
    const listingResults = await fetchBatch(
      urlsToFetch,
      (url) => fetchWithRetry(url),
      CONCURRENT_REQUESTS
    );
    
    for (const [listingUrl, listingHtml] of listingResults) {
      if (listingHtml) {
        progress.pagesScanned++;
        const postLinks = extractNewsPostLinks(listingHtml, listingUrl);
        postLinks.forEach(link => newsPostUrls.add(link));
        
        // Also check for pagination
        const allLinks = extractLinks(listingHtml, listingUrl);
        const paginationLinks = allLinks.filter(link => 
          /[?&]page=\d/i.test(link) || /\/page\/\d/i.test(link)
        ).slice(0, 3); // Get first 3 pagination pages
        
        // Fetch pagination pages in parallel
        if (paginationLinks.length > 0) {
          const pageResults = await fetchBatch(
            paginationLinks,
            (url) => fetchWithRetry(url),
            CONCURRENT_REQUESTS
          );
          
          for (const [, pageHtml] of pageResults) {
            if (pageHtml) {
              progress.pagesScanned++;
              const moreLinks = extractNewsPostLinks(pageHtml, listingUrl);
              moreLinks.forEach(link => newsPostUrls.add(link));
            }
          }
        }
      }
    }
    
    // Also scan homepage for direct news links
    const homeNewsLinks = extractNewsPostLinks(homeHtml, websiteUrl);
    homeNewsLinks.forEach(link => newsPostUrls.add(link));
    
    // Use AI to filter and classify links if available
    if (AI_ENABLED && newsPostUrls.size > 0) {
      console.log(`AI: Classifying ${newsPostUrls.size} potential news links...`);
      const { newsLinks: aiFilteredLinks, confidence } = await classifyLinksWithAI(
        Array.from(newsPostUrls),
        baseUrl
      );
      
      // Keep only high-confidence links (>0.6) or all if AI fails
      const filteredLinks = aiFilteredLinks.filter(link => 
        !confidence[link] || confidence[link] > 0.6
      );
      
      if (filteredLinks.length > 0) {
        newsPostUrls.clear();
        filteredLinks.forEach(link => newsPostUrls.add(link));
        console.log(`AI: Filtered to ${newsPostUrls.size} news links`);
      }
    }
    
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
    
    // Step 3: Parse each news post (with parallel fetching)
    progress.stage = 'PARSE';
    await logProgress(supabase, progress);
    
    const posts: Array<{
      data: ReturnType<typeof parseNewsPost>;
      url: string;
    }> = [];
    
    // Limit posts to parse, then expand with language variants
    const basePostUrls = Array.from(newsPostUrls).slice(0, MAX_POSTS_TO_PARSE);
    
    // Generate language variants for each post URL
    const allPostUrlsWithLangs: Array<{ url: string; isVariant: boolean }> = [];
    const processedBaseUrls = new Set<string>();
    
    for (const postUrl of basePostUrls) {
      // Add original URL
      allPostUrlsWithLangs.push({ url: postUrl, isVariant: false });
      processedBaseUrls.add(postUrl);
      
      // Generate language variants
      const variants = generateLanguageVariants(postUrl);
      for (const variant of variants) {
        if (!processedBaseUrls.has(variant)) {
          allPostUrlsWithLangs.push({ url: variant, isVariant: true });
          processedBaseUrls.add(variant);
        }
      }
    }
    
    console.log(`Found ${basePostUrls.length} base posts, expanded to ${allPostUrlsWithLangs.length} with language variants`);
    
    // Fetch posts in batches
    const postUrlsArray = allPostUrlsWithLangs.map(p => p.url);
    const postResults = await fetchBatch(
      postUrlsArray,
      (url) => fetchWithRetry(url),
      CONCURRENT_REQUESTS
    );
    
    // Track posts by content hash to avoid duplicate content in different languages
    const seenContentHashes = new Set<string>();
    
    for (const [postUrl, postHtml] of postResults) {
      if (!postHtml) continue;
      
      progress.pagesScanned++;
      
      // Try AI extraction first for better accuracy
      let postData: ReturnType<typeof parseNewsPost>;
      
      if (AI_ENABLED && progress.pagesScanned <= 30) { // Use AI for first 30 posts
        const aiContent = await extractContentWithAI(postHtml, postUrl);
        if (aiContent && aiContent.title && aiContent.content) {
          // Use AI-extracted content
          postData = {
            title: aiContent.title,
            summary: aiContent.summary || aiContent.content.slice(0, 200),
            contentHtml: `<p>${aiContent.content.replace(/\n\n/g, '</p><p>')}</p>`,
            contentText: aiContent.content,
            publishedAt: aiContent.publishedAt,
            sourceUrl: postUrl,
            canonicalUrl: null,
            language: aiContent.language || 'unknown',
            coverImageUrl: null,
            images: [],
            videos: [],
          };
          
          // Add images/videos from regex extraction
          const regexData = parseNewsPost(postHtml, postUrl);
          postData.coverImageUrl = regexData.coverImageUrl;
          postData.images = regexData.images;
          postData.videos = regexData.videos;
          postData.canonicalUrl = regexData.canonicalUrl;
        } else {
          // Fallback to regex extraction
          postData = parseNewsPost(postHtml, postUrl);
        }
      } else {
        // Regular regex extraction
        postData = parseNewsPost(postHtml, postUrl);
      }
      
      // Skip if title is too short, generic, or looks like an error page
      if (postData.title.length <= 5 || 
          postData.title === 'Untitled' ||
          postData.title.toLowerCase().includes('404') ||
          postData.title.toLowerCase().includes('not found') ||
          postData.title.toLowerCase().includes('error') ||
          postData.title.toLowerCase().includes('page not found') ||
          postData.contentText.length < 30) { // Lowered threshold
        continue;
      }
      
      // Also try to extract language switcher links for more variants
      const langLinks = extractLanguageSwitcherLinks(postHtml, postUrl);
      for (const [lang, langUrl] of langLinks) {
        if (!processedBaseUrls.has(langUrl)) {
          processedBaseUrls.add(langUrl);
          // Fetch this language variant
          const langHtml = await fetchWithRetry(langUrl);
          if (langHtml) {
            const langPostData = parseNewsPost(langHtml, langUrl);
            if (langPostData.title.length > 5 && 
                langPostData.title !== 'Untitled' &&
                langPostData.contentText.length >= 30) {
              // Create a content hash to detect if it's truly different content
              const contentHash = createHashFingerprint(langPostData.title, langPostData.publishedAt, langPostData.contentText);
              if (!seenContentHashes.has(contentHash)) {
                seenContentHashes.add(contentHash);
                langPostData.language = lang; // Override detected language with explicit
                posts.push({ data: langPostData, url: langUrl });
              }
            }
          }
        }
      }
      
      // Check if this content hash was already seen
      const contentHash = createHashFingerprint(postData.title, postData.publishedAt, postData.contentText);
      if (seenContentHashes.has(contentHash)) {
        continue; // Skip duplicate content
      }
      seenContentHashes.add(contentHash);
      
      posts.push({ data: postData, url: postUrl });
    }
    
    // Batch verify with AI if we have many posts
    if (AI_ENABLED && posts.length > 20) {
      console.log(`AI: Batch verifying ${posts.length} posts...`);
      const snippets = posts.slice(0, 50).map(p => ({
        url: p.url,
        snippet: `<h1>${p.data.title}</h1><p>${p.data.contentText.slice(0, 500)}</p>`,
      }));
      
      const verifyResults = await batchClassifyWithAI(snippets);
      const validUrls = new Set(
        verifyResults.filter(r => r.isNews).map(r => r.url)
      );
      
      // Filter out non-news posts
      const originalCount = posts.length;
      const filteredPosts = posts.filter(p => validUrls.has(p.url) || !snippets.find(s => s.url === p.url));
      
      if (filteredPosts.length > 0 && filteredPosts.length < originalCount) {
        posts.length = 0;
        posts.push(...filteredPosts);
        console.log(`AI: Verified ${posts.length} posts (removed ${originalCount - posts.length} non-news)`);
      }
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
          // Save images (limit to 15 per post)
          for (const imageUrl of data.images.slice(0, 15)) {
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
