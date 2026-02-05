// Simple HTML parser utilities for edge functions
// Uses regex-based extraction for compatibility

export interface ExtractedPost {
  title: string;
  summary: string | null;
  contentHtml: string;
  contentText: string;
  publishedAt: string | null;
  sourceUrl: string;
  canonicalUrl: string | null;
  language: string;
  coverImageUrl: string | null;
  images: string[];
  videos: Array<{ url: string; provider: string }>;
}

// Common news URL patterns - expanded for Uzbek universities
const NEWS_URL_PATTERNS = [
  /\/news/i,
  /\/new(?:\/|$)/i,  // /new or /new/ but not /news
  /\/yangiliklar/i,
  /\/yangilik/i,
  /\/novosti/i,
  /\/press/i,
  /\/media/i,
  /\/blog/i,
  /\/articles?/i,
  /\/posts?/i,
  /\/maqola/i,
  /\/maqolalar/i,
  /\/xabar/i,
  /\/xabarlar/i,
  /\/axborot/i,
  /\/e['\u2019]?lon/i,  // e'lon, elon
  /\/habar/i,
  /\/habarlar/i,
  /\/matbuot/i,
  /\/announcements?/i,
  /\/updates?/i,
  /\/events?/i,
  /\/tadbirlar/i,
  /\/voqealar/i,
  /\/faoliyat/i,
  /\/activity/i,
  /\/category\/yangiliklar/i,
  /\/category\/news/i,
  /\/category\/novosti/i,
  /\/post\//i,
  /\/single\//i,
  /\/detail\//i,
  /\/view\//i,
  /\/read\//i,
  /\/item\//i,
  /\/page\/\d+/i,
  /\?.*page=\d+/i,
  /\/uz\/new/i,
  /\/ru\/new/i,
  /\/en\/new/i,
];

// URLs to exclude (not news)
const EXCLUDE_URL_PATTERNS = [
  /\/admission/i,
  /\/qabul/i,
  /\/faculty/i,
  /\/fakultet/i,
  /\/kafedra/i,
  /\/program/i,
  /\/dastur/i,
  /\/contact/i,
  /\/aloqa/i,
  /\/about/i,
  /\/biz-haqimizda/i,
  /\/login/i,
  /\/kirish/i,
  /\/register/i,
  /\/royxat/i,
  /\/stat/i,
  /\/student/i,
  /\/talaba/i,
  /\/cabinet/i,
  /\/profile/i,
  /\/admin/i,
  /\/auth/i,
  /\/api\//i,
  /\/assets\//i,
  /\/static\//i,
  /\/css\//i,
  /\/js\//i,
  /\/images?\//i,
  /\/uploads?\//i,
  /\/download\//i,
  /\/file\//i,
  /\/document\//i,
  /\/schedule/i,
  /\/jadval/i,
  /\/timetable/i,
  /\/library/i,
  /\/kutubxona/i,
  /\/staff/i,
  /\/hodimlar/i,
  /\/gallery/i,
  /\/galereya/i,
  /\/photo/i,
  /\/video(?!s?\/)/i, // exclude /video/ but allow /videos
  /\.pdf$/i,
  /\.doc/i,
  /\.xls/i,
  /\.zip$/i,
  /\.rar$/i,
  /\.ppt/i,
  /\.mp3$/i,
  /\.mp4$/i,
  /\.jpg$/i,
  /\.png$/i,
  /\.gif$/i,
];

export function isNewsUrl(url: string): boolean {
  // Check if URL matches any news pattern
  const matchesNewsPattern = NEWS_URL_PATTERNS.some(pattern => pattern.test(url));
  
  // Check if URL should be excluded
  const shouldExclude = EXCLUDE_URL_PATTERNS.some(pattern => pattern.test(url));
  
  // Also check for numeric ID patterns common in news URLs
  const hasNewsId = /\/\d{2,}[\/\-]?[a-z]?$/i.test(url) || // /123 or /123-title
                    /[?&]id=\d+/i.test(url) || // ?id=123
                    /[?&]post=\d+/i.test(url) || // ?post=123
                    /[?&]news=\d+/i.test(url); // ?news=123
  
  return (matchesNewsPattern || hasNewsId) && !shouldExclude;
}

export function isExcludedUrl(url: string): boolean {
  return EXCLUDE_URL_PATTERNS.some(pattern => pattern.test(url));
}

// Extract all links from HTML
export function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }
      
      const absoluteUrl = new URL(href, baseUrl).href;
      const urlObj = new URL(absoluteUrl);
      const baseUrlObj = new URL(baseUrl);
      
      // Only same domain links
      if (urlObj.hostname === baseUrlObj.hostname) {
        links.push(absoluteUrl);
      }
    } catch {
      // Invalid URL, skip
    }
  }
  
  return [...new Set(links)];
}

// Find news listing pages - expanded patterns
export function findNewsListingUrls(html: string, baseUrl: string): string[] {
  const links = extractLinks(html, baseUrl);
  const newsListingPatterns = [
    /\/news\/?$/i,
    /\/news\/?\?/i,
    /\/new\/?$/i,
    /\/yangiliklar\/?$/i,
    /\/yangiliklar\/?\?/i,
    /\/novosti\/?$/i,
    /\/press\/?$/i,
    /\/media\/?$/i,
    /\/blog\/?$/i,
    /\/posts?\/?$/i,
    /\/articles?\/?$/i,
    /\/maqolalar?\/?$/i,
    /\/xabarlar?\/?$/i,
    /\/axborot\/?$/i,
    /\/e['\u2019]?lonlar?\/?$/i,
    /\/habarlar?\/?$/i,
    /\/matbuot\/?$/i,
    /\/announcements?\/?$/i,
    /\/updates?\/?$/i,
    /\/events?\/?$/i,
    /\/tadbirlar?\/?$/i,
    /\/faoliyat\/?$/i,
    /\/category\/yangiliklar/i,
    /\/category\/news/i,
    /\/category\/novosti/i,
  ];
  
  return links.filter(link => 
    newsListingPatterns.some(pattern => pattern.test(link))
  );
}

// Find news links by searching for keywords in link text - expanded keywords
export function findNewsLinksByText(html: string, baseUrl: string): string[] {
  const newsTextPatterns = [
    /yangiliklar/i,
    /yangilik/i,
    /novosti/i,
    /новости/i,
    /news/i,
    /latest\s*news/i,
    /so['']?nggi\s*yangiliklar/i,
    /oxirgi\s*yangiliklar/i,
    /последние\s*новости/i,
    /maqolalar/i,
    /maqola/i,
    /xabarlar/i,
    /xabar/i,
    /axborot/i,
    /e['\u2019]?lonlar/i,
    /e['\u2019]?lon/i,
    /habarlar/i,
    /habar/i,
    /matbuot/i,
    /posts/i,
    /articles/i,
    /latest/i,
    /recent/i,
    /updates/i,
    /announcements/i,
    /all\s*news/i,
    /more\s*news/i,
    /barcha\s*yangiliklar/i,
    /barchasi/i,
    /ko['']proq/i,
    /batafsil/i,
    /davomi/i,
    /ko['']proq\s*o['']qish/i,
    /read\s*more/i,
    /подробнее/i,
    /faoliyat/i,
    /tadbirlar/i,
    /voqealar/i,
    /events/i,
  ];
  
  const links: string[] = [];
  
  // Pattern 1: Simple <a> tag with text inside
  const simpleLinkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;
  
  while ((match = simpleLinkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].toLowerCase();
    
    if (newsTextPatterns.some(pattern => pattern.test(text))) {
      try {
        if (href.startsWith('#') || href.startsWith('javascript:')) continue;
        const absoluteUrl = new URL(href, baseUrl).href;
        links.push(absoluteUrl);
      } catch {
        // Invalid URL
      }
    }
  }
  
  // Pattern 2: <a> tag with nested elements (span, div, etc.)
  const nestedLinkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  
  while ((match = nestedLinkRegex.exec(html)) !== null) {
    const href = match[1];
    // Remove all HTML tags and get plain text
    const innerText = match[2].replace(/<[^>]+>/g, ' ').toLowerCase().trim();
    
    if (newsTextPatterns.some(pattern => pattern.test(innerText))) {
      try {
        if (href.startsWith('#') || href.startsWith('javascript:')) continue;
        const absoluteUrl = new URL(href, baseUrl).href;
        links.push(absoluteUrl);
      } catch {
        // Invalid URL
      }
    }
  }
  
  return [...new Set(links)];
}

// Extract news post links from a listing page
export function extractNewsPostLinks(html: string, baseUrl: string): string[] {
  const links = extractLinks(html, baseUrl);
  return links.filter(link => isNewsUrl(link) && !isExcludedUrl(link));
}

// Extract title from HTML - improved with more patterns
export function extractTitle(html: string): string {
  // Try h1 with news/post classes first
  const h1ClassMatch = html.match(/<h1[^>]+class=["'][^"']*(?:title|heading|post|news|article)[^"']*["'][^>]*>([^<]+)<\/h1>/i);
  if (h1ClassMatch) {
    return decodeHtmlEntities(h1ClassMatch[1].trim());
  }
  
  // Try plain h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return decodeHtmlEntities(h1Match[1].trim());
  }
  
  // Try h1 with nested tags
  const h1NestedMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1NestedMatch) {
    const text = h1NestedMatch[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 5) {
      return decodeHtmlEntities(text);
    }
  }
  
  // Try og:title
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitleMatch) {
    return decodeHtmlEntities(ogTitleMatch[1].trim());
  }
  
  // Try twitter:title
  const twitterTitleMatch = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
  if (twitterTitleMatch) {
    return decodeHtmlEntities(twitterTitleMatch[1].trim());
  }
  
  // Try title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return decodeHtmlEntities(titleMatch[1].trim());
  }
  
  return 'Untitled';
}

// Extract meta description
export function extractDescription(html: string): string | null {
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (descMatch) {
    return decodeHtmlEntities(descMatch[1].trim());
  }
  
  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (ogDescMatch) {
    return decodeHtmlEntities(ogDescMatch[1].trim());
  }
  
  return null;
}

// Extract canonical URL
export function extractCanonicalUrl(html: string): string | null {
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (canonicalMatch) {
    return canonicalMatch[1];
  }
  return null;
}

// Extract cover image
export function extractCoverImage(html: string, baseUrl: string): string | null {
  // Try og:image first
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImageMatch) {
    try {
      return new URL(ogImageMatch[1], baseUrl).href;
    } catch {
      return ogImageMatch[1];
    }
  }
  
  // Try twitter:image
  const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (twitterImageMatch) {
    try {
      return new URL(twitterImageMatch[1], baseUrl).href;
    } catch {
      return twitterImageMatch[1];
    }
  }
  
  // Try first large image in content
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:width=["'](\d+)["'])?/i);
  if (imgMatch && imgMatch[1] && !imgMatch[1].startsWith('data:')) {
    const width = imgMatch[2] ? parseInt(imgMatch[2]) : 0;
    if (width === 0 || width >= 200) {
      try {
        return new URL(imgMatch[1], baseUrl).href;
      } catch {
        return imgMatch[1];
      }
    }
  }
  
  return null;
}

// Extract all images from article content
export function extractImages(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    try {
      const src = match[1];
      if (src.startsWith('data:')) continue; // Skip data URIs
      if (src.includes('icon') || src.includes('logo') || src.includes('avatar')) continue; // Skip icons
      if (src.endsWith('.svg') || src.endsWith('.ico')) continue; // Skip SVG and ICO
      
      const absoluteUrl = new URL(src, baseUrl).href;
      images.push(absoluteUrl);
    } catch {
      // Invalid URL, skip
    }
  }
  
  return [...new Set(images)];
}

// Extract video embeds (YouTube, Vimeo)
export function extractVideos(html: string): Array<{ url: string; provider: string }> {
  const videos: Array<{ url: string; provider: string }> = [];
  
  // YouTube iframes
  const youtubeRegex = /(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/gi;
  let match;
  
  while ((match = youtubeRegex.exec(html)) !== null) {
    videos.push({
      url: `https://www.youtube.com/watch?v=${match[1]}`,
      provider: 'youtube'
    });
  }
  
  // Vimeo iframes
  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/gi;
  while ((match = vimeoRegex.exec(html)) !== null) {
    videos.push({
      url: `https://vimeo.com/${match[1]}`,
      provider: 'vimeo'
    });
  }
  
  // Instagram embeds
  const instagramRegex = /instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/gi;
  while ((match = instagramRegex.exec(html)) !== null) {
    videos.push({
      url: `https://www.instagram.com/p/${match[1]}/`,
      provider: 'instagram'
    });
  }
  
  // Telegram embeds
  const telegramRegex = /t\.me\/([a-zA-Z0-9_]+)\/(\d+)/gi;
  while ((match = telegramRegex.exec(html)) !== null) {
    videos.push({
      url: `https://t.me/${match[1]}/${match[2]}`,
      provider: 'telegram'
    });
  }
  
  return videos;
}

// Extract article content - improved with many more patterns for Uzbek sites
export function extractArticleContent(html: string): { html: string; text: string } {
  let content = '';
  
  // Try specific content selectors first (most specific to least)
  const contentPatterns = [
    // Blog/news detail content - common patterns
    /<div[^>]+class=["'][^"']*blog__details__content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*news[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*post[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*article[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*entry[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*single[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    
    // Common Uzbek university patterns - expanded
    /<div[^>]+class=["'][^"']*detail[-_]?(content|text|body)["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*page[-_]?(content|text|body)["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*main[-_]?(content|text|body)["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*text[-_]?(content|body|block)["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*body[-_]?(content|text)["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*full[-_]?(content|text)["'][^>]*>([\s\S]*?)<\/div>/i,
    
    // CMS specific patterns
    /<div[^>]+class=["'][^"']*wp[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*cms[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*editor[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*ck[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    
    // ID-based selectors
    /<div[^>]+id=["']content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["']article[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["']post[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["']news[-_]?content["'][^>]*>([\s\S]*?)<\/div>/i,
    
    // Description/summary patterns
    /<div[^>]+class=["'][^"']*description["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*summary["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*intro["'][^>]*>([\s\S]*?)<\/div>/i,
    
    // Article and section tags
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<section[^>]+class=["'][^"']*content["'][^>]*>([\s\S]*?)<\/section>/i,
    /<section[^>]+class=["'][^"']*article["'][^>]*>([\s\S]*?)<\/section>/i,
    
    // Main tag
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];
  
  for (const pattern of contentPatterns) {
    const match = html.match(pattern);
    if (match) {
      const matchContent = match[match.length - 1]; // Get last capture group
      if (matchContent && matchContent.length > 100) {
        content = matchContent;
        break;
      }
    }
  }
  
  // If no specific content found, try broader patterns
  if (!content) {
    const contentDivMatch = html.match(/<div[^>]+class=["'][^"']*(?:content|article|post|entry|news|detail|text|body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (contentDivMatch && contentDivMatch[1].length > 100) {
      content = contentDivMatch[1];
    }
  }
  
  // Try to find substantial paragraph content
  if (!content || content.length < 100) {
    const paragraphs: string[] = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = pRegex.exec(html)) !== null) {
      const pText = match[1].replace(/<[^>]+>/g, '').trim();
      if (pText.length > 30) { // Lowered threshold
        paragraphs.push(match[0]);
      }
    }
    if (paragraphs.length > 0) {
      content = paragraphs.join('\n');
    }
  }
  
  // Last resort: get body content
  if (!content || content.length < 50) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    content = bodyMatch ? bodyMatch[1] : html;
  }
  
  // Remove unwanted elements
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  content = content.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  content = content.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '');
  content = content.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  content = content.replace(/<!--[\s\S]*?-->/gi, '');
  content = content.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Remove social media widgets, share buttons, breadcrumbs, menus
  content = content.replace(/<div[^>]+class=["'][^"']*(?:share|social|breadcrumb|sidebar|widget|comment|menu|nav|footer|header|related|similar|tag|category|author|meta|pagination)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
  content = content.replace(/<ul[^>]+class=["'][^"']*(?:menu|nav|breadcrumb|tag|social)[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi, '');
  
  // Remove data URIs (base64 images)
  content = content.replace(/src=["']data:image[^"']+["']/gi, 'src=""');
  
  // Extract plain text
  const text = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    html: content.trim(),
    text: decodeHtmlEntities(text)
  };
}

// Extract published date - improved with more patterns
export function extractPublishedDate(html: string): string | null {
  // Try various date meta tags
  const datePatterns = [
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']DC\.date["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']pubdate["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']publish[-_]?date["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:updated_time["'][^>]+content=["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["'][^>]*>/i,
    /<time[^>]+content=["']([^"']+)["'][^>]*>/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        // Invalid date
      }
    }
  }
  
  // Try to find date in text using common patterns
  const textDatePatterns = [
    /(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})/,  // DD.MM.YYYY or DD/MM/YYYY
    /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/,  // YYYY-MM-DD
    /(\d{1,2})\s+(yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr)\s+(\d{4})/i,  // Uzbek month names
    /(\d{1,2})\s+(январ[яь]|феврал[яь]|марта?|апрел[яь]|ма[йя]|июн[яь]|июл[яь]|августа?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь])\s+(\d{4})/i,  // Russian month names
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,  // English month names
  ];
  
  for (const pattern of textDatePatterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        // Invalid date
      }
    }
  }
  
  return null;
}

// Detect language
export function detectLanguage(html: string, text: string): string {
  // Check html lang attribute
  const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  if (langMatch) {
    const lang = langMatch[1].toLowerCase().split('-')[0];
    if (['uz', 'ru', 'en'].includes(lang)) {
      return lang;
    }
  }
  
  // Simple heuristic based on character frequency
  const cyrillicCount = (text.match(/[а-яА-ЯёЁ]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  const uzbekSpecific = (text.match(/[ўқғҳ]/g) || []).length; // Uzbek Cyrillic specific
  
  if (uzbekSpecific > 5) {
    return 'uz'; // Uzbek in Cyrillic
  }
  
  if (cyrillicCount > latinCount * 2) {
    return 'ru';
  }
  
  // Check for Uzbek Latin specific characters
  const uzbekLatin = (text.match(/[oʻgʻ]/gi) || []).length;
  if (uzbekLatin > 3 || text.match(/o'|g'/gi)) {
    return 'uz';
  }
  
  if (latinCount > cyrillicCount) {
    return 'en';
  }
  
  return 'unknown';
}

// Create hash fingerprint for deduplication
export function createHashFingerprint(title: string, date: string | null, contentText: string): string {
  const normalized = `${title.toLowerCase().trim()}|${date || ''}|${contentText.slice(0, 200).toLowerCase().trim()}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Create slug from title
export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

// Generate language variants of a URL
export function generateLanguageVariants(url: string): string[] {
  const variants: string[] = [url];
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Common language path patterns
    const langPatterns = [
      { from: /^\/uz\//i, to: ['/ru/', '/en/'] },
      { from: /^\/ru\//i, to: ['/uz/', '/en/'] },
      { from: /^\/en\//i, to: ['/uz/', '/ru/'] },
      { from: /^\/oz\//i, to: ['/ru/', '/en/'] }, // Some sites use 'oz' for Uzbek
      { from: /^\/(uz|ru|en|oz)-/i, to: null }, // uz-news, ru-news patterns
    ];
    
    for (const pattern of langPatterns) {
      if (pattern.from.test(pathname) && pattern.to) {
        for (const replacement of pattern.to) {
          const newPath = pathname.replace(pattern.from, replacement);
          urlObj.pathname = newPath;
          variants.push(urlObj.href);
        }
        break;
      }
    }
    
    // If no language prefix found, try adding language prefixes
    if (variants.length === 1) {
      const langPrefixes = ['/uz', '/ru', '/en'];
      for (const prefix of langPrefixes) {
        // Check if path doesn't already start with a lang prefix
        if (!pathname.match(/^\/(uz|ru|en|oz)\//i)) {
          urlObj.pathname = prefix + pathname;
          variants.push(urlObj.href);
        }
      }
    }
    
    // Also try query parameter variants
    const langParams = ['lang', 'language', 'l', 'locale'];
    const languages = ['uz', 'ru', 'en'];
    
    for (const param of langParams) {
      if (urlObj.searchParams.has(param)) {
        for (const lang of languages) {
          const newUrl = new URL(url);
          newUrl.searchParams.set(param, lang);
          if (newUrl.href !== url) {
            variants.push(newUrl.href);
          }
        }
        break;
      }
    }
  } catch {
    // Invalid URL, return original only
  }
  
  return [...new Set(variants)];
}

// Extract language switcher links from HTML
export function extractLanguageSwitcherLinks(html: string, baseUrl: string): Map<string, string> {
  const langLinks = new Map<string, string>();
  
  // Common patterns for language switchers
  const langSwitcherPatterns = [
    // Links with hreflang attribute
    /<a[^>]+hreflang=["'](uz|ru|en|oz)["'][^>]+href=["']([^"']+)["']/gi,
    // Links with lang/language class or data attribute
    /<a[^>]+(?:class|data-lang|data-language)=["'][^"']*(?:uz|ru|en|ozb?|uzb?)["'][^>]+href=["']([^"']+)["']/gi,
    // Links to /uz/, /ru/, /en/ paths
    /<a[^>]+href=["']([^"']*\/(uz|ru|en|oz)\/[^"']*)["']/gi,
    // Links with language text
    /<a[^>]+href=["']([^"']+)["'][^>]*>(?:\s*<[^>]+>)*\s*(?:O['']?zbek|Ўзбек|Русский|English|Рус|Узб|Eng|UZ|RU|EN)\s*(?:<\/[^>]+>)*\s*<\/a>/gi,
  ];
  
  for (const pattern of langSwitcherPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      try {
        // Extract language and URL based on pattern structure
        let lang: string;
        let href: string;
        
        if (match.length >= 3) {
          lang = match[1].toLowerCase();
          href = match[2];
        } else {
          href = match[1];
          // Detect language from URL
          if (/\/(uz|ozb?)(?:\/|$)/i.test(href)) lang = 'uz';
          else if (/\/ru(?:\/|$)/i.test(href)) lang = 'ru';
          else if (/\/en(?:\/|$)/i.test(href)) lang = 'en';
          else continue;
        }
        
        // Normalize language code
        if (lang === 'oz' || lang === 'ozb' || lang === 'uzb') lang = 'uz';
        
        const absoluteUrl = new URL(href, baseUrl).href;
        if (!langLinks.has(lang)) {
          langLinks.set(lang, absoluteUrl);
        }
      } catch {
        // Invalid URL
      }
    }
  }
  
  return langLinks;
}

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

// Parse a single news post page
export function parseNewsPost(html: string, sourceUrl: string): ExtractedPost {
  const title = extractTitle(html);
  const description = extractDescription(html);
  const { html: contentHtml, text: contentText } = extractArticleContent(html);
  const publishedAt = extractPublishedDate(html);
  const canonicalUrl = extractCanonicalUrl(html);
  const coverImageUrl = extractCoverImage(html, sourceUrl);
  const images = extractImages(contentHtml, sourceUrl);
  const videos = extractVideos(html);
  const language = detectLanguage(html, contentText);
  
  return {
    title,
    summary: description || (contentText.length > 200 ? contentText.substring(0, 200) + '...' : contentText),
    contentHtml,
    contentText,
    publishedAt,
    sourceUrl,
    canonicalUrl,
    language,
    coverImageUrl,
    images: coverImageUrl ? [coverImageUrl, ...images.filter(img => img !== coverImageUrl)] : images,
    videos,
  };
}
